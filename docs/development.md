# Development and releases

## Local workflow

Use Node.js 22+ and npm; `package-lock.json` is authoritative.

```bash
npm ci
npm run check
npm run package
```

Tests are colocated under `src/` and use `node:test`. Network and credential paths use injected fakes. `npm run package` validates the project and builds an installable VSIX. Install it with:

```bash
code --install-extension inco-copilot-chat-<version>.vsix --force
```

Press F5 for an Extension Development Host. Provision an Inco key through Manage Language Models, test streaming and tool-result follow-ups, then cancellation, model controls, and usage. Unit and native fixtures use synthetic credentials; live upstream inference is a separate billed check.

## Capability probes

Run the explicit probe script with a local environment file or an existing `INCO_API_KEY`. It sends synthetic arithmetic requests to every public model and records only status, reasoning/answer counts, completion state, and supported-control observations. It never saves keys, prompts, response text, tool arguments, or account identifiers. Keep reports outside the repository.

```bash
node --env-file=.env scripts/probe-models.mjs --report-file /tmp/inco-probes.json
```

An HTTP 200 proves request acceptance. It does not prove that an effort changes reasoning depth or that a thinking flag disables reasoning. Compare the observed reasoning channel and completion behavior before exposing a control. Permission, balance, timeout, and server failures remain unresolved capabilities.

## Model resync

`npm run refresh-models` refreshes public fallback metadata and writes a Changeset only when it changes. The weekly workflow uses that path to open a metadata PR. Account-private entitlements never enter the public snapshot. Reasoning profiles require explicit probe review; catalog refreshes do not widen them from family-name guesses.

## Release workflow

User-visible changes include a Changeset:

```bash
npm run changeset
```

Changesets maintains a version PR on `main`. The initial major Changeset prepares **1.0.0**. Merging that PR publishes to the Visual Studio Marketplace using the repository's `VSCE_PAT` secret and attaches the VSIX to a GitHub release. Existing version tags prevent duplicate publication; the version command synchronizes the lockfile.

The package contains compiled runtime files, Marketplace metadata, the changelog, license, README, and icon. Source, tests, maps, repository automation, docs, secrets, and local artifacts are excluded by `.vscodeignore`.

## References

- [Inco API documentation](https://platform.inco.ai/docs)
- [Public model directory](https://platform.inco.ai/models)
- [Inco privacy policy](https://inco.ai/legal/privacy/)
