import { describe, expect, it } from "vitest";
import {
  TERMINAL_PLUGIN_COMMANDS, TERMINAL_PLUGIN_CONTRACT, TERMINAL_PLUGIN_NODES,
  TERMINAL_PLUGIN_PHASES,
} from "./index";

describe("terminal plugin contract 0.0.1", () => {
  it("publishes one exact contract identity", () => {
    expect(TERMINAL_PLUGIN_CONTRACT).toEqual({
      id: "soksak-spec-plugin-terminal", version: "0.0.1",
    });
  });
  it("defines every required lifecycle phase", () => {
    expect(TERMINAL_PLUGIN_PHASES).toHaveLength(9);
    expect(TERMINAL_PLUGIN_PHASES).toContain("archived");
    expect(TERMINAL_PLUGIN_PHASES).toContain("degraded-tail");
  });
  it("defines the common command and node surfaces", () => {
    expect(new Set(TERMINAL_PLUGIN_COMMANDS).size).toBe(8);
    expect(TERMINAL_PLUGIN_COMMANDS).toContain("wait");
    expect(new Set(TERMINAL_PLUGIN_NODES).size).toBe(4);
  });
});
