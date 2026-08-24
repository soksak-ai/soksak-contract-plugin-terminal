import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { TERMINAL_ANSI_PALETTE, TERMINAL_PRESENTATION_BUDGETS } from "./index";

describe("portable terminal presentation contract", () => {
  it("publishes the palette construction and latency budgets as data", () => {
    const artifact = JSON.parse(readFileSync(new URL("../presentation.json", import.meta.url), "utf8"));
    expect(artifact).toEqual({
      version: 1,
      ansi: {
        base: TERMINAL_ANSI_PALETTE.slice(0, 16),
        cube: [0, 95, 135, 175, 215, 255],
        grayscale: { start: 8, step: 10, count: 24 },
      },
      budgets: TERMINAL_PRESENTATION_BUDGETS,
    });
  });
});
