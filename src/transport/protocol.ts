export const API_ORIGIN = "https://api.inco.ai";
export const API_BASE = `${API_ORIGIN}/v1`;

export const INCO_ENDPOINTS = {
  models: `${API_BASE}/models`,
  chat: `${API_BASE}/chat/completions`,
} as const;

export function extensionUserAgent(version: string, vscodeVersion: string): string {
  return `inco-copilot-chat/${version} VSCode/${vscodeVersion}`;
}

export function incoHeaders(apiKey: string, accept: string, userAgent: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: accept,
    "User-Agent": userAgent,
  };
}
