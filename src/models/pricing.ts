import type { ModelCost } from "../kit/pricing";

export type { ModelCost } from "../kit/pricing";

/** Live catalog prices are already USD per million tokens. */
export function modelCostFromApi(value: unknown): ModelCost | undefined {
  const pricing = record(value);
  if (!pricing) return undefined;
  const input = nonNegativeNumber(pricing.prompt ?? pricing.input_per_1m ?? pricing.input);
  const output = nonNegativeNumber(pricing.completion ?? pricing.output_per_1m ?? pricing.output);
  if (input === undefined || output === undefined) return undefined;
  const cacheRead = nonNegativeNumber(pricing.cached_input);
  return {
    input,
    output,
    ...(cacheRead === undefined ? {} : { cacheRead }),
  };
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}
