import assert from "node:assert/strict";
import test from "node:test";
import { recordRequestUsage, toProviderUsagePayload, formatUsageTooltip } from "./domain";

test("normalizes usage and computes cached-token estimates from live catalog prices", () => {
  const raw = { prompt_tokens: 1000, completion_tokens: 100, prompt_tokens_details: { cached_tokens: 200 } };
  assert.equal(toProviderUsagePayload(raw).total_tokens, 1100);
  const usage = recordRequestUsage({}, raw, "glm-5.3-flash", 100, { input: 0.15, cacheRead: 0.03, output: 0.5 });
  assert.equal(usage.tracked?.requests, 1);
  assert.equal(usage.tracked?.totalTokens, 1100);
  assert.ok(Math.abs((usage.lastRequest?.cost ?? 0) - 0.000176) < 1e-12);
  assert.match(formatUsageTooltip(usage), /dashboard is authoritative/);
});
test("unknown prices remain unknown and counters stay scoped to the supplied snapshot", () => {
  const usage = recordRequestUsage({}, { prompt_tokens: 10, completion_tokens: 2 }, "private");
  assert.equal(usage.lastRequest?.cost, undefined);
  const next = recordRequestUsage(usage, { prompt_tokens: 3, completion_tokens: 4 }, "private");
  assert.equal(next.tracked?.requests, 2);
  assert.equal(next.tracked?.totalTokens, 19);
  assert.equal(usage.tracked?.requests, 1);
});
test("rejects invalid usage counters", () => {
  assert.deepEqual(toProviderUsagePayload({ prompt_tokens: -1, completion_tokens: Infinity }), {});
});
