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
The same node exposes all 256 indexed colours as `${ansiPrefix}<index>` properties. Captures remain
visual-review evidence; automated colour parity reads this public computed-style surface instead of
treating screenshot pixels as a pass/fail oracle.

The four public DOM nodes remain `terminal-root`, `terminal-screen`, `terminal-input`, and
`terminal-restore-status`. A consumer addresses those declared nodes and commands; it does not read a
renderer implementation, private selector, or sibling repository.

## Verification

The package has no `@soksak` dependency, so `REGISTRY` is optional on every `make` invocation.

```sh
make verify
```

## Release

`OUT` and `REGISTRY` are accepted from the make command line only; a value from the environment is
refused. `OUT` must be an absolute directory and `REGISTRY` an absolute `http://` or `https://` URL.
OUT and REGISTRY are accepted from the make command line only; a value from the environment is refused
by name. GNU make's own environment channels (`MAKEFLAGS`, `GNUMAKEFLAGS`, `MAKEFILES`, `-e`) are
outside the Makefile's control and are not refused; setting them is a deliberate act of the caller.

```sh
make release OUT=/absolute/dir
make publish OUT=/absolute/dir REGISTRY=http://host:port/
```

`release` runs `verify`, packs, and prints two digests:

```sh
pnpm pack --pack-destination "$(OUT)"
shasum -a 256 "<tarball>"
gunzip -c "<tarball>" | shasum -a 256
```

gzip bytes differ between zlib builds, so reproducibility of a tarball is judged on the digest of
the decompressed tar stream. The tarball digest identifies the exact file uploaded. The tarball
bytes in the registry are the release identity for consumers.

`publish` runs `release`, then uploads that exact tarball:

```sh
pnpm publish "<tarball>" --registry "$(REGISTRY)" --@soksak:registry="$(REGISTRY)" --@soksak-ai:registry="$(REGISTRY)" --no-git-checks
```

When `REGISTRY` is given, `prepare` installs both `@soksak` and `@soksak-ai` scopes from that
registry with the release-age delay disabled, so a version published to it moments ago resolves. A
failed install exits with the pnpm status. After a successful install `pnpm-workspace.yaml` must be
unchanged; a change exits 65:

```sh
pnpm install --frozen-lockfile --@soksak:registry=$(REGISTRY) --@soksak-ai:registry=$(REGISTRY) --config.minimum-release-age=0
```
