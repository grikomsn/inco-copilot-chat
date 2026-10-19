import type { ModelCost } from "../models/pricing";

export interface ProviderUsagePayload {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: { cached_tokens: number };
  completion_tokens_details?: { reasoning_tokens: number };
}
export interface RequestUsage {
  readonly modelId: string;
  readonly recordedAt: number;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
  readonly cachedTokens?: number;
  readonly reasoningTokens?: number;
  readonly cost?: number;
}
export interface TrackedUsage {
  readonly requests: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly cachedTokens: number;
  readonly reasoningTokens: number;
  readonly cost: number;
}
export interface IncoUsageSnapshot {
  readonly lastRequest?: RequestUsage;
  readonly tracked?: TrackedUsage;
  readonly updatedAt?: number;
  readonly error?: string;
}
export interface UsageDisplayRow {
  readonly kind: "tracked" | "request" | "warning" | "empty";
  readonly label: string;
  readonly description: string;
  readonly detail?: string;
}

export function toProviderUsagePayload(raw: Record<string, unknown>): ProviderUsagePayload {
  const prompt = count(raw.prompt_tokens ?? raw.input_tokens);
  const completion = count(raw.completion_tokens ?? raw.output_tokens);
  const cached = count(record(raw.prompt_tokens_details)?.cached_tokens);
  const reasoning = count(record(raw.completion_tokens_details)?.reasoning_tokens);
  const total = count(raw.total_tokens) ?? (prompt !== undefined && completion !== undefined ? prompt + completion : undefined);
  return {
    ...(prompt === undefined ? {} : { prompt_tokens: prompt }),
    ...(completion === undefined ? {} : { completion_tokens: completion }),
    ...(total === undefined ? {} : { total_tokens: total }),
    ...(cached === undefined ? {} : { prompt_tokens_details: { cached_tokens: cached } }),
    ...(reasoning === undefined ? {} : { completion_tokens_details: { reasoning_tokens: reasoning } }),
  };
}

export function recordRequestUsage(
  current: IncoUsageSnapshot,
  raw: Record<string, unknown>,
  modelId: string,
  recordedAt = Date.now(),
  prices?: ModelCost,
): IncoUsageSnapshot {
  const usage = toProviderUsagePayload(raw);
  const prompt = usage.prompt_tokens;
  const completion = usage.completion_tokens;
  const cached = Math.min(usage.prompt_tokens_details?.cached_tokens ?? 0, prompt ?? 0);
  const cost = prices && prompt !== undefined && completion !== undefined
    ? ((prompt - cached) * prices.input + cached * (prices.cacheRead ?? prices.input) + completion * prices.output) / 1_000_000
    : undefined;
  const lastRequest: RequestUsage = {
    modelId, recordedAt,
    promptTokens: prompt, completionTokens: completion, totalTokens: usage.total_tokens,
    cachedTokens: cached, reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
    ...(cost === undefined ? {} : { cost }),
  };
  const prior = current.tracked;
  return {
    lastRequest, updatedAt: recordedAt,
    tracked: {
      requests: (prior?.requests ?? 0) + 1,
      promptTokens: (prior?.promptTokens ?? 0) + (prompt ?? 0),
      completionTokens: (prior?.completionTokens ?? 0) + (completion ?? 0),
      totalTokens: (prior?.totalTokens ?? 0) + (usage.total_tokens ?? 0),
      cachedTokens: (prior?.cachedTokens ?? 0) + cached,
      reasoningTokens: (prior?.reasoningTokens ?? 0) + (lastRequest.reasoningTokens ?? 0),
      cost: (prior?.cost ?? 0) + (cost ?? 0),
    },
  };
}

export function formatUsageStatusBar(snapshot: IncoUsageSnapshot): string {
  return snapshot.tracked ? `$(graph) Inco ${snapshot.tracked.totalTokens.toLocaleString()} tokens` : "$(cloud) Inco";
}

export function formatUsageTooltip(snapshot: IncoUsageSnapshot): string {
  const usage = snapshot.tracked;
  return ["Inco API activity tracked on this device",
    ...(usage ? [`${usage.totalTokens.toLocaleString()} tokens across ${usage.requests} requests`,
      `Estimated spend: $${usage.cost.toFixed(6)}`] : []),
    "Estimates use catalog prices. The Inco dashboard is authoritative.", "Click for details"].join("\n");
}

export function formatUsageRows(snapshot: IncoUsageSnapshot): UsageDisplayRow[] {
  const usage = snapshot.tracked;
  if (!usage) return [{ kind: "empty", label: "No local usage yet", description: "Send a request using an Inco model" }];
  return [{ kind: "tracked", label: "Tracked on this device",
    description: `${usage.totalTokens.toLocaleString()} tokens · ${usage.requests} requests`,
    detail: `${usage.promptTokens} input · ${usage.completionTokens} output · $${usage.cost.toFixed(6)} estimated; dashboard is authoritative` },
    ...(snapshot.lastRequest ? [{ kind: "request" as const, label: "Last inference",
      description: snapshot.lastRequest.modelId, detail: new Date(snapshot.lastRequest.recordedAt).toLocaleString() }] : [])];
}

function count(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;
}
function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}
