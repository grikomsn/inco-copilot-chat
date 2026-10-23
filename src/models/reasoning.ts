import { REASONING_EFFORTS, type ModelEffortSpec, type ReasoningEffort } from "./options";

/**
 * Per-route probes, 2026-10-23. HTTP acceptance and a working reasoning-off
 * switch are separate observations. The API accepts extra effort spellings on
 * hosted routes; this does not establish distinct depth for every spelling.
 * See docs/models.md for observed behavior and permission gaps.
 */
const PROFILES: Readonly<Record<string, ModelEffortSpec>> = {
  "deepseek-v4.1-flash": { efforts: REASONING_EFFORTS, defaultEffort: "high" },
  "deepseek-v4.1-flash:fast": { efforts: REASONING_EFFORTS, defaultEffort: "none" },
  "kimi-k3": { efforts: ["none", "low", "high", "max"], defaultEffort: "high" },
  "kimi-k3:fast": { efforts: REASONING_EFFORTS, defaultEffort: "high" },
  // `none`, `minimal`, `medium`, and `xhigh` are rejected with HTTP 400.
  "glm-5.3": { efforts: ["low", "high", "max"], defaultEffort: "high" },
  "glm-5.3-flash": { efforts: ["low", "high", "max"], defaultEffort: "high" },
  // `none` is accepted but does not disable reasoning on these hosted routes.
  "glm-5.3:fast": { efforts: ["minimal", "low", "medium", "high", "xhigh", "max"], defaultEffort: "high" },
  "glm-5.3-flash:fast": { efforts: ["minimal", "low", "medium", "high", "xhigh", "max"], defaultEffort: "high" },
  "minimax-m3.1-flash:fast": { efforts: ["minimal", "low", "medium", "high", "xhigh", "max"], defaultEffort: "high" },
  "minimax-m3.1-flash": { efforts: REASONING_EFFORTS, defaultEffort: "high" },
};

export function reasoningProfile(id: string, advertised: unknown, enabled: unknown): ModelEffortSpec | undefined {
  if (enabled === false) return undefined;
  if (Array.isArray(advertised)) {
    const efforts = [...new Set(advertised.filter((value): value is ReasoningEffort =>
      typeof value === "string" && (REASONING_EFFORTS as readonly string[]).includes(value)))];
    if (!efforts.length) return undefined;
    return { efforts, defaultEffort: efforts.includes("high") ? "high" : efforts[0]! };
  }
  return PROFILES[id];
}
