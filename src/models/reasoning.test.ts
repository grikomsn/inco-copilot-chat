import assert from "node:assert/strict";
import test from "node:test";
import { reasoningProfile } from "./reasoning";

test("offers Off only where a reasoning-free answer was observed", () => {
  for (const id of ["kimi-k3", "kimi-k3:fast", "deepseek-v4.1-flash", "deepseek-v4.1-flash:fast", "minimax-m3"]) {
    assert.ok(reasoningProfile(id, undefined, true)?.efforts.includes("none"));
  }
  for (const id of ["glm-5.3", "glm-5.3:fast", "glm-5.3-flash", "glm-5.3-flash:fast", "minimax-m3:fast"]) {
    assert.equal(reasoningProfile(id, undefined, true)?.efforts.includes("none"), false);
  }
});

test("does not generalize hosted effort acceptance to the standard Kimi route", () => {
  assert.deepEqual(reasoningProfile("kimi-k3", undefined, true)?.efforts, ["none", "low", "high", "max"]);
  assert.ok(reasoningProfile("kimi-k3:fast", undefined, true)?.efforts.includes("minimal"));
  assert.equal(reasoningProfile("glm-5.3", undefined, true)?.efforts.includes("minimal"), false);
  assert.deepEqual(reasoningProfile("glm-5.3-flash", undefined, true)?.efforts, ["low", "high", "max"]);
});

test("unprobed IDs keep server defaults and explicit live lists remain authoritative", () => {
  assert.equal(reasoningProfile("private-chat", undefined, true), undefined);
  assert.deepEqual(reasoningProfile("kimi-k3", ["low", "bad", "high", "low"], true)?.efforts, ["low", "high"]);
  assert.equal(reasoningProfile("kimi-k3", [], true), undefined);
  assert.equal(reasoningProfile("kimi-k3", ["high"], false), undefined);
});
