# Setup

Requires VS Code 1.125+ and GitHub Copilot Chat. Create an API key at https://platform.inco.ai/keys, then add Inco under **Manage Language Models**. VS Code stores the configured secret securely. Select an entitled model and run **Inco: Test Inference**.

If a model is unavailable, run **Inco: Refresh Models**. Check https://platform.inco.ai/usage for credit and https://platform.inco.ai/limits for limits. A workspace may disallow relayed models; the extension respects that policy and never changes it. Inco's detailed error explains entitlement and billing failures.

Commands operate on the most recently provisioned provider key; chat requests always use the exact key attached to their selected model entry.

Set `incoCopilot.incoServedOnly` to `true` to hide relayed and unclassified models and block requests using stale selections. This is a routing filter, not a ZDR guarantee; Inco dashboard storage and training settings still apply. Classifications come from https://platform.inco.ai/models and explicit operator metadata when present. Unknown models are excluded until classified.
