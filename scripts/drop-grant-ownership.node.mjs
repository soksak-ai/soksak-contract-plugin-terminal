import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("file grants keep host ownership separate from terminal shell syntax", () => {
  const english = readFileSync(new URL("../SPEC.md", import.meta.url), "utf8");
  const korean = readFileSync(new URL("../SPEC.ko.md", import.meta.url), "utf8");
  assert.match(english, /returns the raw `path`/);
  assert.match(english, /Terminal Kit quotes that path/);
  assert.match(korean, /raw `path`를 반환/);
  assert.match(korean, /Terminal Kit이 그 path를 quote/);
  assert.doesNotMatch(english + korean, /shellText/);
});
