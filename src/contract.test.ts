import { describe, expect, it } from "vitest";
import {
  TERMINAL_PLUGIN_COMMANDS, TERMINAL_PLUGIN_CONTRACT, TERMINAL_PLUGIN_NODES,
  TERMINAL_PLUGIN_PHASES, TERMINAL_PLUGIN_COMMAND_SCHEMAS,
  TERMINAL_ANSI_PALETTE,
  TERMINAL_PRESENTATION_BUDGETS,
  TERMINAL_THEME_CONTRACT,
  validateTerminalPluginManifestCommands,
} from "./index";

describe("terminal plugin contract 0.0.7", () => {
  it("publishes one exact contract identity", () => {
    expect(TERMINAL_PLUGIN_CONTRACT).toEqual({
      id: "soksak-spec-plugin-terminal", version: "0.0.7",
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
      "hostPixels", "requested", "pty", "recovery", "rendered", "operation", "presentation",
    ]));
	 expect(Object.keys(TERMINAL_PLUGIN_COMMAND_SCHEMAS.wait.input.properties).sort()).toEqual([
	   "cols", "colsGreaterThan", "colsLessThan", "contains", "cursorActive", "cursorVisible",
	   "focusedInput", "phase", "rows", "timeoutMs", "view",
	 ]);
	 expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.wait.output.required).toContain("presentation");
    for (const command of TERMINAL_PLUGIN_COMMANDS) {
      const schema = TERMINAL_PLUGIN_COMMAND_SCHEMAS[command];
      expect(schema.input.additionalProperties).toBe(false);
      expect(schema.output.additionalProperties).toBe(false);
    }
  });

  it("defines the canonical ANSI palette shared by every renderer", () => {
    expect(TERMINAL_ANSI_PALETTE).toHaveLength(256);
    expect(TERMINAL_ANSI_PALETTE.slice(0, 16)).toEqual([
      "#2e3436", "#cc0000", "#4e9a06", "#c4a000",
      "#3465a4", "#75507b", "#06989a", "#d3d7cf",
      "#555753", "#ef2929", "#8ae234", "#fce94f",
      "#729fcf", "#ad7fa8", "#34e2e2", "#eeeeec",
    ]);
    expect(TERMINAL_ANSI_PALETTE[16]).toBe("#000000");
    expect(TERMINAL_ANSI_PALETTE[231]).toBe("#ffffff");
    expect(TERMINAL_ANSI_PALETTE[232]).toBe("#080808");
    expect(TERMINAL_ANSI_PALETTE[255]).toBe("#eeeeee");
  });
  it("defines one host-token and public computed-style contract for every renderer", () => {
    expect(TERMINAL_THEME_CONTRACT).toEqual({
      tokens: {
        foreground: "--fg",
        background: "--card",
        cursor: "--acc",
        cursorAccent: "--card",
        selectionBackground: "--fg3",
      },
      properties: {
        cursor: "--soksak-terminal-cursor",
        cursorAccent: "--soksak-terminal-cursor-accent",
        selectionBackground: "--soksak-terminal-selection-background",
        ansiPrefix: "--soksak-terminal-ansi-",
      },
    });
  });
  it("defines renderer and input latency budgets independently of provider results", () => {
    expect(TERMINAL_PRESENTATION_BUDGETS).toEqual({
      renderMs: 1000 / 60,
      inputToPtyWriteMs: 50,
    });
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.status.output.required).toContain("presentation");
    const status: import("./index").TerminalPresentationStatus = {
      delivery: "frame", mountSequence: 1, readySequence: 1, renderSequence: 1, focusSequence: 1,
      acceptedInputSequence: 1, ptyWriteSequence: 1, focusedInput: true,
      cursorVisible: true, cursorActive: true, cursorRow: 0, cursorColumn: 0,
      mountedAtUnixMs: 1, firstVisibleFrameAtUnixMs: 2, firstFocusableInputAtUnixMs: 2,
      lastRenderedAtUnixMs: 3, lastFocusedAtUnixMs: 3, lastInputAtUnixMs: 4, lastPtyWriteAtUnixMs: 5,
      lastRenderDurationMs: 1, maxRenderDurationMs: 1, lastInputToPtyWriteMs: 1,
      theme: {
        foreground: "#eeeeec", background: "#1e1e1e", cursor: "#ffffff",
        cursorAccent: "#1e1e1e", selectionBackground: "#555753",
      },
    };
    expect(status.theme.foreground).toBe("#eeeeec");
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
