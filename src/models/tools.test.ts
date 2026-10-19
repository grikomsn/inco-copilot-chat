import assert from "node:assert/strict";
import test from "node:test";
import { modelToolCalling, requiresNonThinkingTools } from "./tools";

test("does not advertise unverified or unstructured function calls", () => {
  assert.equal(modelToolCalling("minimax-m3:fast", undefined), false);
  assert.equal(modelToolCalling("new-model", undefined), false);
  assert.equal(modelToolCalling("minimax-m3", undefined), true);
  assert.equal(modelToolCalling("deepseek-v4.1-flash:fast", undefined), true);
});

test("explicit live tool capability remains authoritative", () => {
  assert.equal(modelToolCalling("minimax-m3:fast", true), true);
  assert.equal(modelToolCalling("kimi-k3", false), false);
  assert.equal(requiresNonThinkingTools("deepseek-v4.1-flash"), true);
  assert.equal(requiresNonThinkingTools("deepseek-v4.1-flash:fast"), false);
});
