export const TERMINAL_PLUGIN_CONTRACT = Object.freeze({
  id: "soksak-spec-plugin-terminal",
  version: "0.0.6",
} as const);

const baseAnsiPalette = [
  "#2e3436", "#cc0000", "#4e9a06", "#c4a000",
  "#3465a4", "#75507b", "#06989a", "#d3d7cf",
  "#555753", "#ef2929", "#8ae234", "#fce94f",
  "#729fcf", "#ad7fa8", "#34e2e2", "#eeeeec",
];
const hex = (value: number) => value.toString(16).padStart(2, "0");
const indexedAnsiPalette = [...baseAnsiPalette];
const cube = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
for (let index = 0; index < 216; index += 1) {
  const red = cube[Math.floor(index / 36) % 6];
  const green = cube[Math.floor(index / 6) % 6];
  const blue = cube[index % 6];
  indexedAnsiPalette.push(`#${hex(red)}${hex(green)}${hex(blue)}`);
}
for (let index = 0; index < 24; index += 1) {
  const channel = hex(8 + index * 10);
  indexedAnsiPalette.push(`#${channel}${channel}${channel}`);
}
export const TERMINAL_ANSI_PALETTE = Object.freeze(indexedAnsiPalette);

export const TERMINAL_PRESENTATION_BUDGETS = Object.freeze({
  // One complete 60 Hz display interval. The budget comes from the presentation target,
  // not from the fastest provider in a comparison run.
  renderMs: 1000 / 60,
  // Input must enter the local PTY write boundary before three 60 Hz intervals elapse.
  inputToPtyWriteMs: 50,
} as const);

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
] as const);
export type TerminalPluginCommand = (typeof TERMINAL_PLUGIN_COMMANDS)[number];

type ScalarFieldType = "string" | "number" | "boolean" | "object" | "null";
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
const statusOutput = output({
  phase: "string", pluginId: "string", engineId: "string", rendererId: "string",
  rendererProfile: "string", recoveryOutcome: "string", fidelity: "string", failure: ["object", "null"],
  hostPixels: "object", requested: ["object", "null"], pty: ["object", "null"],
  recovery: ["object", "null"], rendered: ["object", "null"], operation: "string",
  presentation: "object",
}, [
  "phase", "pluginId", "engineId", "rendererId", "rendererProfile", "recoveryOutcome",
  "fidelity", "failure", "hostPixels", "requested", "pty", "recovery", "rendered", "operation",
  "presentation",
]);
const viewInput = () => input({ view: "string" });

export const TERMINAL_PLUGIN_COMMAND_SCHEMAS = Object.freeze({
  status: { danger: "none", input: viewInput(), output: statusOutput },
  wait: {
    danger: "none",
    input: input({ view: "string", phase: "string", timeoutMs: "number", contains: "string", cols: "number", colsLessThan: "number", colsGreaterThan: "number", rows: "number" }, ["phase"]),
    output: output({
      phase: "string", recoveryOutcome: "string", fidelity: "string", failure: ["object", "null"],
      cols: "number", rows: "number", operation: "string",
    }, ["phase", "recoveryOutcome", "fidelity"]),
  },
  archive: {
    danger: "none", input: viewInput(),
    output: output({ archived: "boolean", bytes: "number" }, ["archived"]),
  },
  send: {
    danger: "inject", input: input({ view: "string", data: "string" }, ["data"]),
    output: output({ sent: ["number", "boolean"] }, ["sent"]),
  },
  read: {
    danger: "none", input: input({ view: "string", lines: "number" }),
    output: output({ text: "string" }, ["text"]),
  },
  clear: {
    danger: "none", input: viewInput(), output: output({ cleared: "boolean" }, ["cleared"]),
  },
  focus: {
    danger: "none", input: viewInput(), output: output({ focused: "boolean" }, ["focused"]),
  },
  "recovery-status": { danger: "none", input: viewInput(), output: statusOutput },
} as const satisfies Record<TerminalPluginCommand, TerminalCommandSchema>);
export const TERMINAL_PLUGIN_NODES = Object.freeze([
  "terminal-root", "terminal-screen", "terminal-input", "terminal-restore-status",
] as const);

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
export interface TerminalPresentationStatus {
  delivery: "bytes" | "frame";
  mountSequence: number;
  readySequence: number | null;
  renderSequence: number;
  acceptedInputSequence: number;
  ptyWriteSequence: number;
  focusedInput: boolean;
  cursorVisible: boolean;
  cursorActive: boolean;
  cursorRow: number | null;
  cursorColumn: number | null;
  mountedAtUnixMs: number;
  firstVisibleFrameAtUnixMs: number | null;
  firstFocusableInputAtUnixMs: number | null;
  lastRenderedAtUnixMs: number | null;
  lastInputAtUnixMs: number | null;
  lastPtyWriteAtUnixMs: number | null;
  lastRenderDurationMs: number | null;
  maxRenderDurationMs: number | null;
  lastInputToPtyWriteMs: number | null;
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
