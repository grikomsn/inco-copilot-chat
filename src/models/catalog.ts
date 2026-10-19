import { modelCostFromApi, type ModelCost } from "./pricing";
import type { ReasoningEffort } from "./options";
import snapshot from "./snapshot.json";
import { modelServing, type ModelServing } from "./privacy";

export const DEFAULT_MAX_INPUT_TOKENS = 131_072;
// Inco does not advertise output limits; reserve a conservative request budget.
export const DEFAULT_MAX_OUTPUT_TOKENS = 16_384;

export interface IncoModelMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly contextLength: number;
  readonly maxOutputTokens: number;
  readonly imageInput: boolean;
  readonly toolCalling: boolean;
  readonly serving?: ModelServing;
  readonly reasoningEfforts?: readonly ReasoningEffort[];
  readonly defaultReasoningEffort?: ReasoningEffort;
  readonly description?: string;
  readonly releaseDate?: string;
  readonly cost?: ModelCost;
}

export const FALLBACK_MODEL_METADATA: readonly IncoModelMetadata[] = modelCatalogFromApi(snapshot);
export const FALLBACK_MODELS: readonly string[] = FALLBACK_MODEL_METADATA.map(({ id }) => id);

export function isIncoChatModel(id: string): boolean {
  return Boolean(id.trim()) && !/(?:^|[-/])(embed(?:ding)?s?|image|video|audio|voice|rerank)(?:[-/.]|$)/i.test(id);
}

export function orderModels(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(isIncoChatModel))].sort((a, b) => a.localeCompare(b));
}

export function modelCatalogFromApi(payload: unknown): IncoModelMetadata[] {
  const body = record(payload);
  if (!Array.isArray(body?.data)) throw new Error("Inco returned an invalid model catalog");
  const models = new Map<string, IncoModelMetadata>();
  for (const raw of body.data) {
    const entry = record(raw);
    if (typeof entry?.id !== "string" || !isIncoChatModel(entry.id)) continue;
    const id = entry.id.trim();
    const capabilities = record(entry.capabilities);
    const modalities = record(entry.modalities);
    const contextLength = positive(entry.context_length) ?? DEFAULT_MAX_INPUT_TOKENS;
    const maxOutputTokens = Math.min(positive(entry.max_output_tokens ?? entry.max_completion_tokens)
      ?? DEFAULT_MAX_OUTPUT_TOKENS, contextLength - 1);
    // The boolean says effort is supported, but does not enumerate allowed values.
    // Known model families use their documented effort lists; unknown ones omit control.
    const efforts = capabilities?.reasoning_effort === false ? undefined : reasoningEfforts(id, entry.reasoning_efforts);
    const cost = modelCostFromApi(entry.pricing);
    models.set(id, {
      id,
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name : formatModelName(id),
      version: id,
      contextLength,
      maxOutputTokens,
      imageInput: Array.isArray(modalities?.input) && modalities.input.includes("image"),
      toolCalling: typeof capabilities?.tool_calling === "boolean" ? capabilities.tool_calling : true,
      serving: modelServing(id, entry.operator),
      ...(efforts ? { reasoningEfforts: efforts, defaultReasoningEffort: efforts.includes("high") ? "high" : efforts[0] } : {}),
      ...(cost ? { cost } : {}),
      ...(typeof entry.description === "string" && entry.description ? { description: entry.description } : {}),
      ...(typeof entry.created === "number" && Number.isFinite(entry.created)
        ? { releaseDate: new Date(entry.created * 1000).toISOString().slice(0, 10) } : {}),
    });
  }
  return orderModels([...models.keys()]).map((id) => models.get(id)!);
}

function reasoningEfforts(id: string, advertised: unknown): readonly ReasoningEffort[] | undefined {
  const valid = ["none", "low", "medium", "high", "xhigh", "max"] as const;
  if (Array.isArray(advertised)) {
    const efforts = advertised.filter((entry): entry is ReasoningEffort => valid.includes(entry));
    return efforts.length ? [...new Set(efforts)] : undefined;
  }
  if (/^(kimi-k3|glm-5\.3)/.test(id)) return ["low", "high", "max"];
  if (id.startsWith("deepseek-v4")) return ["none", "high", "max"];
  // MiniMax's default thinking is preserved unless the API enumerates efforts.
  return undefined;
}

export function getModelMetadata(id: string): IncoModelMetadata {
  return FALLBACK_MODEL_METADATA.find((model) => model.id === id)
    ?? modelCatalogFromApi({ data: [{ id }] })[0]!;
}

export function resolveMaxOutputTokens(configured: number, advertised: number): number {
  return Number.isFinite(configured) && configured > 0 ? Math.min(Math.floor(configured), advertised) : advertised;
}

export function advertisedModelLimits(model: IncoModelMetadata, configured: number): { maxInputTokens: number; maxOutputTokens: number } {
  const maxOutputTokens = Math.min(resolveMaxOutputTokens(configured, model.maxOutputTokens), model.contextLength - 1);
  return { maxInputTokens: Math.max(1, model.contextLength - maxOutputTokens), maxOutputTokens };
}

export function formatTokenLimit(tokens: number): string {
  return tokens >= 1_000_000 ? `${Math.round(tokens / 100_000) / 10}M` : `${Math.round(tokens / 1024)}K`;
}

export function formatModelName(id: string): string {
  return id.split(/[-:]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 2 ? Math.floor(value) : undefined;
}
