# soksak-contract-plugin-terminal

Shared behavior contract for terminal plugins implementing
`soksak-spec-plugin-terminal` 0.0.7.

This repository owns the common lifecycle phases, command schemas, public status fields and exposed
node identifiers. It does not own plugin manifests, terminal rendering, provider selection or PTY
transport. Those remain with `soksak-spec`, terminal plugins, settings and sidecars respectively.

## Renderer parity

Every renderer publishes the same 256-entry ANSI palette and the same `presentation` status through
`status`, `recovery-status`, and `soksak:terminal-status`. The status separates delivery mode,
mount/ready/render/input/PTY-write sequences, focus, cursor visibility/activity/position, and the
timestamps needed to measure first paint and input-to-write latency. Provider-specific renderers may
produce frames or bytes, but they do not define a second color, focus, cursor, or observability
contract.

The presentation artifact also owns the semantic mapping from the host's public theme tokens to
terminal foreground, background, cursor, cursor-accent, and selection roles. Every live terminal
publishes the resolved five-role theme in `presentation.theme`. Its `terminal-screen` node exposes
the computed foreground/background plus the three declared terminal custom properties, so an
installed-product test can compare actual DOM styling without reading a renderer's private DOM.

The four public DOM nodes remain `terminal-root`, `terminal-screen`, `terminal-input`, and
`terminal-restore-status`. A consumer addresses those declared nodes and commands; it does not read a
renderer implementation, private selector, or sibling repository.

## Verification

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
```
