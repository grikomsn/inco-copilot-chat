import assert from "node:assert/strict";
import test from "node:test";
import { modelCostFromApi, modelPricingFields } from "./pricing";

test("Inco prices are USD per million including cached_input", () => {
  const cost = modelCostFromApi({ input: 3, cached_input: 0.3, output: 15 });
  assert.deepEqual(cost, { input: 3, cacheRead: 0.3, output: 15 });
  assert.equal(modelPricingFields(cost)?.inputCost, 300);
  assert.match(modelPricingFields(cost)?.pricing ?? "", /Cached: \$0.3/);
  assert.equal(modelCostFromApi({ input: -1, output: 0 }), undefined);
  assert.equal(modelCostFromApi(null), undefined);
});
