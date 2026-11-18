---
"inco-copilot-chat": patch
---

Forward tool-result images and tighten error details

- Vision models now receive images returned by tools after every parallel tool call settles; text-only models keep a placeholder.
- HTTP errors show only a bounded, provider-authored message from structured error bodies; raw response bodies are never echoed.

Shared provider plumbing now comes from the copilot-chat-kit submodule, so fixes land in every Copilot Chat provider extension at once.
