import { describe, expect, it } from "vitest";
import { PANE_KEY_RE, paneKey, parsePaneKey } from "./pane-key";

describe("pane key", () => {
  it("joins a view id and a positive index with one dot", () => {
    expect(paneKey("tab-a1b2c3", 1)).toBe("tab-a1b2c3.1");
    expect(paneKey("tab-a1b2c3", 12)).toBe("tab-a1b2c3.12");
    expect(() => paneKey("tab-a1b2c3", 0)).toThrow("positive integer");
    expect(() => paneKey("tab-a1b2c3", 1.5)).toThrow("positive integer");
    expect(() => paneKey("tab.a", 1)).toThrow("cannot form a pane key");
    expect(() => paneKey("tab a", 1)).toThrow("cannot form a pane key");
  });

  it("parses only well-formed keys", () => {
    expect(parsePaneKey("tab-a1b2c3.3")).toEqual({ viewId: "tab-a1b2c3", k: 3 });
    expect(parsePaneKey("tab-a1b2c3")).toBeNull();
    expect(parsePaneKey("tab-a1b2c3.0")).toBeNull();
    expect(parsePaneKey("tab-a1b2c3.01")).toBeNull();
    expect(parsePaneKey("a b.1")).toBeNull();
    expect(parsePaneKey("a/b.1")).toBeNull();
    expect(parsePaneKey("a\\b.1")).toBeNull();
    expect(parsePaneKey("a.b.1")).toBeNull();
    expect(PANE_KEY_RE.test("x.1")).toBe(true);
  });
});
