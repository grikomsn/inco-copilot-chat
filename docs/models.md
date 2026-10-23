# Models and reasoning

## Discovery and limits

`GET https://api.inco.ai/v1/models` with your key returns the entitled catalog. Live names, context windows, prices, explicit image modalities, and enumerated effort lists override bundled metadata. Model IDs, including `:fast`, are sent unchanged; VS Code namespaces them per provider-entry group.

The current public catalog contains ten routes across Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, GLM 5.3 Flash, and MiniMax M3.1 Flash. Each currently advertises a 1,048,576-token context. Image input requires explicit `modalities.input` support; several routes also advertise video input, which the extension does not consume. An omitted output limit uses a conservative 16,384-token request budget, reserved inside the context window; that budget is not a claim about maximum model capacity.

A successful empty catalog remains empty. Invalid keys list no models. Transient discovery failures can use a per-key cached catalog or the public fallback snapshot. Public metadata is refreshed by `npm run refresh-models` and the weekly workflow; account-private entitlements never enter git.

## Documented capabilities versus observed behavior

The [Inco AI API reference](https://platform.inco.ai/docs#reasoning) says that `reasoning_effort` controls Chat Completions reasoning, `none` stops it, and effort levels outside the model maker's supported set return HTTP 400. The [public catalog](https://api.inco.ai/v1/models) marks all ten routes with `capabilities.reasoning_effort: true`, but does not enumerate their accepted efforts or structured-tool support. A reasoning-capable flag alone does not establish a working Off control.

The observations below were made on **2026-10-23**, using **120 synthetic arithmetic control cases** across the ten public routes. Each route received the default request; `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`; `thinking.type` enabled/disabled; and `chat_template_kwargs.enable_thinking` true/false. Prompt storage and relay access were enabled on the account before the probes. Streaming, structured function calls, and tool-result follow-ups were also checked in a real VS Code 1.142 Extension Development Host and against the live API.

In the table, **all seven** means `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`. Accepted efforts returned HTTP 200; that does not prove each positive spelling produces a distinct reasoning depth. The probes inspected the reasoning channel, thinking markup in ordinary content, and answer completion separately from request acceptance.

| Route | Accepted `reasoning_effort` values | Documented Off (`none`) versus observed | Extra Chat `thinking.type` probe | Structured tools observed |
| --- | --- | --- | --- | --- |
| `deepseek-v4.1-flash` | All seven | Works | Enable and disable work | Calls and follow-up; forced calls require `none` |
| `deepseek-v4.1-flash:fast` | All seven | Works; server default also off | Ignored; both leave default off | Calls and follow-up |
| `kimi-k3` | none, low, high, max | Works | Enable and disable work | Calls and follow-up |
| `kimi-k3:fast` | All seven | Works | Disable ignored; still reasons | Calls and follow-up |
| `glm-5.3` | low, high, max | `none`, `minimal`, `medium`, and `xhigh` rejected with HTTP 400 | Disable rejected with HTTP 400 | Calls and follow-up |
| `glm-5.3:fast` | All seven | Still reasons | Disable ignored | Calls and follow-up |
| `glm-5.3-flash` | low, high, max | `none`, `minimal`, `medium`, and `xhigh` rejected with HTTP 400 | Disable rejected with HTTP 400 | Calls and follow-up |
| `glm-5.3-flash:fast` | All seven | Still reasons | Disable ignored | Calls and follow-up |
| `minimax-m3.1-flash` | All seven | Works | Enable and disable work | Calls and follow-up |
| `minimax-m3.1-flash:fast` | All seven | Still reasons | Disable ignored | Calls and follow-up |

`glm-5.3:fast` timed out during the 2026-10-23 rerun, so its row carries forward the 2026-10-19 verification rather than fresh probes.

The API reference describes the `thinking` switch under Messages. The table's `thinking.type` results are additional Chat Completions compatibility probes, not a claim that the reference promises that field on Chat Completions. Of the template-flag probes, only standard Kimi K3 provided a clean on/off switch with `chat_template_kwargs.enable_thinking`; the other routes ignored it or returned thinking markup in ordinary content. The extension therefore uses `reasoning_effort` for its controls.

### Picker behavior

The picker offers the accepted effort values above with these safety exclusions:

- Standard GLM 5.3 and standard GLM 5.3 Flash reject `none`, `minimal`, `medium`, and `xhigh` with HTTP 400; those values are unavailable for those routes.
- GLM 5.3 Fast, GLM 5.3 Flash Fast, and MiniMax M3.1 Flash Fast omit `none` because it did not stop reasoning.
- Standard Kimi K3 rejects `minimal`, `medium`, and `xhigh`.

Only five routes had a verified reasoning-free Off: both DeepSeek routes, both Kimi routes, and standard MiniMax M3.1 Flash.

The picker selection overrides `incoCopilot.reasoningEffort`. Unsupported settings fall back to a supported per-model default. Unknown model IDs keep the server default unless a live catalog explicitly lists their efforts. Explicit live lists remain authoritative and are never widened by family-name guesses.

See [development](development.md#capability-probes) for the reproducible probe command. These findings describe the tested routes and requests on the date above, not every possible prompt or future upstream behavior. [The model directory](https://platform.inco.ai/models) lists routes and operators.

### Untested advertised limits and modalities

All ten routes advertise a 1,048,576-token context, but the maximum context and output lengths were not stress-tested. The public catalog explicitly advertises image input for `deepseek-v4.1-flash`, `deepseek-v4.1-flash:fast`, `glm-5.3-flash`, `glm-5.3-flash:fast`, `kimi-k3`, `kimi-k3:fast`, `minimax-m3.1-flash`, and `minimax-m3.1-flash:fast`; image inference was not live-tested. The GLM 5.3 Flash and MiniMax M3.1 Flash routes additionally advertise video input, which the extension does not consume. The remaining routes omit image modality metadata, which does not prove that their upstream model is text-only. The extension enables image attachments only when explicit catalog metadata supports them.

## Function tools

Structured function calls and tool-result follow-ups were exercised in a real VS Code host and against the live API. All current public routes produced structured calls: both MiniMax M3.1 Flash routes were verified with required tool choice on 2026-10-23, and automatic tool use plus follow-up turns were verified across the catalog in earlier native-host checks. Unknown routes also require explicit live tool capability or later verification.

Standard `deepseek-v4.1-flash` supports automatic tools with thinking, but its API rejects forced tool choice while thinking is on. For a caller requiring a tool call, select **None** or the Fast route. The extension validates this combination before sending a request rather than silently changing the selected effort.

## Pricing and local usage

Inco reports input, cached-input, and output rates in USD per million tokens. Live catalog prices appear in the model picker and feed local spend estimates. Cached tokens are charged at the cache rate instead of being counted twice. Unknown prices remain unknown; other clients and devices are outside the extension's counters. The [Inco dashboard](https://platform.inco.ai/usage) is authoritative.

## Routing and privacy

`incoCopilot.incoServedOnly` excludes relayed and unclassified models, including cached and fallback entries, and blocks stale hidden selections. Classification was re-verified against the model directory on 2026-10-23: standard Kimi K3 and standard MiniMax M3.1 Flash are Inco-served, every `:fast` route is Inco-served, and standard GLM 5.3, GLM 5.3 Flash, and DeepSeek V4.1 Flash are relayed. Tier names alone do not establish routing; classification uses the model directory and explicit operator metadata rather than the fast suffix.

This is a routing filter, not a ZDR guarantee. Inco dashboard storage and training settings still apply. See [security](security.md) and the [current privacy policy](https://inco.ai/legal/privacy/).
