# soksak-contract-plugin-terminal

Shared behavior contract for terminal plugins implementing
`soksak-spec-plugin-terminal` 0.0.3.

This repository owns the common lifecycle phases, command schemas, public status fields and exposed
node identifiers. It does not own plugin manifests, terminal rendering, provider selection or PTY
transport. Those remain with `soksak-spec`, terminal plugins, settings and sidecars respectively.

## Verification

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
```
