import assert from "node:assert/strict";
import test from "node:test";
import { FALLBACK_MODEL_METADATA, modelCatalogFromApi, advertisedModelLimits } from "./catalog";

test("bundled public catalog preserves fast tiers, prices and explicit modalities", () => {
  assert.equal(FALLBACK_MODEL_METADATA.length, 10);
  const fast = FALLBACK_MODEL_METADATA.find((m) => m.id === "deepseek-v4.1-flash:fast")!;
  assert.equal(fast.contextLength, 1_048_576);
  assert.equal(fast.imageInput, true);
  assert.deepEqual(fast.cost, { input: 0.6, cacheRead: 0.012, output: 2.4 });
  assert.equal(FALLBACK_MODEL_METADATA.find((m) => m.id === "deepseek-v4.1-flash")?.imageInput, true);
  const minimax = FALLBACK_MODEL_METADATA.find((m) => m.id === "minimax-m3.1-flash")!;
  assert.equal(minimax.imageInput, true);
  assert.deepEqual(minimax.cost, { input: 0.15, cacheRead: 0.03, output: 0.6 });
});
test("live catalogs are authoritative, including an empty entitled list", () => {
  assert.deepEqual(modelCatalogFromApi({ data: [] }), []);
  assert.throws(() => modelCatalogFromApi({ models: [] }), /invalid model catalog/);
  const [model] = modelCatalogFromApi({ data: [null, { id: "embedding-1" }, { id: "private-chat", context_length: 10000, max_output_tokens: 1000 }] });
  assert.equal(model.id, "private-chat");
  assert.equal(model.reasoningEfforts, undefined);
  assert.deepEqual(advertisedModelLimits(model, 500), { maxInputTokens: 9500, maxOutputTokens: 500 });
});
test("reasoning controls use model-specific effort lists and explicit capability denial", () => {
  const models = modelCatalogFromApi({ data: [
    { id: "kimi-k3:fast" }, { id: "deepseek-v4.1-flash" },
    { id: "glm-5.3", capabilities: { reasoning_effort: false } },
    { id: "new-model", reasoning_efforts: ["bad", "low", "high"] },
  ] });
  assert.deepEqual(models.find((m) => m.id === "kimi-k3:fast")?.reasoningEfforts, ["none", "minimal", "low", "medium", "high", "xhigh", "max"]);
  assert.deepEqual(models.find((m) => m.id === "deepseek-v4.1-flash")?.reasoningEfforts, ["none", "minimal", "low", "medium", "high", "xhigh", "max"]);
  assert.equal(models.find((m) => m.id === "glm-5.3")?.reasoningEfforts, undefined);
  assert.deepEqual(models.find((m) => m.id === "new-model")?.reasoningEfforts, ["low", "high"]);
});
