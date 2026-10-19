# Security and privacy

API keys are supplied by VS Code's native secret provider-entry configuration and held in memory for routing. SHA-256 credential references isolate persisted model metadata and local usage; raw keys are never persisted by this extension. The extension has no telemetry and no runtime dependencies.

Inference requests send the supplied conversation, tool schemas and results, and supported images directly to the fixed Inco API origin. Workspace settings cannot redirect credentials to another endpoint. Requests identify this extension in the user agent. Local logs contain operational metadata, not prompts, full responses, keys, or account records.

`.env`, logs, generated JavaScript, source maps, and VSIX files are ignored by Git; development credentials and tests are excluded from the packaged extension. Public model resync does not use account credentials. Token counts and estimated spend are local and incomplete if other devices or clients use your account. The Inco dashboard is authoritative.

Report vulnerabilities according to [SECURITY.md](../SECURITY.md).

Set `incoCopilot.incoServedOnly` to `true` to hide relayed and unclassified models and block requests using stale selections. This is a routing filter, not a ZDR guarantee; Inco dashboard storage and training settings still apply. Classifications come from https://platform.inco.ai/models and explicit operator metadata when present. Unknown models are excluded until classified.
