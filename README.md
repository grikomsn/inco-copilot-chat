# Inco for GitHub Copilot Chat

![Inco for GitHub Copilot Chat](assets/cover.jpg)

[![CI](https://github.com/grikomsn/inco-copilot-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/grikomsn/inco-copilot-chat/actions/workflows/ci.yml)
[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/grikomsn.inco-copilot-chat)](https://marketplace.visualstudio.com/items?itemName=grikomsn.inco-copilot-chat)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Use [Inco AI](https://platform.inco.ai/docs) models directly in GitHub Copilot Chat with your own API key. This independent extension is not affiliated with Inco AI, GitHub, or Microsoft.

## Features

- Native **Manage Language Models** provider entries, with API keys stored securely by VS Code.
- Live, authenticated model discovery, including standard and `:fast` tiers available to your workspace.
- Streamed answers and reasoning, parallel tool calls, tool-result follow-ups, and cancellation.
- Model-specific reasoning controls and selectable context budgets.
- An optional Inco-served-only filter that hides relayed and unclassified models.
- Context windows, explicit image capabilities, and token prices from Inco's live catalog.
- Device-local usage counters and estimated spend, with links to authoritative dashboard billing.
- No production runtime dependencies, custom API gateways, or extension telemetry.

## Quick start

1. Install VS Code **1.125+**, GitHub Copilot Chat, and this extension.
2. Create an API key in [Inco API Keys](https://platform.inco.ai/keys) and ensure your workspace has credit.
3. Open Copilot Chat's model picker, choose **Manage Language Models**, and add **Inco**.
4. Enter your API key, select the models you want, and choose an Inco model in chat.
5. Run **Inco: Test Inference** to verify a real inference request.

Provider entries keep their own keys. A successful empty model list remains empty; it is never replaced with public models you cannot access. A bundled public catalog is used only when discovery is temporarily unavailable. Workspace relay restrictions remain controlled by Inco; a `403` permission error does not invalidate your API key.

## Models and reasoning

Inco's public catalog currently includes Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, GLM 5.3 Flash, and MiniMax M3, including fast tiers. Your authenticated catalog is authoritative. See [model metadata](docs/models.md).

The picker exposes verified reasoning controls for known model families. Unknown models keep the server default unless the catalog enumerates supported efforts. Image input is enabled only when the catalog explicitly advertises it. Output defaults to a conservative **16,384-token request budget** when the API omits a limit; this is not a claim about the model's maximum output capacity.

The **Inco Served Only** setting filters routing, including cached and fallback models, and blocks requests from previously selected hidden models. It does not guarantee zero data retention. Inco’s [current privacy policy](https://inco.ai/legal/privacy/) explains the storage and training controls separately from Passthrough routing. Disable the relevant dashboard storage/training settings when you require those controls; the extension cannot read or change them. Some standard-tier models are Inco-served.

## Commands

| Command | Purpose |
| --- | --- |
| Inco: Manage Connection | Open native provider configuration |
| Inco: Refresh Models | Refresh the active entry's entitled catalog |
| Inco: Test Inference | Send a short connection-check prompt |
| Inco: Show Local Usage | Show local activity and estimated spend |
| Inco: Open Dashboard Usage | Open authoritative usage and billing |
| Inco: Open API Keys | Open the Inco key dashboard |
| Inco: Show Diagnostics | Show endpoint and configuration status without secrets |

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `incoCopilot.incoServedOnly` | `false` | Show and allow only verified Inco-served models |
| `incoCopilot.reasoningEffort` | `high` | Default supported effort; picker selection overrides it |
| `incoCopilot.maxOutputTokens` | `16384` | Output request budget; `0` uses catalog/default budget |
| `incoCopilot.requestTimeoutSeconds` | `600` | Total inference timeout |
| `incoCopilot.streamIdleTimeoutSeconds` | `120` | Stream inactivity timeout |
| `incoCopilot.catalogCacheMinutes` | `5` | Catalog refresh interval |
| `incoCopilot.debugLogging` | `false` | Log operational metadata without prompts, responses, or API keys |
| `incoCopilot.showUsageStatusBar` | `true` | Show local token usage |

## Privacy and troubleshooting

Chat history, tools, and supported images go directly to `https://api.inco.ai/v1`. Keys stay in VS Code-managed secret provider configuration. The extension does not read `.env` in normal use. The local development `.env` file is ignored by Git and excluded from VSIX packages.

A `401` means an invalid key; `402` means exhausted credit; `403` can mean model entitlement or workspace relay policy; `429` means a workspace rate or spend limit. The extension surfaces Inco's message and retries transient network/server failures before streaming begins. See [security](docs/security.md) and [setup](docs/setup.md).

## Development and releases

```sh
npm ci
npm run check
npm run package
```

Use Node.js 22+ and npm. Tests use injected HTTP fakes; live checks run separately in VS Code. The repository follows the sister extensions' colocated tests, issue templates, documentation, pinned CI actions, weekly public model resync, and Changesets release workflow.

Add user-visible changes with `npm run changeset`. The release workflow opens a version PR; merging it publishes through the `VSCE_PAT` GitHub Actions secret and creates a GitHub release with the VSIX. See [development](docs/development.md) and [contributing](CONTRIBUTING.md).

## License

[MIT](LICENSE). Inco branding belongs to its respective owner; the extension icon comes from the public Inco platform site.
