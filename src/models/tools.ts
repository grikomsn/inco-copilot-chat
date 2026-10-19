/** Routes with structured function calls verified in the native host, 2026-10-19. */
const VERIFIED_TOOL_MODELS = new Set([
  "deepseek-v4.1-flash", "deepseek-v4.1-flash:fast", "kimi-k3", "kimi-k3:fast",
  "glm-5.3", "glm-5.3:fast", "glm-5.3-flash", "glm-5.3-flash:fast", "minimax-m3",
]);

export function modelToolCalling(id: string, advertised: unknown): boolean {
  return typeof advertised === "boolean" ? advertised : VERIFIED_TOOL_MODELS.has(id);
}

export function requiresNonThinkingTools(id: string): boolean {
  return id === "deepseek-v4.1-flash";
}
