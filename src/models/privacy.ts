/**
 * Operator classifications verified against https://platform.inco.ai/models
 * on 2026-10-23. Tier names alone do not establish routing or retention.
 * Inco's Store & Improve setting remains independent of the operator.
 */
const INCO_SERVED = new Set([
  "kimi-k3", "kimi-k3:fast", "glm-5.3:fast",
  "deepseek-v4.1-flash:fast", "glm-5.3-flash:fast",
  "minimax-m3.1-flash", "minimax-m3.1-flash:fast",
]);
const RELAYED = new Set(["deepseek-v4.1-flash", "glm-5.3-flash", "glm-5.3"]);

export type ModelServing = "inco" | "relayed" | "unknown";

export function modelServing(id: string, operator?: unknown): ModelServing {
  if (typeof operator === "object" && operator !== null) {
    const value = operator as Record<string, unknown>;
    if (value.relayed === true) return "relayed";
    if (value.relayed === false && value.name === "Inco") return "inco";
    // Explicit, unrecognized operator metadata overrides the bundled classification.
    return "unknown";
  }
  return INCO_SERVED.has(id) ? "inco" : RELAYED.has(id) ? "relayed" : "unknown";
}

export function filterByServing<T extends { readonly id: string; readonly serving?: ModelServing }>(
  models: readonly T[],
  incoServedOnly: boolean,
): T[] {
  return models.filter((model) => !incoServedOnly || (model.serving ?? modelServing(model.id)) === "inco");
}
