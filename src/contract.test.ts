import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  TERMINAL_PLUGIN_COMMANDS, TERMINAL_PLUGIN_CONTRACT, TERMINAL_PLUGIN_NODES,
  TERMINAL_PLUGIN_PHASES, TERMINAL_PLUGIN_COMMAND_SCHEMAS,
  TERMINAL_ANSI_PALETTE,
  TERMINAL_PRESENTATION_BUDGETS,
  TERMINAL_THEME_CONTRACT,
  validateTerminalPluginManifestCommands,
} from "./index";

describe("terminal plugin contract 0.0.8", () => {
  it("defines read independently of renderer cache retention", () => {
    const spec = readFileSync(new URL("../SPEC.md", import.meta.url), "utf8");
    expect(spec).toContain("`read` returns the addressed pane's current viewport");
    expect(spec).toContain("Reading history requires `scroll` followed by `read`");
    expect(spec).toContain("cache retention never changes the answer");
  });
  it("keeps the Korean contract on the same read rule and version", () => {
    const spec = readFileSync(new URL("../SPEC.ko.md", import.meta.url), "utf8");
    expect(spec).toContain("버전은 `0.0.8`");
    expect(spec).toContain("`read`는 지정한 pane의 현재 viewport를 반환");
    expect(spec).toContain("cache 보유 상태는 응답을 바꾸지 않습니다");
  });
  it("publishes one exact contract identity", () => {
    expect(TERMINAL_PLUGIN_CONTRACT).toEqual({
      id: "soksak-spec-plugin-terminal", version: "0.0.8",
    });
  });
  it("defines every required lifecycle phase", () => {
    expect(TERMINAL_PLUGIN_PHASES).toHaveLength(9);
    expect(TERMINAL_PLUGIN_PHASES).toContain("archived");
    expect(TERMINAL_PLUGIN_PHASES).toContain("degraded-tail");
  });
  it("defines the common command and node surfaces", () => {
    expect(new Set(TERMINAL_PLUGIN_COMMANDS).size).toBe(20);
    expect(TERMINAL_PLUGIN_COMMANDS).toEqual(expect.arrayContaining([
      "wait", "split", "pane.close", "pane.focus", "pane.list", "pane.resize", "pane.equalize",
      "pane.maximize", "pane.broadcast", "pane.title", "scroll", "selection", "input.compose",
    ]));
    expect(new Set(TERMINAL_PLUGIN_NODES).size).toBe(6);
    expect(TERMINAL_PLUGIN_NODES).toContain("pane");
    expect(TERMINAL_PLUGIN_NODES).toContain("gutter");
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
      output: { required: ["phase", "recoveryOutcome", "fidelity", "presentation", "pane"] },
    });
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.status.output.required).toEqual(expect.arrayContaining([
      "hostPixels", "requested", "pty", "recovery", "rendered", "operation", "presentation",
      "view", "pane", "panes",
    ]));
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.status.output.properties.panes).toBe("array");
    expect(Object.keys(TERMINAL_PLUGIN_COMMAND_SCHEMAS.wait.input.properties).sort()).toEqual([
      "cols", "colsGreaterThan", "colsLessThan", "contains", "cursorActive", "cursorVisible",
      "focusedInput", "idleMs", "pane", "phase", "rows", "timeoutMs", "view",
    ]);
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.wait.output.required).toContain("presentation");
    const viewOnly = new Set(["pane.list", "pane.equalize", "pane.broadcast"]);
    for (const command of TERMINAL_PLUGIN_COMMANDS) {
      const schema = TERMINAL_PLUGIN_COMMAND_SCHEMAS[command];
      expect(schema.input.additionalProperties).toBe(false);
      expect(schema.output.additionalProperties).toBe(false);
      expect(schema.input.properties.view).toBe("string");
      if (viewOnly.has(command)) expect(schema.input.properties).not.toHaveProperty("pane");
      else expect(schema.input.properties.pane).toBe("string");
    }
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.split).toMatchObject({
      danger: "none", input: { required: ["direction"] }, output: { required: ["view", "pane", "engineId"] },
    });
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS["input.compose"]).toMatchObject({
      danger: "inject", input: { required: ["updates", "data"], properties: { updates: "array" } },
      output: { required: ["emitted"] },
    });
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS["pane.title"].input.properties.title).toEqual(["string", "null"]);
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS.scroll.output.required).toEqual(["pane", "offset", "historySize"]);
    expect(TERMINAL_PLUGIN_COMMAND_SCHEMAS["pane.list"].output.required).toEqual([
      "view", "focused", "maximized", "broadcast", "panes",
    ]);
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
    expect(validateTerminalPluginManifestCommands(commands.filter((value) => value.name !== "split")))
      .toContain("missing terminal command: split");
    expect(validateTerminalPluginManifestCommands(commands.map((value) => value.name === "send" ? { name: "send" } : value)))
      .toContain("terminal command send danger is none, expected inject");
    expect(validateTerminalPluginManifestCommands(commands.map((value) => value.name === "input.compose" ? { name: "input.compose" } : value)))
      .toContain("terminal command input.compose danger is none, expected inject");
  });
});
