export function isTransientServerError(status: number): boolean {
  return status >= 500 && status <= 599;
}
export function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error) || error.name === "AbortError") return false;
  return /fetch failed|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET|socket hang up/i.test(
    `${error.name}: ${error.message} ${networkCause(error)}`,
  );
}
export function retryDelayMs(attempt: number, retryAfter: string | null = null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(2_147_483_647, seconds * 1_000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, Math.min(2_147_483_647, date - Date.now()));
  }
  return Math.min(2_000, 250 * 2 ** Math.max(0, attempt));
}
function networkCause(error: Error): string {
  const cause = (error as Error & { cause?: unknown }).cause;
  return cause instanceof Error ? `${cause.name}: ${cause.message} ${networkCause(cause)}` : "";
}
