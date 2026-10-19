# Models

`GET https://api.inco.ai/v1/models` with your key returns the entitled catalog. Live model names, context length, prices, explicit image modalities, and effort lists override the bundled public snapshot. Model identifiers, including `:fast`, are sent unchanged. VS Code namespaces models by provider-entry group.

The public snapshot is refreshed by `npm run refresh-models` and the weekly workflow. Only public metadata enters the repository. Empty authenticated catalogs remain empty; a refused API key lists no models. Transient discovery failures can use the entry-scoped persisted catalog or the public snapshot.

Known Kimi K3 and GLM 5.3 families expose low/high/max; DeepSeek V4 exposes none/high/max. Other models preserve the server default unless the catalog enumerates efforts. A boolean reasoning capability alone does not establish an effort list. See https://platform.inco.ai/docs for the API contract.

Image support requires `modalities.input` to include `image`. Tool calling uses OpenAI-compatible function tools. An explicit `capabilities.tool_calling: false` disables tools for that model. Output budgets reserve space inside the context window; when the catalog omits output limits the extension requests at most 16,384 tokens by default.

Set `incoCopilot.incoServedOnly` to `true` to hide relayed and unclassified models and block requests using stale selections. This is a routing filter, not a ZDR guarantee; Inco dashboard storage and training settings still apply. Classifications come from https://platform.inco.ai/models and explicit operator metadata when present. Unknown models are excluded until classified.
