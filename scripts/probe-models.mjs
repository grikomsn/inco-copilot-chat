import { writeFile } from "node:fs/promises";

const apiKey = process.env.INCO_API_KEY;
if (!apiKey) throw new Error("Set INCO_API_KEY or launch Node with --env-file=.env");
const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const reportFile = argument("--report-file");
const selected = argument("--models")?.split(",");
const response = await fetch("https://api.inco.ai/v1/models", { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Public catalog returned HTTP ${response.status}`);
const catalog = await response.json();
if (!Array.isArray(catalog.data)) throw new Error("Invalid public model catalog");
const pending = catalog.data.map((model) => model.id).filter((id) => !selected || selected.includes(id)).sort();
const cases = [
  ["default", {}],
  ...["none", "minimal", "low", "medium", "high", "xhigh", "max"].map((reasoning_effort) => [reasoning_effort, { reasoning_effort }]),
  ["thinking-disabled", { thinking: { type: "disabled" } }],
  ["thinking-enabled", { thinking: { type: "enabled" } }],
  ["template-disabled", { chat_template_kwargs: { enable_thinking: false } }],
  ["template-enabled", { chat_template_kwargs: { enable_thinking: true } }],
];
const report = { date: new Date().toISOString(), endpoint: "https://api.inco.ai/v1/chat/completions", results: [] };
let reportWrites = Promise.resolve();
const persist = () => {
  reportWrites = reportWrites.then(async () => {
    if (reportFile) await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  });
  return reportWrites;
};

async function probe(model, label, control) {
  const started = Date.now();
  try {
    const response = await fetch(report.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "User-Agent": "inco-copilot-chat/capability-probe" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "Calculate 137 times 249. Reply with only the integer." }],
        max_completion_tokens: 768, stream: false, ...control }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await response.json();
    const choice = body.choices?.[0];
    const message = choice?.message;
    const reasoning = message?.reasoning_content ?? message?.reasoning;
    const content = typeof message?.content === "string" ? message.content : "";
    return {
      model, case: label, status: response.status, elapsedMs: Date.now() - started,
      reasoningChars: typeof reasoning === "string" ? reasoning.length : 0,
      reasoningTokens: body.usage?.completion_tokens_details?.reasoning_tokens,
      contentThinkingMarkup: /<\/?think>|<\|[^>]*(?:analysis|think)/i.test(content),
      answerChars: content.length, answerCorrect: content.trim() === "34113", finishReason: choice?.finish_reason,
      ...(response.ok ? {} : { errorCode: body.error?.code, errorType: body.error?.type }),
    };
  } catch (error) {
    return { model, case: label, status: 0, elapsedMs: Date.now() - started, errorType: error.name };
  }
}

async function worker() {
  while (pending.length) {
    const model = pending.shift();
    for (const [label, control] of cases) {
      let result = await probe(model, label, control);
      if (result.status === 0 || result.status >= 500) {
        const retry = await probe(model, label, control);
        result = { ...retry, firstAttemptStatus: result.status };
      }
      report.results.push(result);
      await persist();
      console.log(JSON.stringify(result));
      // Missing permissions or credit cannot establish a model's capabilities.
      if (label === "default" && [401, 402, 403, 404].includes(result.status)) break;
    }
  }
}

await Promise.all([worker(), worker()]);
await persist();
