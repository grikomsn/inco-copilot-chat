# Changelog

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
