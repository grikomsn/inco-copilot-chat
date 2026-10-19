<p align="center">
  <img src="https://raw.githubusercontent.com/grikomsn/inco-copilot-chat/main/assets/cover.jpg" alt="Inco and GitHub Copilot" width="960">
</p>

<h1 align="center">Inco for GitHub Copilot Chat</h1>

<p align="center">Use Inco AI models directly from the GitHub Copilot Chat model picker in Visual Studio Code.</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=grikomsn.inco-copilot-chat"><img src="https://img.shields.io/visual-studio-marketplace/v/grikomsn.inco-copilot-chat?style=flat-square&logo=visualstudiocode&label=Marketplace" alt="Visual Studio Marketplace version"></a>
  <a href="https://github.com/grikomsn/inco-copilot-chat/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/grikomsn/inco-copilot-chat/ci.yml?branch=main&style=flat-square&label=CI" alt="CI status"></a>
  <a href="https://github.com/grikomsn/inco-copilot-chat/blob/main/LICENSE"><img src="https://img.shields.io/github/license/grikomsn/inco-copilot-chat?style=flat-square" alt="MIT license"></a>
</p>

This extension is a native VS Code `LanguageModelChatProvider`. It validates your Inco API key, discovers the models available to your workspace, and streams OpenAI-compatible chat completions directly from `https://api.inco.ai/v1` into Copilot Chat.

## Highlights

- Direct Inco integration without a local proxy
- API keys owned by VS Code native provider configuration
- Multiple isolated entries, identified by their group names in Manage Language Models
- Live `/v1/models` discovery with durable per-credential catalog snapshots
- Streaming text, reasoning output, images where advertised, token usage, and parallel function-tool calls
- Per-route reasoning and tool capabilities based on live probes
- Selectable context budgets, cancellation, and total/idle stream timeouts
- Bounded retries for pre-stream transient failures only
- Device-local token usage and estimated spend, with an authoritative dashboard link
- An optional Inco-served-only filter that hides relayed and unclassified models

## Quick start

1. Install the extension. You need VS Code 1.125 or newer and GitHub Copilot Chat.
2. Create an API key in [Inco Platform](https://platform.inco.ai/keys), or run **Inco: Open API Keys**.
3. Open Copilot Chat, select **Manage Models**, add an **Inco** provider entry, name it, and enter the key.
4. Choose a model available to that workspace.

To use more than one key, add another **Inco** entry with a different name. The entry name is its identity: VS Code namespaces each entry's models per group, stores the key securely, and offers key updates on the entry. Deleting an entry removes its VS Code-owned credential. Commands and local usage use the most recently provisioned entry; chat requests use their selected entry's exact key.

Use **Inco: Manage Connection** to open native provider configuration, **Inco: Test Inference** to verify a real response, and **Inco: Show Local Usage** to inspect device-local activity. The extension does not load `.env` during normal use.

## Routing and data settings

Set `incoCopilot.incoServedOnly` to `true` to show and allow only verified Inco-served models. The filter also applies to cached and fallback catalogs and blocks requests from previously selected hidden models. Unknown operators stay hidden until classified. Some standard-tier models are Inco-served; a `:fast` suffix alone does not establish routing.

This routing filter does not guarantee zero data retention. Inco's dashboard **Store & Improve**, **Training**, and **Allow relayed models** controls determine storage, training, and relay access. See the [current Inco privacy policy](https://inco.ai/legal/privacy/) and [security model](docs/security.md).

## Documentation

- [Setup, settings, and troubleshooting](docs/setup.md)
- [Model capability differences, reasoning controls, and pricing](docs/models.md)
- [API key and security model](docs/security.md)
- [Development and releases](docs/development.md)

## Related projects

- [Codex Bridge for Copilot Chat](https://github.com/grikomsn/openai-oauth-copilot-chat) — Use OpenAI models in Copilot Chat with ChatGPT authentication.
- [Grok for GitHub Copilot Chat](https://github.com/grikomsn/grok-copilot-chat) — Use xAI Grok models directly from the model picker.
- [Inception for GitHub Copilot Chat](https://github.com/grikomsn/inception-copilot-chat) — Use Inception Mercury models directly from the model picker.
- [Ollama Cloud for GitHub Copilot Chat](https://github.com/grikomsn/ollama-cloud-copilot-chat) — Use Ollama Cloud models with native thinking and tool support.
- [OpenCode for GitHub Copilot Chat](https://github.com/grikomsn/opencode-copilot-chat) — Use OpenCode Console and Go models from the model picker.
- [Orvix for GitHub Copilot Chat](https://github.com/grikomsn/orvix-copilot-chat) — Use Orvix managed and BYOK models from the model picker.
- [Poolside for GitHub Copilot Chat](https://github.com/grikomsn/poolside-copilot-chat) — Use hosted Poolside coding models from the model picker.

Unofficial project; not affiliated with Inco AI, GitHub, or Microsoft. Inco usage limits and charges still apply. Licensed under [MIT](LICENSE).
