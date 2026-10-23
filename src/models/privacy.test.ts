import assert from "node:assert/strict";
import test from "node:test";
import { filterByServing, modelServing } from "./privacy";

test("routing classification is independent of standard or fast tier names", () => {
  assert.equal(modelServing("kimi-k3"), "inco");
  assert.equal(modelServing("glm-5.3"), "relayed");
  assert.equal(modelServing("glm-5.3-flash"), "relayed");
  assert.equal(modelServing("minimax-m3.1-flash"), "inco");
  assert.equal(modelServing("minimax-m3.1-flash:fast"), "inco");
  assert.equal(modelServing("new-model:fast"), "unknown");
});
test("operator metadata overrides bundled classifications without guessing privacy", () => {
  assert.equal(modelServing("kimi-k3", { name: "Other", relayed: true }), "relayed");
  assert.equal(modelServing("private-model", { name: "Inco", relayed: false }), "inco");
  assert.equal(modelServing("kimi-k3", { name: "Other", relayed: false }), "unknown");
});
test("Inco-served-only filtering excludes relayed and unknown models, including cached and fallback lists", () => {
  const models = [{ id: "kimi-k3" }, { id: "glm-5.3" }, { id: "private:fast" }];
  assert.deepEqual(filterByServing(models, true), [{ id: "kimi-k3" }]);
  assert.deepEqual(filterByServing(models, false), models);
  assert.deepEqual(filterByServing([{ id: "kimi-k3", serving: "relayed" }], true), []);
  assert.deepEqual(filterByServing([], true), []);
});
