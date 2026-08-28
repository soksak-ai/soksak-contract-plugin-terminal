import presentation from "../presentation.json" with { type: "json" };

export * from "./pane-key";

export const TERMINAL_PLUGIN_CONTRACT = Object.freeze({
  id: "soksak-spec-plugin-terminal",
  version: "0.0.15",
} as const);

const baseAnsiPalette = presentation.ansi.base;
const hex = (value: number) => value.toString(16).padStart(2, "0");
const indexedAnsiPalette = [...baseAnsiPalette];
const cube = presentation.ansi.cube;
for (let index = 0; index < 216; index += 1) {
  const red = cube[Math.floor(index / 36) % 6];
  const green = cube[Math.floor(index / 6) % 6];
  const blue = cube[index % 6];
  indexedAnsiPalette.push(`#${hex(red)}${hex(green)}${hex(blue)}`);
}
for (let index = 0; index < presentation.ansi.grayscale.count; index += 1) {
  const channel = hex(presentation.ansi.grayscale.start + index * presentation.ansi.grayscale.step);
  indexedAnsiPalette.push(`#${channel}${channel}${channel}`);
}
export const TERMINAL_ANSI_PALETTE = Object.freeze(indexedAnsiPalette);

// One complete 60 Hz display interval, plus three intervals for input to enter the local PTY
// boundary. The portable data artifact is the owner; TypeScript consumers read the same values.
export const TERMINAL_PRESENTATION_BUDGETS = Object.freeze({ ...presentation.budgets });
export const TERMINAL_THEME_CONTRACT = Object.freeze({
  tokens: Object.freeze({ ...presentation.theme.tokens }),
  properties: Object.freeze({ ...presentation.theme.properties }),
});

export const TERMINAL_PLUGIN_PHASES = Object.freeze([
  "initializing", "preparing-recovery", "applying-snapshot", "attaching-live-stream",
  "live", "archived", "degraded-tail", "blocked", "closed",
] as const);
export type TerminalPluginPhase = (typeof TERMINAL_PLUGIN_PHASES)[number];

export type TerminalRecoveryOutcome =
  | "continued" | "archived" | "fresh" | "degraded-tail" | "blocked";
export type TerminalRecoveryFidelity = "complete" | "gapped" | "unavailable";
export type TerminalRendererProfile = "web" | "native-surface";

export const TERMINAL_PLUGIN_COMMANDS = Object.freeze([
  "status", "wait", "archive", "send", "read", "clear", "focus", "recovery-status",
  "split", "pane.close", "pane.focus", "pane.list", "pane.resize", "pane.equalize",
  "pane.maximize", "pane.broadcast", "pane.title", "scroll", "selection", "copy", "paste",
  "drop", "input.compose",
] as const);
export type TerminalPluginCommand = (typeof TERMINAL_PLUGIN_COMMANDS)[number];

type ScalarFieldType = "string" | "number" | "boolean" | "object" | "array" | "null";
type FieldType = ScalarFieldType | readonly ScalarFieldType[];
export interface TerminalCommandObjectSchema {
  properties: Readonly<Record<string, FieldType>>;
  required: readonly string[];
  additionalProperties: false;
}
export interface TerminalCommandSchema {
  danger: "none" | "inject";
  input: TerminalCommandObjectSchema;
  output: TerminalCommandObjectSchema;
}

const input = (properties: Record<string, FieldType>, required: string[] = []): TerminalCommandObjectSchema =>
  Object.freeze({ properties: Object.freeze(properties), required: Object.freeze(required), additionalProperties: false });
const output = (properties: Record<string, FieldType>, required: string[]): TerminalCommandObjectSchema =>
  input(properties, required);
const nullableString: FieldType = ["string", "null"];
const statusOutput = output({
  phase: "string", pluginId: "string", engineId: "string", rendererId: "string",
  rendererProfile: "string", recoveryOutcome: "string", fidelity: "string", failure: ["object", "null"],
  hostPixels: "object", requested: ["object", "null"], pty: ["object", "null"],
  recovery: ["object", "null"], rendered: ["object", "null"], operation: "string",
  presentation: "object", view: nullableString, pane: nullableString, panes: "array",
}, [
  "phase", "pluginId", "engineId", "rendererId", "rendererProfile", "recoveryOutcome",
  "fidelity", "failure", "hostPixels", "requested", "pty", "recovery", "rendered", "operation",
  "presentation", "view", "pane", "panes",
]);
// Every command addresses a view; most address one pane inside it.
const viewInput = (properties: Record<string, FieldType> = {}, required: string[] = []) =>
  input({ view: "string", ...properties }, required);
const paneInput = (properties: Record<string, FieldType> = {}, required: string[] = []) =>
  input({ view: "string", pane: "string", ...properties }, required);

export const TERMINAL_PLUGIN_COMMAND_SCHEMAS = Object.freeze({
  status: { danger: "none", input: paneInput(), output: statusOutput },
  wait: {
    danger: "none",
    input: paneInput({
      phase: "string", timeoutMs: "number", contains: "string",
      cols: "number", colsLessThan: "number", colsGreaterThan: "number", rows: "number",
      focusedInput: "boolean", cursorVisible: "boolean", cursorActive: "boolean", idleMs: "number",
    }, ["phase"]),
    output: output({
      phase: "string", recoveryOutcome: "string", fidelity: "string", failure: ["object", "null"],
      cols: "number", rows: "number", operation: "string", presentation: "object", pane: nullableString,
    }, ["phase", "recoveryOutcome", "fidelity", "presentation", "pane"]),
  },
  archive: {
    danger: "none", input: paneInput(),
    output: output({ archived: "boolean", bytes: "number" }, ["archived"]),
  },
  send: {
    danger: "inject", input: paneInput({ data: "string" }, ["data"]),
    output: output({ sent: ["number", "boolean"] }, ["sent"]),
  },
  read: {
    danger: "none", input: paneInput({ lines: "number" }),
    output: output({ text: "string" }, ["text"]),
  },
  clear: {
    danger: "none", input: paneInput(), output: output({ cleared: "boolean" }, ["cleared"]),
  },
  focus: {
    danger: "none", input: paneInput(), output: output({ focused: "boolean" }, ["focused"]),
  },
  "recovery-status": { danger: "none", input: paneInput(), output: statusOutput },
  split: {
    danger: "none", input: paneInput({ direction: "string", command: "string" }, ["direction"]),
    output: output({ view: nullableString, pane: nullableString, engineId: "string" }, ["view", "pane", "engineId"]),
  },
  "pane.close": {
    danger: "none", input: paneInput(),
    output: output({ closed: "boolean", focused: nullableString }, ["closed", "focused"]),
  },
  "pane.focus": {
    danger: "none", input: paneInput({ dir: "string", cycle: "number" }),
    output: output({ focused: nullableString }, ["focused"]),
  },
  "pane.list": {
    danger: "none", input: viewInput(),
    output: output({
      view: nullableString, focused: nullableString, maximized: nullableString, broadcast: "boolean", panes: "array",
    }, ["view", "focused", "maximized", "broadcast", "panes"]),
  },
  "pane.resize": {
    danger: "none", input: paneInput({ side: "string", px: "number", cells: "number" }, ["side"]),
    output: output({ applied: "boolean" }, ["applied"]),
  },
  "pane.equalize": {
    danger: "none", input: viewInput(), output: output({ applied: "boolean" }, ["applied"]),
  },
  "pane.maximize": {
    danger: "none", input: paneInput(), output: output({ maximized: nullableString }, ["maximized"]),
  },
  "pane.broadcast": {
    danger: "none", input: viewInput({ on: "boolean" }, ["on"]),
    output: output({ broadcast: "boolean" }, ["broadcast"]),
  },
  "pane.title": {
    danger: "none", input: paneInput({ title: nullableString }, ["title"]),
    output: output({ title: nullableString }, ["title"]),
  },
  scroll: {
    danger: "none", input: paneInput({ lines: "number", offset: "number", edge: "string" }),
    output: output({ pane: nullableString, offset: "number", historySize: "number" }, ["pane", "offset", "historySize"]),
  },
  selection: {
    danger: "none", input: paneInput(),
    output: output({ pane: nullableString, text: "string" }, ["pane", "text"]),
  },
  copy: {
    danger: "none", input: paneInput(),
    output: output({ pane: nullableString, text: "string", copied: "boolean" }, ["pane", "text", "copied"]),
  },
  paste: {
    danger: "inject", input: paneInput({ data: "string" }),
    output: output({ pane: nullableString, pasted: "boolean", sent: "number" }, ["pane", "pasted", "sent"]),
  },
  drop: {
    danger: "inject", input: paneInput({ grants: "array", mode: "string" }, ["grants"]),
    output: output({ pane: nullableString, accepted: "number", mode: "string" }, ["pane", "accepted", "mode"]),
  },
  "input.compose": {
    danger: "inject", input: paneInput({ updates: "array", data: "string" }, ["updates", "data"]),
    output: output({ emitted: "number" }, ["emitted"]),
  },
} as const satisfies Record<TerminalPluginCommand, TerminalCommandSchema>);

// Instance nodes are "<id>/<k>" for the pane with index k ("terminal-screen/2", "pane/2",
// "gutter/2/right"). A view laid out as one bare pane keeps the bare ids.
export const TERMINAL_PLUGIN_NODES = Object.freeze([
  "terminal-root", "terminal-screen", "terminal-input", "terminal-drop-target",
  "terminal-restore-status", "pane", "gutter",
] as const);

export interface TerminalV1Component {
  id: string;
  level: "required" | "capability";
  commands: readonly TerminalPluginCommand[];
  status: readonly string[];
  events: readonly string[];
  nodes: readonly (typeof TERMINAL_PLUGIN_NODES)[number][];
}

const component = (value: TerminalV1Component): TerminalV1Component => Object.freeze({
  ...value,
  commands: Object.freeze([...value.commands]),
  status: Object.freeze([...value.status]),
  events: Object.freeze([...value.events]),
  nodes: Object.freeze([...value.nodes]),
});

export const TERMINAL_V1_COMPONENTS = Object.freeze([
  component({
    id: "input-ime", level: "required",
    commands: ["send", "input.compose", "focus"],
    status: ["focusedInput", "acceptedInputSequence", "ptyWriteSequence", "bracketedPaste"],
    events: ["input.accepted", "pty.write", "composition.changed"],
    nodes: ["terminal-input"],
  }),
  component({
    id: "selection-clipboard", level: "required",
    commands: ["selection", "copy", "paste"],
    status: ["selection", "clipboardPermission"],
    events: ["selection.changed", "clipboard.copied", "clipboard.pasted"],
    nodes: ["terminal-screen", "terminal-input"],
  }),
  component({
    id: "file-image-drop", level: "required",
    commands: ["drop"],
    status: ["lastDrop", "fileGrantState"],
    events: ["drop.accepted", "drop.refused"],
    nodes: ["terminal-drop-target"],
  }),
  component({
    id: "tui-pane-control", level: "required",
    commands: ["split", "send", "read", "pane.list", "pane.focus", "pane.close"],
    status: ["panes", "focusedPane", "compatibilityProfile"],
    events: ["pane.created", "pane.focused", "pane.closed"],
    nodes: ["pane", "gutter"],
  }),
  component({
    id: "scroll", level: "required",
    commands: ["scroll", "read"],
    status: ["historySize", "offset", "followMode"],
    events: ["viewport.changed", "output.followed"],
    nodes: ["terminal-screen"],
  }),
  component({
    id: "cursor", level: "required",
    commands: ["focus"],
    status: ["cursorVisible", "cursorActive", "cursorShape", "cursorBlinking", "cursorAnimation"],
    events: ["cursor.changed", "focus.changed"],
    nodes: ["terminal-screen", "terminal-input"],
  }),
  component({
    id: "theme", level: "required",
    commands: ["status"],
    status: ["themeMode", "baseTheme", "terminalOverrides", "effectiveTheme"],
    events: ["theme.changed", "terminalColors.changed"],
    nodes: ["terminal-root", "terminal-screen"],
  }),
  component({
    id: "performance", level: "required",
    commands: ["status"],
    status: ["renderDuration", "inputToWriteLatency", "damageRows", "cacheUsage", "gapCount"],
    events: ["frame.applied", "gap.observed"],
    nodes: ["terminal-screen"],
  }),
  component({
    id: "inline-images", level: "capability",
    commands: ["status"],
    status: ["inlineImageProtocols", "inlineImageLimits"],
    events: ["image.presented", "image.refused"],
    nodes: ["terminal-screen"],
  }),
] as const satisfies readonly TerminalV1Component[]);

// Verbs the app's surface door accepts for one native terminal surface. `input` is an
// injection like `send`; an unknown verb is refused by name, never mapped to a nearest one.
export const TERMINAL_SURFACE_DELIVER_VERBS = Object.freeze([
  "snapshot", "state", "read", "scroll", "selection", "focus", "input", "theme", "stop", "archive",
] as const);
export type TerminalSurfaceDeliverVerb = (typeof TERMINAL_SURFACE_DELIVER_VERBS)[number];

export interface TerminalPluginFailure { code: string; message: string }
export interface TerminalSize { cols: number; rows: number }
export interface TerminalSequencedSize extends TerminalSize { eventSequence: number }
export interface TerminalSourceObservation extends TerminalSequencedSize { outputSequence: number }
export interface TerminalRecoveryObservation extends TerminalSourceObservation { gaps: number }
export interface TerminalRenderedObservation extends TerminalSize { outputSequence: number }
export interface TerminalHostPixels { width: number; height: number }
export interface TerminalResizeStatus {
  hostPixels: TerminalHostPixels;
  requested: TerminalSize | null;
  pty: TerminalSourceObservation | null;
  recovery: TerminalRecoveryObservation | null;
  rendered: TerminalRenderedObservation | null;
  operation: string;
}
export interface TerminalSelectionStatus {
  active: boolean;
  text: string;
}
export interface TerminalClipboardPermissionStatus {
  read: boolean;
  write: boolean;
}
export type TerminalDropMode = "path" | "inline";
export interface TerminalDropResultStatus {
  accepted: number;
  refused: number;
  mode: TerminalDropMode;
}
export interface TerminalDropStatus {
  fileGrantState: "available" | "unavailable";
  last: TerminalDropResultStatus | null;
}
export type TerminalCursorShape = "block" | "underline" | "bar";
export interface TerminalCursorAnimationStatus {
  intervalMs: number;
  phase: "steady" | "on" | "off";
}
export type TerminalThemeMode = "light" | "dark";
export interface TerminalThemePalette {
  foreground: string;
  background: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  ansi: readonly string[];
}
export interface TerminalThemeOverrides {
  foreground: string | null;
  background: string | null;
  cursor: string | null;
  ansi: readonly (string | null)[];
}
export interface TerminalThemeStatus {
  themeMode: TerminalThemeMode;
  baseTheme: TerminalThemePalette;
  terminalOverrides: TerminalThemeOverrides;
  effectiveTheme: TerminalThemePalette;
}

export const TERMINAL_THEME_EVENT = "soksak:terminal-colors" as const;
export interface TerminalThemeEventDetail extends TerminalThemeStatus {
  pane: string;
}

const terminalColorPattern = /^#[0-9a-f]{6}$/;

function requireTerminalColor(value: string, name: string): void {
  if (!terminalColorPattern.test(value)) {
    throw new Error(`${name} must be a lowercase #rrggbb color`);
  }
}

function requireTerminalPalette(value: TerminalThemePalette, name: string): void {
  for (const key of ["foreground", "background", "cursor", "cursorAccent", "selectionBackground"] as const) {
    requireTerminalColor(value[key], `${name}.${key}`);
  }
  if (value.ansi.length !== 256) throw new Error(`${name}.ansi must contain 256 colors`);
  value.ansi.forEach((color, index) => requireTerminalColor(color, `${name}.ansi[${index}]`));
}

export function emptyTerminalThemeOverrides(): TerminalThemeOverrides {
  return { foreground: null, background: null, cursor: null, ansi: Array(256).fill(null) };
}

export function resolveTerminalTheme(
  base: TerminalThemePalette,
  overrides: TerminalThemeOverrides,
): TerminalThemePalette {
  requireTerminalPalette(base, "baseTheme");
  if (overrides.ansi.length !== 256) throw new Error("terminalOverrides.ansi must contain 256 entries");
  for (const key of ["foreground", "background", "cursor"] as const) {
    const color = overrides[key];
    if (color !== null) requireTerminalColor(color, `terminalOverrides.${key}`);
  }
  overrides.ansi.forEach((color, index) => {
    if (color !== null) requireTerminalColor(color, `terminalOverrides.ansi[${index}]`);
  });
  return {
    foreground: overrides.foreground ?? base.foreground,
    background: overrides.background ?? base.background,
    cursor: overrides.cursor ?? base.cursor,
    cursorAccent: base.cursorAccent,
    selectionBackground: base.selectionBackground,
    ansi: base.ansi.map((color, index) => overrides.ansi[index] ?? color),
  };
}

export interface TerminalPresentationStatus extends TerminalThemeStatus {
  delivery: "bytes" | "frame" | "surface";
  mountSequence: number;
  readySequence: number | null;
  renderSequence: number;
  focusSequence: number;
  acceptedInputSequence: number;
  ptyWriteSequence: number;
  focusedInput: boolean;
  bracketedPaste: boolean;
  selection: TerminalSelectionStatus;
  clipboardPermission: TerminalClipboardPermissionStatus;
  drop: TerminalDropStatus;
  cursorVisible: boolean;
  cursorActive: boolean;
  cursorShape: TerminalCursorShape;
  cursorBlinking: boolean;
  cursorAnimation: TerminalCursorAnimationStatus;
  cursorRow: number | null;
  cursorColumn: number | null;
  mountedAtUnixMs: number;
  firstVisibleFrameAtUnixMs: number | null;
  firstFocusableInputAtUnixMs: number | null;
  lastRenderedAtUnixMs: number | null;
  lastFocusedAtUnixMs: number | null;
  lastInputAtUnixMs: number | null;
  lastPtyWriteAtUnixMs: number | null;
  lastRenderDurationMs: number | null;
  maxRenderDurationMs: number | null;
  lastInputToPtyWriteMs: number | null;
}
export interface TerminalPaneSummary {
  pane: string;
  engineId: string;
  phase: TerminalPluginPhase;
  cols: number;
  rows: number;
  offset: number;
  historySize: number;
  title: string | null;
  cwd: string | null;
}
export interface TerminalPluginPublicStatus extends TerminalResizeStatus {
  phase: TerminalPluginPhase;
  pluginId: string;
  engineId: string;
  rendererId: string;
  rendererProfile: TerminalRendererProfile;
  recoveryOutcome: TerminalRecoveryOutcome;
  fidelity: TerminalRecoveryFidelity;
  failure: TerminalPluginFailure | null;
  presentation: TerminalPresentationStatus;
}
export interface TerminalPluginViewStatus extends TerminalPluginPublicStatus {
  view: string | null;
  pane: string | null;
  panes: TerminalPaneSummary[];
}

export interface TerminalPluginManifestCommand {
  name: string;
  danger?: string;
}

export function validateTerminalPluginManifestCommands(
  commands: readonly TerminalPluginManifestCommand[],
): string[] {
  const errors: string[] = [];
  const index = new Map<string, TerminalPluginManifestCommand>();
  for (const command of commands) {
    if (index.has(command.name)) errors.push(`duplicate terminal command: ${command.name}`);
    index.set(command.name, command);
  }
  for (const name of TERMINAL_PLUGIN_COMMANDS) {
    const command = index.get(name);
    if (!command) {
      errors.push(`missing terminal command: ${name}`);
      continue;
    }
    const expected = TERMINAL_PLUGIN_COMMAND_SCHEMAS[name].danger;
    const actual = command.danger ?? "none";
    if (actual !== expected) errors.push(`terminal command ${name} danger is ${actual}, expected ${expected}`);
  }
  return errors;
}
