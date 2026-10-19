# Models and reasoning

## Discovery and limits

`GET https://api.inco.ai/v1/models` with your key returns the entitled catalog. Live names, context windows, prices, explicit image modalities, and enumerated effort lists override bundled metadata. Model IDs, including `:fast`, are sent unchanged; VS Code namespaces them per provider-entry group.

The current public catalog contains ten routes across Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, GLM 5.3 Flash, and MiniMax M3. Each currently advertises a 1,048,576-token context. Image input requires explicit `modalities.input` support. An omitted output limit uses a conservative 16,384-token request budget, reserved inside the context window; that budget is not a claim about maximum model capacity.

A successful empty catalog remains empty. Invalid keys list no models. Transient discovery failures can use a per-key cached catalog or the public fallback snapshot. Public metadata is refreshed by `npm run refresh-models` and the weekly workflow; account-private entitlements never enter git.

## Live reasoning probes

The following route-specific profiles were tested on **2026-10-19** with synthetic arithmetic requests. Every public route was probed with the default request; `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`; `thinking.type` enabled/disabled; and `chat_template_kwargs.enable_thinking` true/false. Relay access was enabled before completing the three relayed routes.

| Route | Efforts offered in the picker | Verified reasoning-free Off |
| --- | --- | --- |
| `deepseek-v4.1-flash` | none, minimal, low, medium, high, xhigh, max | Yes |
| `deepseek-v4.1-flash:fast` | none, minimal, low, medium, high, xhigh, max | Yes; server default also off |
| `kimi-k3` | none, low, high, max | Yes |
| `kimi-k3:fast` | none, minimal, low, medium, high, xhigh, max | Yes |
| `glm-5.3` | low, medium, high, xhigh, max | No reliable Off |
| `glm-5.3:fast` | minimal, low, medium, high, xhigh, max | No |
| `glm-5.3-flash` | low, high, max | No; none is rejected |
| `glm-5.3-flash:fast` | minimal, low, medium, high, xhigh, max | No |
| `minimax-m3` | none, minimal, low, medium, high, xhigh, max | Yes |
| `minimax-m3:fast` | minimal, low, medium, high, xhigh, max | No |

These are observed request-acceptance profiles, not proof that each accepted positive spelling produces a distinct reasoning depth. The probes checked reasoning output separately from HTTP status and final-answer completion. Generic thinking flags often returned HTTP 200 while leaving behavior unchanged, so the extension uses the verified `reasoning_effort` path.

Important route differences:

- Standard Kimi K3 rejects minimal, medium, and xhigh; its fast route accepts them.
- Standard GLM 5.3 Flash rejects none, minimal, medium, and xhigh.
- Standard GLM 5.3 accepts none/minimal but emitted `<think>` content in the ordinary answer. Those settings are excluded from the picker.
- Hosted GLM and MiniMax routes kept emitting reasoning with none selected. They expose positive efforts, with no misleading Off option.
- Standard MiniMax and DeepSeek support a working Off, unlike some fast counterparts.

The picker selection overrides `incoCopilot.reasoningEffort`. Unsupported settings fall back to a supported per-model default. Unknown model IDs keep the server default unless a live catalog explicitly lists their efforts. Explicit live lists remain authoritative and are never widened by family-name guesses.

See [development](development.md) for the reproducible probe command. [Inco API documentation](https://platform.inco.ai/docs) describes the request formats; [the model directory](https://platform.inco.ai/models) lists routes and operators.

## Function tools

Structured function calls and tool-result follow-ups were exercised in a real VS Code host. All current public routes except `minimax-m3:fast` produced structured calls. MiniMax Fast returned ordinary text in both automatic and forced-tool probes; it remains available for tool-free chat and is not advertised as an agent model. Unknown routes also require explicit live tool capability or later verification.

Standard `deepseek-v4.1-flash` supports automatic tools with thinking, but its API rejects forced tool choice while thinking is on. For a caller requiring a tool call, select **None** or the Fast route. The extension validates this combination before sending a request rather than silently changing the selected effort.

## Pricing and local usage

Inco reports input, cached-input, and output rates in USD per million tokens. Live catalog prices appear in the model picker and feed local spend estimates. Cached tokens are charged at the cache rate instead of being counted twice. Unknown prices remain unknown; other clients and devices are outside the extension's counters. The [Inco dashboard](https://platform.inco.ai/usage) is authoritative.

## Routing and privacy

`incoCopilot.incoServedOnly` excludes relayed and unclassified models, including cached and fallback entries, and blocks stale hidden selections. Some standard routes are Inco-served; classification uses the model directory and explicit operator metadata rather than the fast suffix.

This is a routing filter, not a ZDR guarantee. Inco dashboard storage and training settings still apply. See [security](security.md) and the [current privacy policy](https://inco.ai/legal/privacy/).
