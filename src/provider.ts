import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { ChatCompletionStreamParser } from "./kit/chat-completions";
import { contextSizeOptions, resolveContextCap, resolveContextSize } from "./kit/context-size";
import { apiKeyFromConfiguration, credentialReference, Credentials } from "./kit/credentials";
import { httpError, isRejectedCredential, messageOf, withContextOverflowHint } from "./kit/errors";
import { modelPricingFields } from "./kit/pricing";
import { ChatEventReporter, ResponseWriter } from "./kit/response-writer";
import { fetchWithRetry, serverErrorStatuses } from "./kit/retry";
import { readTextStream, RequestDeadline } from "./kit/stream";
import { estimateChatTokens } from "./kit/token-count";
import { stringifyWellFormedJson } from "./kit/unicode";
import {
  advertisedModelLimits,
  FALLBACK_MODEL_METADATA,
  formatTokenLimit,
  formatModelName,
  modelCatalogFromApi,
  type IncoModelMetadata,
} from "./models/catalog";
import {
  DEFAULT_REASONING_EFFORT,
  applyReasoningEffort,
  buildModelConfigurationSchema,
  modelEffortSpec,
  resolveReasoningEffort,
  type ModelEffortSpec,
  type ReasoningEffort,
} from "./models/options";
import { parseCatalogSnapshots } from "./models/cache";
import { INCO_ENDPOINTS, incoHeaders } from "./transport/protocol";
import { modelFamily } from "./models/family";
import { buildRequest } from "./provider/request";
import { recordRequestUsage, toProviderUsagePayload, type IncoUsageSnapshot } from "./usage/domain";
import { filterByServing } from "./models/privacy";

export { API_BASE } from "./transport/protocol";

export interface IncoModel extends vscode.LanguageModelChatInformation {
  rawModelId: string;
  /** The model's supported reasoning efforts; undefined when it has no reasoning control. */
  effortSpec?: ModelEffortSpec;
  /** Fingerprint of the provisioned API key that serves this model. */
  credentialRef: string;
}

export class IncoProvider implements vscode.LanguageModelChatProvider<IncoModel> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  private readonly usageEmitter = new vscode.EventEmitter<IncoUsageSnapshot>();
  readonly onDidChangeLanguageModelChatInformation = this.changeEmitter.event;
  /** Fires with the full usage snapshot whenever the usage changes. */
  readonly onDidChangeUsage = this.usageEmitter.event;
  private readonly catalogs = new Map<string, IncoModelMetadata[]>();
  private readonly refreshedAt = new Map<string, number>();
  private readonly credentials = new Credentials();
  /** Credential refs whose key the service refused; they list no models. */
  private readonly rejectedKeys = new Set<string>();
  private readonly usageByCredential = new Map<string, IncoUsageSnapshot>();
  private stateMutation: Promise<void> = Promise.resolve();

  private get configuration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("incoCopilot");
  }

  private get debugLogging(): boolean {
    return this.configuration.get("debugLogging", false);
  }

  constructor(
    private readonly output: vscode.OutputChannel,
    private readonly userAgent: string,
    private readonly state?: vscode.Memento,
    initialUsage: Readonly<Record<string, IncoUsageSnapshot>> = {},
    private readonly fetcher: typeof fetch = fetch,
  ) {
    // Only entry-scoped inference activity and public model metadata are persisted.
    for (const [ref, usage] of Object.entries(initialUsage)) this.usageByCredential.set(ref, usage);
    for (const [key, catalog] of Object.entries(parseCatalogSnapshots(state?.get<unknown>(CATALOG_STATE_KEY))))
      this.catalogs.set(key, catalog);
  }

  fireDidChange(): void {
    this.changeEmitter.fire();
    this.usageEmitter.fire(this.getSelectedUsageSnapshot());
  }

  /** Returns the current usage snapshot without side effects. @see {@link refreshUsage} */
  getUsageSnapshot(credentialRef = this.activeCredentialRef() ?? ""): IncoUsageSnapshot {
    return this.usageByCredential.get(credentialRef) ?? {};
  }

  getSelectedUsageSnapshot(): IncoUsageSnapshot {
    return this.getUsageSnapshot();
  }

  getFeatureApiKey(): string | undefined {
    return this.credentials.activeApiKey();
  }

  /** Prunes catalogs whose key is no longer provisioned by any native entry. */
  private pruneCatalogs(): void {
    for (const reference of this.catalogs.keys()) {
      if (this.credentials.keyForCredential(reference)) continue;
      this.catalogs.delete(reference);
      this.refreshedAt.delete(reference);
      this.rejectedKeys.delete(reference);
    }
  }

  private activeCredentialRef(): string | undefined {
    const apiKey = this.getFeatureApiKey();
    return apiKey ? credentialReference(apiKey) : undefined;
  }

  /** Resets locally tracked usage for the active entry. */
  clearUsage(): void {
    const credentialRef = this.activeCredentialRef();
    if (!credentialRef) return;
    this.setAndEmitUsage({}, credentialRef);
  }

  async refreshModels(): Promise<string[]> {
    const apiKey = this.getFeatureApiKey();
    if (!apiKey) throw new Error("Provision an Inco entry in Manage Language Models first.");
    const models = await this.refreshCatalog(credentialReference(apiKey), apiKey);
    this.changeEmitter.fire();
    return this.visibleCatalog(models).map(({ id }) => id);
  }

  async provideLanguageModelChatInformation(
    options: vscode.PrepareLanguageModelChatModelOptions,
    token: vscode.CancellationToken,
  ): Promise<IncoModel[]> {
    if (token.isCancellationRequested || !options.configuration) return [];
    let apiKey: string | undefined;
    try {
      apiKey = apiKeyFromConfiguration(options.configuration);
      if (!apiKey) throw new Error("Set a valid Inco API key in Manage Language Models");
    } catch (error) {
      const message = messageOf(error);
      this.output.appendLine(`[models] ${message}`);
      if (!options.silent) void vscode.window.showErrorMessage(message);
      return [];
    }
    const credentialRef = this.credentials.register(apiKey);
    this.pruneCatalogs();
    const maxAge = Math.max(1, this.configuration.get("catalogCacheMinutes", 5)) * 60_000;
    if (Date.now() - (this.refreshedAt.get(credentialRef) ?? 0) > maxAge) {
      try {
        await this.refreshCatalog(credentialRef, apiKey, token);
      } catch (error) {
        if (isRejectedCredential(error)) {
          // A refused key would fail every request; retry after the cache
          // window rather than on every model-picker query.
          this.refreshedAt.set(credentialRef, Date.now());
          this.warnRejectedKey(credentialRef, error);
        } else if (!token.isCancellationRequested) {
          this.output.appendLine(`[models] discovery failed; using cached/fallback list: ${messageOf(error)}`);
        }
      }
    }

    if (token.isCancellationRequested || !this.credentials.has(credentialRef)) return [];
    // Every request with a refused key would fail, so list nothing at all.
    if (this.rejectedKeys.has(credentialRef)) return [];
    this.usageEmitter.fire(this.getSelectedUsageSnapshot());
    const workspaceDefault = this.configuration.get("reasoningEffort", DEFAULT_REASONING_EFFORT);
    return this.visibleCatalog(this.catalogFor(credentialRef)).map((metadata) => {
      const pricing = modelPricingFields(metadata.cost);
      const limits = advertisedModelLimits(metadata, this.configuration.get("maxOutputTokens", 0));
      const effortSpec = modelEffortSpec(metadata.reasoningEfforts, metadata.defaultReasoningEffort);
      // The picker's default selection prefers the workspace default when the
      // model supports it, else the model's own default.
      const pickerDefault = effortSpec && (effortSpec.efforts as readonly string[]).includes(workspaceDefault)
        ? workspaceDefault as ReasoningEffort
        : effortSpec?.defaultEffort;
      const pickerSpec = effortSpec && pickerDefault
        ? { efforts: effortSpec.efforts, defaultEffort: pickerDefault }
        : undefined;
      const contextOptions = contextSizeOptions(limits.maxInputTokens);
      const configurationSchema = pickerSpec || contextOptions
        ? buildModelConfigurationSchema(pickerSpec, contextOptions)
        : undefined;
      return {
        id: metadata.id,
        rawModelId: metadata.id,
        credentialRef,
        effortSpec,
        name: metadata.name || formatModelName(metadata.id),
        family: modelFamily(metadata.id),
        version: metadata.version,
        detail: "Inco",
        tooltip: `${metadata.id} via Inco · ${metadata.serving === "inco" ? "Inco-served; dashboard data settings apply" : metadata.serving === "relayed" ? "Relayed to a third-party provider" : "Operator unclassified"} · ${formatTokenLimit(metadata.contextLength)} context · ${formatTokenLimit(
          metadata.maxOutputTokens,
        )} max output${metadata.imageInput ? " · image input" : " · text input"}${
          metadata.releaseDate ? ` · released ${metadata.releaseDate}` : ""
        }${pricing ? ` · ${pricing.pricing}` : ""}${metadata.description ? `\n${metadata.description}` : ""}`,
        ...limits,
        isUserSelectable: true,
        isBYOK: true,
        ...(configurationSchema ? { configurationSchema } : {}),
        capabilities: {
          imageInput: metadata.imageInput,
          toolCalling: metadata.toolCalling,
        },
        ...(pricing ?? {}),
      };
    });
  }

  async provideLanguageModelChatResponse(
    model: IncoModel,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart2>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    if (token.isCancellationRequested) return;
    if (!this.visibleCatalog(this.catalogFor(model.credentialRef)).some((entry) => entry.id === model.rawModelId)) {
      throw new Error("This model is hidden by the Inco-served-only filter. Reselect an allowed model or change incoCopilot.incoServedOnly.");
    }
    const apiKey = this.credentials.keyForCredential(model.credentialRef);
    if (!apiKey) {
      throw new Error("This entry's API key was replaced or removed. Reselect its model in Manage Language Models.");
    }
    if (options.tools?.length && model.capabilities?.toolCalling === false) {
      throw new Error("This Inco route has no verified function-tool support. Use chat without tools or select a tool-capable model.");
    }
    const reasoningEffort = resolveReasoningEffort(
      model.effortSpec,
      options.modelConfiguration,
      this.configuration.get("reasoningEffort", DEFAULT_REASONING_EFFORT),
    );
    const requestBody = buildRequest(
      model.rawModelId,
      messages,
      options,
      reasoningEffort,
      model.maxOutputTokens,
      this.configuration.get("maxOutputTokens", 0),
      Boolean(model.capabilities?.imageInput),
      resolveContextCap(resolveContextSize(options.modelConfiguration), model.maxInputTokens),
    );
    const reporter = new ChatEventReporter(new ResponseWriter(progress, vscode, "inco", randomUUID()), {
      label: "Inco",
      toUsagePayload: toProviderUsagePayload,
      onUsage: (usage) => this.captureRequestUsage(usage, model.rawModelId, model.credentialRef),
    });
    const timeoutSeconds = Math.max(10, this.configuration.get("requestTimeoutSeconds", 600));
    const idleTimeoutSeconds = Math.max(10, this.configuration.get("streamIdleTimeoutSeconds", 120));
    const deadline = new RequestDeadline({ totalMs: timeoutSeconds * 1000, idleMs: idleTimeoutSeconds * 1000, cancellation: token });
    try {
      if (this.debugLogging) {
        this.output.appendLine(
          `[request] model=${model.rawModelId} effort=${reasoningEffort} initiator=${
            options.requestInitiator ?? "unknown"
          }`,
        );
      }
      const response = await this.fetchInference({
        method: "POST",
        headers: this.requestHeaders(apiKey, "text/event-stream"),
        body: stringifyWellFormedJson(requestBody),
        signal: deadline.signal,
      });
      if (!response.ok) throw await httpError(`Inco request failed for ${model.rawModelId}`, response);
      if (!response.body) throw new Error("Inco returned an empty response stream");

      const parser = new ChatCompletionStreamParser({ label: "Inco" });
      const completed = await readTextStream(response.body, (text) => {
        // The final streamed chunk carries `usage`; the reporter captures it
        // so the status bar reflects the request immediately.
        for (const event of parser.push(text)) reporter.report(event);
      }, { deadline, isCancelled: () => token.isCancellationRequested });
      if (!completed) return;
      for (const event of parser.finish()) reporter.report(event);
      parser.validateCompletion(requestBody.tool_choice === "required");
    } catch (error) {
      if (token.isCancellationRequested) return;
      throw deadline.timeoutError(`Inco request for ${model.rawModelId}`) ?? withContextOverflowHint(error);
    } finally {
      reporter.finish();
      deadline.dispose();
    }
  }

  async provideTokenCount(
    _model: IncoModel,
    value: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken,
  ): Promise<number> {
    return estimateChatTokens(value);
  }

  async testConnection(): Promise<{
    model: string;
    reasoningEffort?: ReasoningEffort;
    text: string;
  }> {
    const apiKey = this.getFeatureApiKey();
    if (!apiKey) throw new Error("Provision an Inco entry in Manage Language Models first.");
    const credentialRef = credentialReference(apiKey);
    const models = this.visibleCatalog(this.catalogFor(credentialRef));
    const model = models[0]?.id;
    if (!model) throw new Error("No Inco models match this entry's catalog and routing filter.");
    const effortSpec = modelEffortSpec(models[0]?.reasoningEfforts, models[0]?.defaultReasoningEffort);
    const reasoningEffort = resolveReasoningEffort(
      effortSpec,
      undefined,
      this.configuration.get("reasoningEffort", DEFAULT_REASONING_EFFORT),
    );
    const requestBody = {
      model,
      messages: [
        {
          role: "user",
          content: "Reply with exactly: Inco connection verified",
        },
      ],
      max_completion_tokens: 2048,
      stream: false,
    };
    const response = await this.fetchInference({
      method: "POST",
      headers: this.requestHeaders(apiKey, "application/json"),
      body: JSON.stringify(applyReasoningEffort(requestBody, reasoningEffort)),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw await httpError("Inco connection test failed", response);
    const responseBody = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: Record<string, unknown>;
    };
    if (responseBody.usage) this.captureRequestUsage(responseBody.usage, model, credentialRef);
    const text = responseBody.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Inco connection test returned no answer. Retry with a larger output budget or another model.");
    return {
      model,
      ...(reasoningEffort ? { reasoningEffort } : {}),
      text,
    };
  }

  /** Reasoning efforts a model accepts, from the active catalog with fallback metadata. */
  reasoningEffortsFor(modelId: string): readonly ReasoningEffort[] | undefined {
    const canonical = modelId.trim().toLowerCase();
    const credentialRef = this.activeCredentialRef();
    if (!credentialRef) return undefined;
    const live = this.catalogFor(credentialRef).find((metadata) => metadata.id === canonical);
    return live?.reasoningEfforts;
  }

  private async fetchModels(apiKey: string, signal?: AbortSignal): Promise<IncoModelMetadata[]> {
    if (!apiKey) throw new Error("Inco API key is not configured");
    const response = await this.fetcher(INCO_ENDPOINTS.models, {
      headers: this.requestHeaders(apiKey, "application/json, application/problem+json"),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw await httpError("Unable to list Inco models", response);
    const body: unknown = await response.json();
    const models = modelCatalogFromApi(body);
    if (this.debugLogging) this.output.appendLine(`[models] ${models.map(({ id }) => id).join(", ")}`);
    return models;
  }

  private catalogFor(credentialRef: string): IncoModelMetadata[] {
    let catalog = this.catalogs.get(credentialRef);
    if (!catalog) {
      catalog = [...FALLBACK_MODEL_METADATA];
      this.catalogs.set(credentialRef, catalog);
    }
    return catalog;
  }

  private visibleCatalog(models: readonly IncoModelMetadata[]): IncoModelMetadata[] {
    return filterByServing(models, this.configuration.get("incoServedOnly", false));
  }

  private setCatalog(credentialRef: string, models: readonly IncoModelMetadata[]): void {
    this.catalogs.set(credentialRef, [...models]);
    this.refreshedAt.set(credentialRef, Date.now());
    this.rejectedKeys.delete(credentialRef);
    void this.persistOwnedState();
  }

  private async refreshCatalog(
    credentialRef: string,
    apiKey: string,
    token?: vscode.CancellationToken,
  ): Promise<IncoModelMetadata[]> {
    if (token?.isCancellationRequested) return this.catalogFor(credentialRef);
    const controller = new AbortController();
    const cancellation = token?.onCancellationRequested(() => controller.abort());
    try {
      const models = await this.fetchModels(apiKey, controller.signal);
      if (!token?.isCancellationRequested && this.credentials.has(credentialRef)) this.setCatalog(credentialRef, models);
      return models;
    } finally { cancellation?.dispose(); }
  }

  private warnRejectedKey(credentialRef: string, error: unknown): void {
    if (this.rejectedKeys.has(credentialRef)) return;
    this.rejectedKeys.add(credentialRef);
    this.output.appendLine(`[models] Inco rejected the API key; listing no models: ${messageOf(error)}`);
    void vscode.window.showWarningMessage(
      "Inco rejected this entry's API key. Update its key in Manage Language Models.",
    );
  }

  private requestHeaders(apiKey: string, accept: string): Record<string, string> {
    return incoHeaders(apiKey, accept, this.userAgent);
  }

  private fetchInference(init: RequestInit): Promise<Response> {
    return fetchWithRetry(() => this.fetcher(INCO_ENDPOINTS.chat, init), {
      isTransientStatus: serverErrorStatuses,
      signal: init.signal,
      log: (message) => this.output.appendLine(message),
    });
  }

  /**
   * Records one inference request's usage into the snapshot and emits it.
   *
   * @see {@link recordRequestUsage}, {@link setAndEmitUsage}
   */
  private captureRequestUsage(raw: Record<string, unknown>, modelId: string, credentialRef: string): void {
    if (!this.credentials.has(credentialRef)) return;
    const metadata = this.catalogFor(credentialRef).find((model) => model.id === modelId);
    const next = recordRequestUsage(this.getUsageSnapshot(credentialRef), raw, modelId, Date.now(), metadata?.cost);
    if (this.debugLogging) this.output.appendLine(`[usage] model=${modelId} recorded`);
    this.setAndEmitUsage(next, credentialRef);
  }

  private setAndEmitUsage(usage: IncoUsageSnapshot, credentialRef: string): void {
    if (!this.credentials.has(credentialRef)) return;
    this.usageByCredential.set(credentialRef, usage);
    void this.persistOwnedState();
    if (credentialRef === this.activeCredentialRef()) this.usageEmitter.fire(usage);
  }

  private persistOwnedState(): Promise<void> {
    this.stateMutation = this.stateMutation.catch(() => undefined).then(async () => {
      if (!this.state) return;
      await this.state.update(CATALOG_STATE_KEY, Object.fromEntries(this.catalogs));
      const activity = Object.fromEntries([...this.usageByCredential].map(([ref, snapshot]) => [ref, {
        tracked: snapshot.tracked, lastRequest: snapshot.lastRequest,
      }]));
      await this.state.update(USAGE_STATE_KEY, activity);
    }).catch(() => { this.output.appendLine("[state] unable to persist entry cache"); });
    return this.stateMutation;
  }
}

const CATALOG_STATE_KEY = "incoCopilot.entryCatalogs.v2";
const USAGE_STATE_KEY = "incoCopilot.entryUsage.v1";

