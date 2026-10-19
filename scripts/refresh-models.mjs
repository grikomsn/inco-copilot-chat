import { readFile, writeFile } from "node:fs/promises";
const response = await fetch("https://api.inco.ai/v1/models", { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Inco public catalog returned HTTP ${response.status}`);
const body = await response.json();
if (!Array.isArray(body.data) || !body.data.length || body.data.some((model) => typeof model.id !== "string")) {
  throw new Error("Refusing to replace the bundled catalog with invalid or empty data");
}
// Public metadata only; account-private entitlements never enter git.
body.data.sort((a, b) => a.id.localeCompare(b.id));
const next = `${JSON.stringify(body, null, 2)}\n`;
const target = new URL("../src/models/snapshot.json", import.meta.url);
const changed = next !== await readFile(target, "utf8");
if (changed) {
  await writeFile(target, next);
  await writeFile(new URL("../.changeset/inco-model-resync.md", import.meta.url),
    '---\n"inco-copilot-chat": patch\n---\n\nRefresh the bundled public Inco model catalog.\n');
}
const report = `# Inco model resync\n\n${changed ? "Updated" : "No changes to"} public fallback metadata for ${body.data.length} models. Live authenticated discovery remains authoritative.\n`;
const flag = process.argv.indexOf("--report-file");
if (flag >= 0) await writeFile(process.argv[flag + 1], report);
console.log(report);
