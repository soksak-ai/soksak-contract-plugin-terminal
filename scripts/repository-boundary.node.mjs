import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  assert.deepEqual(contract, { id: "soksak-contract-plugin-terminal", version: "0.0.7" });
  assert.equal(pkg.version, contract.version);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "release-files.json"), "utf8")), [
    "LICENSE", "README.md", "SPEC.ko.md", "SPEC.md", "contract.json", "package.json", "pnpm-lock.yaml",
    "presentation.json", "src/contract.test.ts", "src/index.ts", "src/presentation-artifact.test.ts", "tsconfig.json",
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

test("preflight judges the effective repository-selected pnpm", () => {
  const source = readFileSync(join(root, "scripts/check-build-environment.sh"), "utf8");
  assert.match(source, /pnpm_actual=.*pnpm --version/);
  assert.doesNotMatch(source, /pnpm_executable|pnpmExecutable/);
});
