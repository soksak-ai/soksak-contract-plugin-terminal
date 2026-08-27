import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8").replace(/\s+/g, " ");

test("read is independent of renderer cache retention", () => {
  const spec = read("SPEC.md");
  assert.match(spec, /`read` returns the addressed pane's current viewport/);
  assert.match(spec, /Reading history requires `scroll` followed by `read`/);
  assert.match(spec, /renderer cache retention never changes the answer/);
});

test("the Korean contract has the same read rule and version", () => {
  const spec = read("SPEC.ko.md");
  assert.match(spec, /버전은 `0\.0\.9`/);
  assert.match(spec, /`read`는 지정한 pane의 현재 viewport를 반환/);
  assert.match(spec, /cache 보유 상태는 응답을 바꾸지 않습니다/);
});
