import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (name) => readFileSync(join(root, name), "utf8");

test("the canonical and Korean documents keep the Terminal v1 completeness floor", () => {
  for (const name of ["SPEC.md", "SPEC.ko.md"]) {
    const document = read(name);
    for (const required of [
      "Terminal v1", "input", "clipboard", "drop", "TUI", "scroll", "cursor",
      "theme", "performance", "inline image", "TMUX_PANE", "split-window", "respawn-pane",
      "send-keys", "capture-pane", "kill-pane",
    ]) assert.ok(document.includes(required), `${name} is missing ${required}`);
    assert.doesNotMatch(document, /\/Users\/max\/ai|\bcc2\b/);
  }
});

test("the TUI compatibility profile fails closed instead of guessing a focused pane", () => {
  const canonical = read("SPEC.md");
  assert.match(canonical, /unknown command is refused/i);
  assert.match(canonical, /not a fallback to the currently focused pane/i);
  assert.match(canonical, /absolute, authenticated Soksak CLI/i);
});

test("the cursor component has a closed public status surface", () => {
  const source = read("src/index.ts");
  for (const required of [
    'export type TerminalCursorShape = "block" | "underline" | "bar"',
    'cursorShape: TerminalCursorShape;',
    'cursorBlinking: boolean;',
    'cursorAnimation: TerminalCursorAnimationStatus;',
    'intervalMs: number;',
    'phase: "steady" | "on" | "off";',
  ]) assert.ok(source.includes(required), `cursor status is missing ${required}`);
});
