import { describe, expect, it } from "vitest";
import * as contract from "./index";
import {
  TERMINAL_PLUGIN_COMMANDS, TERMINAL_PLUGIN_CONTRACT, TERMINAL_PLUGIN_NODES,
  TERMINAL_PLUGIN_PHASES, TERMINAL_PLUGIN_COMMAND_SCHEMAS, TERMINAL_SURFACE_DELIVER_VERBS,
  TERMINAL_ANSI_PALETTE,
  TERMINAL_PRESENTATION_BUDGETS,
  TERMINAL_THEME_CONTRACT,
  TERMINAL_V1_COMPONENTS,
  validateTerminalPluginManifestCommands,
} from "./index";

describe("terminal plugin contract 0.0.17", () => {
  it("publishes one exact contract identity", () => {
    expect(TERMINAL_PLUGIN_CONTRACT).toEqual({
      id: "soksak-spec-plugin-terminal", version: "0.0.17",
    });
  });
  it("defines every required lifecycle phase", () => {
    expect(TERMINAL_PLUGIN_PHASES).toHaveLength(9);
    expect(TERMINAL_PLUGIN_PHASES).toContain("archived");
    expect(TERMINAL_PLUGIN_PHASES).toContain("degraded-tail");
  });
  it("defines the common command and node surfaces", () => {
    expect(new Set(TERMINAL_PLUGIN_COMMANDS).size).toBe(23);
    expect(TERMINAL_PLUGIN_COMMANDS).toEqual(expect.arrayContaining([
      "wait", "split", "pane.close", "pane.focus", "pane.list", "pane.resize", "pane.equalize",
      "pane.maximize", "pane.broadcast", "pane.title", "scroll", "selection", "input.compose",
      "copy", "paste", "drop",
    ]));
    expect(new Set(TERMINAL_PLUGIN_NODES).size).toBe(7);
    expect(TERMINAL_PLUGIN_NODES).toContain("pane");
    expect(TERMINAL_PLUGIN_NODES).toContain("gutter");
    expect(TERMINAL_PLUGIN_NODES).toContain("terminal-drop-target");
  });
  it("publishes the complete Terminal v1 component matrix", () => {
    expect(TERMINAL_V1_COMPONENTS.map(({ id }) => id)).toEqual([
      "input-ime", "selection-clipboard", "file-image-drop", "tui-pane-control",
      "scroll", "cursor", "theme", "performance", "inline-images",
    ]);
    expect(TERMINAL_V1_COMPONENTS.slice(0, -1).every(({ level }) => level === "required")).toBe(true);
    expect(TERMINAL_V1_COMPONENTS.at(-1)?.level).toBe("capability");
    for (const component of TERMINAL_V1_COMPONENTS) {
      expect(new Set(component.commands).size).toBe(component.commands.length);
      expect(component.commands.every((command) => TERMINAL_PLUGIN_COMMANDS.includes(command))).toBe(true);
      expect(component.nodes.every((node) => TERMINAL_PLUGIN_NODES.includes(node))).toBe(true);
      expect(component.status.length).toBeGreaterThan(0);
      expect(component.events.length).toBeGreaterThan(0);
    }
  });
  it("defines base, override, effective and event state for terminal colors", () => {
    const theme = TERMINAL_V1_COMPONENTS.find(({ id }) => id === "theme");
    expect(theme).toMatchObject({
      status: ["themeMode", "baseTheme", "terminalOverrides", "effectiveTheme"],
      events: ["theme.changed", "terminalColors.changed"],
    });
    const runtime = contract as unknown as Record<string, unknown>;
    expect(runtime.TERMINAL_THEME_EVENT).toBe("soksak:terminal-colors");
    expect(typeof runtime.resolveTerminalTheme).toBe("function");
    const resolve = runtime.resolveTerminalTheme as (base: unknown, overrides: unknown) => unknown;
    const base = {
      foreground: "#111111", background: "#eeeeee", cursor: "#333333",
      cursorAccent: "#eeeeee", selectionBackground: "#bbbbbb", ansi: [...TERMINAL_ANSI_PALETTE],
    };
    const ansi = Array<string | null>(256).fill(null);
    ansi[1] = "#123456";
    const overrides = {
      foreground: "#abcdef", background: null, cursor: "#654321", ansi,
    };
    const effective = resolve(base, overrides) as { foreground: string; background: string; cursor: string; ansi: string[] };
    expect(effective).toMatchObject({
      foreground: "#abcdef", background: "#eeeeee", cursor: "#654321",
    });
    expect(effective.ansi[1]).toBe("#123456");
    expect((resolve(base, { foreground: null, background: null, cursor: null, ansi: Array(256).fill(null) }) as { foreground: string }).foreground)
      .toBe("#111111");
    const changedBase = { ...base, foreground: "#222222", background: "#101010" };
    expect(resolve(changedBase, overrides)).toMatchObject({ foreground: "#abcdef", background: "#101010" });
    const empty = (runtime.emptyTerminalThemeOverrides as () => { ansi: Array<string | null> })();
    expect(empty.ansi).toHaveLength(256);
    expect(empty.ansi.every((value) => value === null)).toBe(true);
    expect(() => resolve({ ...base, foreground: "#ABCDEF" }, empty)).toThrow(/lowercase #rrggbb/);
    expect(() => resolve(base, { ...empty, ansi: [] })).toThrow(/256 entries/);
  });
  it("defines the deliver verbs of the native surface door", () => {
    expect(TERMINAL_SURFACE_DELIVER_VERBS).toEqual([
      "snapshot", "state", "read", "scroll", "pointer", "wheel", "selection", "focus", "input", "theme", "stop", "archive",
    ]);
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
      bracketedPaste: true,
      selection: { active: true, text: "selected" },
      clipboardPermission: { read: true, write: true },
      drop: {
        fileGrantState: "available",
        last: { accepted: 1, refused: 0, mode: "path" },
      },
      cursorVisible: true, cursorActive: true, cursorShape: "bar", cursorBlinking: true,
      cursorAnimation: { intervalMs: 750, phase: "on" }, cursorRow: 0, cursorColumn: 0,
      mountedAtUnixMs: 1, firstVisibleFrameAtUnixMs: 2, firstFocusableInputAtUnixMs: 2,
      lastRenderedAtUnixMs: 3, lastFocusedAtUnixMs: 3, lastInputAtUnixMs: 4, lastPtyWriteAtUnixMs: 5,
      lastRenderDurationMs: 1, maxRenderDurationMs: 1, lastInputToPtyWriteMs: 1,
      themeMode: "dark",
      baseTheme: {
        foreground: "#eeeeec", background: "#1e1e1e", cursor: "#ffffff",
        cursorAccent: "#1e1e1e", selectionBackground: "#555753", ansi: [...TERMINAL_ANSI_PALETTE],
      },
      terminalOverrides: { foreground: null, background: null, cursor: null, ansi: Array(256).fill(null) },
      effectiveTheme: {
        foreground: "#eeeeec", background: "#1e1e1e", cursor: "#ffffff",
        cursorAccent: "#1e1e1e", selectionBackground: "#555753", ansi: [...TERMINAL_ANSI_PALETTE],
      },
    };
    expect(status.effectiveTheme.foreground).toBe("#eeeeec");
    expect(status.drop.last?.accepted).toBe(1);
    expect(status.cursorAnimation).toEqual({ intervalMs: 750, phase: "on" });
  });
  it("admits surface delivery beside bytes and frame", () => {
    const deliveries: Array<import("./index").TerminalPresentationStatus["delivery"]> = [
      "bytes", "frame", "surface",
    ];
    expect(deliveries).toHaveLength(3);
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
    expect(validateTerminalPluginManifestCommands(commands.map((value) => value.name === "send" ? { name: "send" } : value))
      .filter((error) => error === "terminal command send danger is none, expected inject")).toHaveLength(1);
    expect(validateTerminalPluginManifestCommands(commands.map((value) => value.name === "input.compose" ? { name: "input.compose" } : value)))
      .toContain("terminal command input.compose danger is none, expected inject");
  });
});
