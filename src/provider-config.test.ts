import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface Manifest {
  name: string;
  displayName: string;
  description: string;
  publisher: string;
  activationEvents: string[];
  contributes: {
    commands: Array<{ command: string; title: string }>;
    configuration: { properties: Record<string, { description?: string; default?: unknown }> };
    languageModelChatProviders: Array<Record<string, unknown>>;
    languageModelTools?: unknown[];
  };
}

function readManifest(): Manifest {
  return JSON.parse(readFileSync("package.json", "utf8")) as Manifest;
}

test("declares native API-key configuration without a management-command override", () => {
  const manifest = readManifest();
  const provider = manifest.contributes.languageModelChatProviders.find((item) => item.vendor === "inco");
  assert.ok(provider);
  assert.equal(provider.managementCommand, undefined);
  const configuration = provider.configuration as {
    required?: string[];
    properties?: Record<string, { secret?: boolean }>;
  };
  assert.deepEqual(configuration.required, ["apiKey"]);
  assert.equal(configuration.properties?.apiKey.secret, true);
  assert.equal(configuration.properties?.entryId, undefined);
});

test("declares the rebranded extension identity and activation event", () => {
  const manifest = readManifest();
  assert.equal(manifest.name, "inco-copilot-chat");
  assert.equal(manifest.publisher, "grikomsn");
  assert.match(manifest.displayName, /Inco/);
  assert.ok(manifest.activationEvents.includes("onLanguageModelChatProvider:inco"));
});

test("names the extension Inco while the service stays Inco AI", () => {
  const manifest = readManifest();
  const raw = JSON.stringify(manifest);
  // The extension never presents itself as Inco AI: display identity and command
  // titles are Inco only.
  assert.ok(!manifest.displayName.includes("Inco AI"));
  for (const { title } of manifest.contributes.commands) assert.ok(!title.includes("Inco AI"), `command title mentions Inco AI: ${title}`);
  // The Inco AI service is named factually in descriptions, with unaffiliation stated.
  assert.match(manifest.description, /Inco AI/);
  assert.match(readFileSync("README.md", "utf8"), /not affiliated with Inco AI/);
  assert.equal(manifest.contributes.configuration.properties["incoCopilot.inlineSuggestions"], undefined);
});

test("keeps connection commands and removes entry-selection workflows", () => {
  const manifest = readManifest();
  const commandIds = manifest.contributes.commands.map((item) => item.command);
  for (const command of [
    "manage",
    "refreshModels",
    "openUsage",
    "showUsage",
    "testConnection",
    "openApiKeys",
    "diagnostics",
  ]) {
    assert.ok(commandIds.includes(`incoCopilot.${command}`), `missing command: ${command}`);
  }
  for (const command of [
    "configureApiKey",
    "removeApiKey",
    "selectImageEntry",
    "setDefaultImageModel",
    "configureGatewaySession",
    "removeGatewaySession",
    "selectEntry",
    "selectInlineEntry",
    "forgetEntry",
    "restoreEntry",
  ]) {
    assert.ok(!commandIds.includes(`incoCopilot.${command}`), `unexpected command: ${command}`);
  }
  assert.match(
    manifest.contributes.commands.find((item) => item.command === "incoCopilot.testConnection")?.title ?? "",
    /Test Inference/,
  );
});

test("ships no language-model tools and no image settings", () => {
  const manifest = readManifest();
  assert.equal(manifest.contributes.languageModelTools, undefined);
  const raw = JSON.stringify(manifest);
  assert.ok(!raw.includes("imageEntry"));
  assert.ok(!raw.includes("defaultImageModel"));
  assert.ok(!raw.includes("gatewaySession"));
});

test("routing filter is opt-in and explains the independent retention controls", () => {
  const setting = readManifest().contributes.configuration.properties["incoCopilot.incoServedOnly"];
  assert.equal(setting.default, false);
  assert.match(setting.description ?? "", /not retention/);
});
