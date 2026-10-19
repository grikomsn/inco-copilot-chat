# Development

Install Node.js 22+ and run `npm ci`. `package-lock.json` is authoritative. `npm run check` compiles and runs colocated `node:test` coverage. `npm run package` validates and produces the installable VSIX; generated outputs are ignored.

Press F5 for an Extension Development Host. Provision an Inco API key through Manage Language Models, verify streaming and tool follow-ups in chat, then verify cancellation and the usage display. Live inference is billed by Inco. Unit and native fixture tests use synthetic credentials and injected HTTP only.

For a local catalog check, `npm run refresh-models` refreshes public fallback metadata and writes a Changeset only when it changes. The scheduled workflow uses the same path to open a model metadata PR.

For a release, add a Changeset with `npm run changeset` and push to main. The Changesets workflow creates a version PR. Review and merge that PR to publish the VSIX through `VSCE_PAT` and create the versioned GitHub release. The initial minor Changeset prepares version 0.1.0; publishing is deferred until that release PR is merged.
