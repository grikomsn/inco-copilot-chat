import assert from "node:assert/strict";
import test from "node:test";
import { API_BASE, API_ORIGIN, INCO_ENDPOINTS, extensionUserAgent, incoHeaders } from "./protocol";

test("keeps Inco endpoints and request identity centralized", () => {
  assert.equal(INCO_ENDPOINTS.models, `${API_BASE}/models`);
  assert.equal(INCO_ENDPOINTS.chat, `${API_BASE}/chat/completions`);
  assert.equal(API_ORIGIN, "https://api.inco.ai");
  assert.equal(extensionUserAgent("1.2.3", "1.125.0"), "inco-copilot-chat/1.2.3 VSCode/1.125.0");
  assert.deepEqual(incoHeaders("secret", "application/json", "agent"), {
    Authorization: "Bearer secret",
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "agent",
  });
});
