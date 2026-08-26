The public DOM nodes are `terminal-root`, `terminal-screen`, `terminal-input`,
`terminal-restore-status`, `pane`, and `gutter`. A pane with index `k` exposes them as `<id>/<k>`
(`terminal-screen/2`, `pane/2`, `gutter/2/right`). A consumer addresses those declared nodes and
commands; it does not read a renderer implementation, private selector, or sibling repository.

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
