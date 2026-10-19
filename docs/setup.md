# Setup and configuration

## Requirements

- VS Code 1.125 or newer
- GitHub Copilot Chat available in the same VS Code profile
- An Inco API key and sufficient prepaid credit

## Add a provider entry

1. Create a key at [Inco API Keys](https://platform.inco.ai/keys).
2. Open **Chat: Manage Language Models**, add **Inco**, name the group, and enter the key.
3. Select an entitled model in Copilot Chat.
4. Run **Inco: Test Inference** for a live check.

VS Code owns the configured secret. Entry group names identify models in the host; no extra entry ID is needed. Each request uses its selected entry's exact key. Management commands use the most recently provisioned entry.

## Commands

| Command | Purpose |
| --- | --- |
| Inco: Manage Connection | Open native provider configuration |
| Inco: Refresh Models | Refresh the active entry's entitled catalog |
| Inco: Test Inference | Verify a short real response |
| Inco: Show Local Usage | Show local tokens and estimated spend |
| Inco: Open Dashboard Usage | Open authoritative usage and billing |
| Inco: Open API Keys | Open the key dashboard |
| Inco: Show Diagnostics | Show endpoint and configuration status without secrets |

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `incoCopilot.incoServedOnly` | `false` | Show and allow only verified Inco-served models |
| `incoCopilot.reasoningEffort` | `high` | Default supported effort; the picker overrides it |
| `incoCopilot.maxOutputTokens` | `16384` | Output request budget; `0` uses the model/default budget |
| `incoCopilot.requestTimeoutSeconds` | `600` | Total inference timeout |
| `incoCopilot.streamIdleTimeoutSeconds` | `120` | Stream inactivity timeout |
| `incoCopilot.catalogCacheMinutes` | `5` | Catalog refresh interval |
| `incoCopilot.debugLogging` | `false` | Operational metadata without prompts, responses, or keys |
| `incoCopilot.showUsageStatusBar` | `true` | Show device-local token usage |

The Inco-served-only filter excludes relayed and unclassified models, including cached and fallback models. It also blocks requests using stale hidden selections. It filters routing, not retention; dashboard storage and training settings still apply. See [security](security.md).

## Troubleshooting

Run **Inco: Refresh Models** after entitlement changes. Check [usage](https://platform.inco.ai/usage) for credit, [limits](https://platform.inco.ai/limits) for rate/spend limits, and dashboard settings for relay access.

A `401` means an invalid key; `402` means exhausted credit; `403` can mean model entitlement or relay policy; `429` means a workspace rate or spend limit. Inco's detailed message is surfaced. Transient network/server failures are retried before streaming begins. A successful empty catalog stays empty.

After sideloading an update, reload every open VS Code window so native model metadata refreshes.
