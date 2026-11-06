# Changelog

## 1.0.7

### Patch Changes

- 51035f7: Retire Kimi K3 and adopt Kimi K3.1 Pro (Fast). Inco removed `kimi-k3:fast` from the catalog and `kimi-k3` refuses requests with a 404 `model_not_found` error from 2026-11-06; requests now offer `kimi-k3.1-pro:fast`, live-probed to accept all seven reasoning-effort values with a working `none` Off switch and structured function calls. The bundled public catalog snapshot was refreshed, routing classification re-verified against the Inco model directory, and `docs/models.md` updated with the 2026-11-06 probe results.
- 51035f7: Refresh the bundled public Inco model catalog: `kimi-k3:fast` left the public catalog and the new `kimi-k3.1-pro:fast` route (image input, $6/$0.60/$30 per million tokens) was added.

## 1.0.6

### Patch Changes

- 7f25a64: Refresh the bundled public Inco model catalog snapshot. The live `/v1/models` payload now reports reasoning modes and efforts in a structured `supported`/`default` shape; the reader ignores the block and per-route profiles cover every id, so runtime behavior is unchanged (compiled output verified identical).

## 1.0.5

### Patch Changes

- ba263d0: Cap the honored Retry-After delay at 5 seconds, matching the family's bounded backoff, so a long server-provided delay can no longer stall a request.

## 1.0.4

### Patch Changes

- b87bf4f: Refresh the bundled public Inco model catalog.

## 1.0.3

### Patch Changes

- 3bdb537: Refresh the bundled public Inco model catalog and update model capabilities. MiniMax M3 is replaced by MiniMax M3.1 Flash (standard and fast), GLM 5.3 now rejects several reasoning efforts, and routing classification is re-verified.

## 1.0.2

### Patch Changes

- 455db19: Count tool results, tool arguments, thinking, and image inputs when budgeting Copilot Chat context, and explain how to recover from context-window errors.

## 1.0.1

### Patch Changes

- c074967: Map aborted requests to a friendly "Request cancelled or timed out" message in
  shared error formatting instead of surfacing the raw AbortError text.
- 498c7ee: Replace the blank orange placeholder in the extension icon and repository cover with the supplied Inco logo, preserving the sister projects' Copilot artwork and layout.

## 1.0.0

### Major Changes

- c20fc3e: Release the Inco provider for GitHub Copilot Chat with native secure API-key entries, authenticated model discovery, streamed reasoning and tools, context controls, local usage estimates, and an optional Inco-served-only routing filter.

  Align extension artwork and repository documentation with the sister projects, and use per-model thinking controls verified through live Inco probes.

  Offer only verified reasoning-off controls and structured tool capabilities, including standard/Fast route differences and DeepSeek forced-tool validation.

  Document the route-by-route differences between Inco AI's API contract and observed effort acceptance, reasoning-off behavior, thinking flags, and structured function calls, with explicit limits on what the live probes establish.

Release notes are maintained with Changesets.
