import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");

test("repository owns public metadata", () => {
  assert.equal(existsSync(join(root, "README.md")), true);
  assert.equal(existsSync(join(root, "LICENSE")), true);
  assert.equal(existsSync(join(root, "Makefile")), true);
  assert.equal(existsSync(join(root, ".node-version")), true);
  assert.equal(existsSync(join(root, "soksak-spec.ref")), false);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(
    pkg.repository.url,
    "git+https://github.com/soksak-ai/soksak-contract-plugin-terminal.git",
  );
  const contract = JSON.parse(readFileSync(join(root, "contract.json"), "utf8"));
  assert.deepEqual(contract, { id: "soksak-contract-plugin-terminal", version: pkg.version });
  assert.equal(pkg.version, contract.version);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "release-files.json"), "utf8")), [
    "LICENSE", "README.md", "SPEC.ko.md", "SPEC.md", "contract.json", "package.json", "pnpm-lock.yaml",
    "presentation.json", "src/contract.test.ts", "src/index.ts", "src/pane-key.ts", "src/presentation-artifact.test.ts", "tsconfig.json",
  ]);
  const workflow = readFileSync(join(root, ".github/workflows/release.yml"), "utf8");
  assert.match(pkg.engines.node, /^\d+\.\d+\.\d+$/);
  assert.match(pkg.packageManager, /^pnpm@\d+\.\d+\.\d+$/);
  assert.equal(readFileSync(join(root, ".node-version"), "utf8").trim(), pkg.engines.node);
  assert.doesNotMatch(workflow, /repository: soksak-ai\/soksak-spec/);
  assert.match(workflow, /inputs\.spec_url|inputs\.spec_sha256/);
  assert.match(workflow, /make verify/);
  assert.match(workflow, /node-version-file: component\/[.]node-version/);
  assert.match(workflow, /package_json_file: component\/package\.json/);
  assert.match(workflow, /immutable-releases.*enforced_by_owner/);
});

test("package publishes by name and version", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.private, false);
  assert.equal("publishConfig" in pkg, false);
  assert.deepEqual(pkg.files, ["src", "!src/*.test.ts", "contract.json", "presentation.json", "LICENSE", "README*", "SPEC*"]);
  assert.deepEqual(pkg.exports, { ".": "./src/index.ts" });
  for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
      if (name.startsWith("@soksak/")) assert.match(spec, /^\d+\.\d+\.\d+$/, `${section}.${name}`);
    }
  }
});

const makefile = readFileSync(join(root, "Makefile"), "utf8");
const makeVariable = (name) => {
  const match = makefile.match(new RegExp(`^${name} = (.+)$`, "m"));
  assert.ok(match, name);
  return match[1];
};
// A parent make exports OUT, REGISTRY, and MAKEFLAGS to recipe processes; a bare PATH keeps them out.
const run = (args, env = {}, cwd = root) =>
  spawnSync("make", args, { cwd, encoding: "utf8", env: { PATH: process.env.PATH, ...env } });
const refused = (result, message) => {
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, message);
  assert.doesNotMatch(result.stdout, /BUILD_ENVIRONMENT_READY/);
};
// A package.json ahead of pnpm-lock.yaml fails `pnpm install --frozen-lockfile` before any registry request.
const copyWithOutdatedLockfile = () => {
  const copy = mkdtempSync(join(tmpdir(), "soksak-contract-plugin-terminal-"));
  mkdirSync(join(copy, "scripts"));
  for (const name of ["Makefile", ".node-version", "pnpm-lock.yaml", "pnpm-workspace.yaml", "scripts/check-build-environment.sh"]) {
    copyFileSync(join(root, name), join(copy, name));
  }
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  pkg.devDependencies["left-pad"] = "1.3.0";
  writeFileSync(join(copy, "package.json"), JSON.stringify(pkg));
  return copy;
};

test("Makefile packages, attests, and publishes from command-line inputs", () => {
  assert.doesNotMatch(makefile, /\bnpm (pack|publish)\b/);
  assert.doesNotMatch(makefile, /PUBLISH_FLAGS/);
  assert.equal(
    makeVariable("registry_flags"),
    "--@soksak:registry=$(REGISTRY) --@soksak-ai:registry=$(REGISTRY) --config.minimum-release-age=0",
  );
  assert.equal(
    makeVariable("publish_flags"),
    '--registry "$(REGISTRY)" --@soksak:registry="$(REGISTRY)" --@soksak-ai:registry="$(REGISTRY)" --no-git-checks',
  );
  assert.match(makefile, /^prepare: guard preflight$/m);
  assert.match(makefile, /pnpm install --frozen-lockfile \$\(if \$\(findstring command line,\$\(origin REGISTRY\)\),\$\(registry_flags\)\)/);
  assert.match(makefile, /shasum -a 256 pnpm-workspace\.yaml/);
  assert.match(makefile, /^SDK_VERSION := 0\.0\.18$/m);
  assert.match(makefile, /^release: require-tooling require-out verify$/m);
  assert.match(makefile, /soksak-sdk package --root/);
  assert.match(makefile, /^attest: require-tooling require-out release$/m);
  assert.match(makefile, /soksak-sdk attest --release-dir/);
  assert.match(makefile, /^publish: require-registry require-out attest$/m);
  assert.match(makefile, /pnpm publish "\$\$archive" \$\(publish_flags\)/);
  refused(run(["release"]), /OUT/);
  refused(run(["release", "OUT=out"]), /OUT/);
  refused(run(["release", "OUT="]), /OUT/);
  refused(run(["publish", "OUT=/nonexistent/out"]), /REGISTRY/);
  refused(run(["publish", "OUT=/nonexistent/out", "REGISTRY=localhost:4873"]), /REGISTRY/);
  refused(run(["publish", "OUT=/nonexistent/out", "REGISTRY="]), /REGISTRY/);
  refused(run(["release"], { OUT: "/nonexistent/out" }), /OUT.*environment/);
  refused(run(["publish", "OUT=/nonexistent/out"], { REGISTRY: "http://127.0.0.1:4873" }), /REGISTRY.*environment/);
  refused(run(["prepare"], { REGISTRY: "http://127.0.0.1:4873" }), /REGISTRY.*environment/);
  refused(run(["verify"], { OUT: "/nonexistent/out" }), /OUT.*environment/);
});

test("Makefile accepts REGISTRY optionally because the package has no @soksak dependency", () => {
  const guard = run(["guard", "OUT=/nonexistent/out"]);
  assert.equal(guard.status, 0, guard.stderr);
  assert.doesNotMatch(guard.stderr, /REGISTRY/);
  const copy = copyWithOutdatedLockfile();
  try {
    const result = run(["release", `OUT=${join(copy, "out")}`], {}, copy);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /BUILD_ENVIRONMENT_READY/);
    assert.match(result.stdout + result.stderr, /ERR_PNPM_OUTDATED_LOCKFILE/);
    assert.match(result.stderr, /^make: \*\*\* \[prepare\] Error 1$/m);
    assert.doesNotMatch(result.stderr, /Error 65/);
    assert.doesNotMatch(result.stderr, /REGISTRY/);
    assert.doesNotMatch(result.stdout + result.stderr, /rewrote pnpm-workspace\.yaml/);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
  assert.match(makefile, /node -p '[^']*dependencies[^']*devDependencies[^']*peerDependencies/);
});

test("prepare exits with the pnpm install status and no workspace message when the install fails", () => {
  const copy = copyWithOutdatedLockfile();
  try {
    const result = run(["prepare", "REGISTRY=http://127.0.0.1:9"], {}, copy);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /BUILD_ENVIRONMENT_READY/);
    assert.match(result.stdout + result.stderr, /ERR_PNPM_OUTDATED_LOCKFILE/);
    assert.match(result.stderr, /^make: \*\*\* \[prepare\] Error 1$/m);
    assert.doesNotMatch(result.stderr, /Error 65/);
    assert.doesNotMatch(result.stdout + result.stderr, /rewrote pnpm-workspace\.yaml/);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
  assert.doesNotMatch(makefile, /pnpm install[^\n]* && /);
});

test("README documents the Makefile release commands verbatim", () => {
  const install = `pnpm install --frozen-lockfile ${makeVariable("registry_flags")}`;
  const publish = `pnpm publish "<tarball>" ${makeVariable("publish_flags")}`;
  for (const name of ["README.md"]) {
    const readme = readFileSync(join(root, name), "utf8");
    assert.ok(readme.includes("make release OUT=/absolute/dir COMMIT=<40-hex>"), name);
    assert.ok(readme.includes("make attest OUT=/absolute/dir COMMIT=<40-hex>"), name);
    assert.ok(readme.includes("make publish OUT=/absolute/dir COMMIT=<40-hex> REGISTRY=http://host:port/"), name);
    assert.ok(readme.includes(install), name);
    assert.ok(readme.includes("soksak-sdk package"), name);
    assert.ok(readme.includes("soksak-sdk attest"), name);
    assert.ok(readme.includes(publish), name);
  }
});

test("preflight judges the effective repository-selected pnpm", () => {
  const source = readFileSync(join(root, "scripts/check-build-environment.sh"), "utf8");
  assert.match(source, /pnpm_actual=.*pnpm --version/);
  assert.doesNotMatch(source, /pnpm_executable|pnpmExecutable/);
});
