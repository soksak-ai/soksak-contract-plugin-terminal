import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8").replace(/\s+/g, " ");

test("the native surface section names its proxy nodes and deliver verbs", () => {
  const spec = read("SPEC.md");
  assert.match(spec, /`terminal-screen\/<k>` is a document proxy/);
  assert.match(spec, /`snapshot`, `state`, `read`, `scroll`, `pointer`, `wheel`, `selection`, `focus`, `input`, `theme`, `stop` and `archive`/);
  assert.match(spec, /unknown verb is refused by name/i);
});

test("the Korean contract carries the same native surface rules", () => {
  const spec = read("SPEC.ko.md");
  assert.match(spec, /`terminal-screen\/<k>`는 그려진 표면의 문서 proxy/);
  assert.match(spec, /`snapshot`, `state`, `read`, `scroll`, `pointer`, `wheel`, `selection`, `focus`, `input`, `theme`, `stop`, `archive`/);
  assert.match(spec, /모르는 verb는 이름과 함께 거부/);
});
