import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");

test("repository owns public metadata", () => {
  assert.equal(existsSync(join(root, "README.md")), true);
  assert.equal(existsSync(join(root, "LICENSE")), true);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(
    pkg.repository.url,
    "git+https://github.com/soksak-ai/soksak-contract-plugin-terminal.git",
  );
  const contract = JSON.parse(readFileSync(join(root, "contract.json"), "utf8"));
  assert.deepEqual(contract, { id: "soksak-contract-plugin-terminal", version: "0.0.4" });
  assert.equal(pkg.version, contract.version);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "release-files.json"), "utf8")), [
    "LICENSE", "README.md", "SPEC.ko.md", "SPEC.md", "contract.json", "package.json", "pnpm-lock.yaml",
    "src/contract.test.ts", "src/index.ts", "tsconfig.json",
  ]);
  const workflow = readFileSync(join(root, ".github/workflows/release.yml"), "utf8");
  assert.match(pkg.engines.node, /^\d+\.\d+\.\d+$/);
  assert.match(pkg.packageManager, /^pnpm@\d+\.\d+\.\d+$/);
  assert.match(readFileSync(join(root, "soksak-spec.ref"), "utf8").trim(), /^[a-f0-9]{40}$/);
  assert.match(workflow, /ref: \$\{\{ steps\.spec-ref\.outputs\.commit \}\}/);
  assert.match(workflow, /node-version-file: component\/package\.json/);
  assert.match(workflow, /package_json_file: component\/package\.json/);
  assert.match(workflow, /owner-enforced immutable releases must be enabled/);
});
