import { describe, expect, it } from "vitest";
import {
  TERMINAL_PLUGIN_COMMANDS, TERMINAL_PLUGIN_CONTRACT, TERMINAL_PLUGIN_NODES,
  TERMINAL_PLUGIN_PHASES, TERMINAL_PLUGIN_COMMAND_SCHEMAS,
  validateTerminalPluginManifestCommands,
} from "./index";

describe("terminal plugin contract 0.0.3", () => {
  it("publishes one exact contract identity", () => {
    expect(TERMINAL_PLUGIN_CONTRACT).toEqual({
      id: "soksak-spec-plugin-terminal", version: "0.0.3",
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
  it("defines one input and output schema for every common command", () => {
    expect(Object.keys(TERMINAL_PLUGIN_COMMAND_SCHEMAS)).toEqual([...TERMINAL_PLUGIN_COMMANDS]);
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.send).toMatchObject({
      danger: "inject",
      input: { required: ["data"] },
      output: { required: ["sent"] },
    });
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.wait).toMatchObject({
      input: { required: ["phase"] },
      output: { required: ["phase", "recoveryOutcome", "fidelity"] },
    });
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.status.output.required).toEqual(expect.arrayContaining([
      "hostPixels", "requested", "pty", "recovery", "rendered",
    ]));
	 expect(Object.keys(TERMINAL_PLUGIN_COMMAND_SCHEMAS.wait.input.properties).sort()).toEqual([
	   "cols", "colsLessThan", "contains", "phase", "rows", "timeoutMs", "view",
	 ]);
    for (const command of TERMINAL_PLUGIN_COMMANDS) {
      const schema = TERMINAL_PLUGIN_COMMAND_SCHEMAS[command];
      expect(schema.input.additionalProperties).toBe(false);
      expect(schema.output.additionalProperties).toBe(false);
    }
  });
  it("validates a plugin's own command declaration", () => {
    const commands = TERMINAL_PLUGIN_COMMANDS.map((name) => ({
      name,
      ...(TERMINAL_PLUGIN_COMMAND_SCHEMAS[name].danger === "inject" ? { danger: "inject" } : {}),
    }));
    expect(validateTerminalPluginManifestCommands(commands)).toEqual([]);
    expect(validateTerminalPluginManifestCommands(commands.filter((value) => value.name !== "archive")))
      .toContain("missing terminal command: archive");
    expect(validateTerminalPluginManifestCommands(commands.map((value) => value.name === "send" ? { name: "send" } : value)))
      .toContain("terminal command send danger is none, expected inject");
  });
});
