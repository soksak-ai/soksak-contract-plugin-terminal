import presentation from "../presentation.json" with { type: "json" };

export * from "./pane-key";

export const TERMINAL_PLUGIN_CONTRACT = Object.freeze({
  id: "soksak-spec-plugin-terminal",
  version: "0.0.21",
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
  "drop", "image.present", "input.compose",
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
      acceptedInputSequenceGreaterThan: "number", ptyWriteSequenceGreaterThan: "number",
      themeMode: "string", effectiveBackground: "string",
      historySize: "number", minHistorySize: "number", offset: "number", followMode: "string",
    }, ["phase"]),
    output: output({
      phase: "string", recoveryOutcome: "string", fidelity: "string", failure: ["object", "null"],
      cols: "number", rows: "number", operation: "string", presentation: "object", pane: nullableString,
      historySize: "number", offset: "number", followMode: "string",
    }, [
      "phase", "recoveryOutcome", "fidelity", "presentation", "pane",
      "historySize", "offset", "followMode",
    ]),
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
    output: output({ pane: nullableString, offset: "number", historySize: "number", followMode: "string" }, ["pane", "offset", "historySize", "followMode"]),
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
    danger: "inject", input: paneInput({ grants: "array" }, ["grants"]),
    output: output({
      pane: nullableString, accepted: "number", refused: "number", mode: "string",
    }, ["pane", "accepted", "refused", "mode"]),
  },
  "image.present": {
    danger: "none", input: paneInput({ resource: "object", protocol: "string" }, ["resource"]),
    output: output({
      pane: nullableString, resourceId: "string", presented: "boolean",
      protocol: ["string", "null"], refusal: ["object", "null"],
    }, ["pane", "resourceId", "presented", "protocol", "refusal"]),
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
    commands: ["image.present", "status"],
    status: ["inlineImageProtocols", "inlineImageLimits", "inlineImageRefusal"],
    events: ["image.presented", "image.refused"],
    nodes: ["terminal-screen"],
  }),
] as const satisfies readonly TerminalV1Component[]);

// Verbs the app's surface door accepts for one native terminal surface. `input` is an
// injection like `send`; an unknown verb is refused by name, never mapped to a nearest one.
export const TERMINAL_SURFACE_DELIVER_VERBS = Object.freeze([
  "snapshot", "state", "read", "scroll", "pointer", "wheel", "selection", "focus", "input", "theme", "stop", "archive",
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
// A host-issued file grant authorizes path insertion only. Inline presentation consumes an
// opaque TerminalImageResource through image.present and never borrows this command.
export type TerminalDropMode = "path";
export interface TerminalDropResultStatus {
  accepted: number;
  refused: number;
  mode: TerminalDropMode;
}
export interface TerminalDropStatus {
  fileGrantState: "available" | "unavailable";
  last: TerminalDropResultStatus | null;
}
export const TERMINAL_INLINE_IMAGE_PROTOCOLS = Object.freeze([
  "kitty-graphics", "iterm2-inline", "sixel",
] as const);
export type TerminalInlineImageProtocol = (typeof TERMINAL_INLINE_IMAGE_PROTOCOLS)[number];
export const TERMINAL_INLINE_IMAGE_REFUSAL_CODES = Object.freeze([
  "unsupported-engine", "unsupported-protocol", "unsupported-mime", "resource-expired",
  "resource-too-large", "resource-unavailable", "presentation-failed",
] as const);
export type TerminalInlineImageRefusalCode = (typeof TERMINAL_INLINE_IMAGE_REFUSAL_CODES)[number];
export const TERMINAL_INLINE_IMAGE_EVENTS = Object.freeze({
  presented: "image.presented", refused: "image.refused",
} as const);

export interface TerminalImageResourceLifetime {
  kind: "single-presentation";
  expiresAtUnixMs: number;
}
export interface TerminalImageResource {
  resourceId: string;
  mime: string;
  sizeBytes: number;
  lifetime: TerminalImageResourceLifetime;
}
export interface TerminalInlineImageLimits {
  maxBytes: number;
  supportedMimeTypes: readonly string[];
}
export interface TerminalInlineImageRefusal {
  code: TerminalInlineImageRefusalCode;
  message: string;
}
export interface TerminalInlineImageStatus {
  inlineImageProtocols: readonly TerminalInlineImageProtocol[];
  inlineImageLimits: TerminalInlineImageLimits;
  inlineImageRefusal: TerminalInlineImageRefusal | null;
}
export interface TerminalImagePresentResult {
  pane: string | null;
  resourceId: string;
  presented: boolean;
  protocol: TerminalInlineImageProtocol | null;
  refusal: TerminalInlineImageRefusal | null;
}
export interface TerminalImagePresentedEvent {
  pane: string;
  resourceId: string;
  protocol: TerminalInlineImageProtocol;
  mime: string;
  sizeBytes: number;
}
export interface TerminalImageRefusedEvent {
  pane: string | null;
  resourceId: string;
  refusal: TerminalInlineImageRefusal;
}

const terminalResourceId = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const terminalImageMime = /^image\/[a-z0-9][a-z0-9.+-]{0,63}$/;
const ownRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
const checkClosed = (
  value: Record<string, unknown>, allowed: readonly string[], required: readonly string[],
  label: string, errors: string[],
) => {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${label}.${key}: unknown field`);
  }
  for (const key of required) {
    if (!(key in value)) errors.push(`${label}.${key}: required`);
  }
};
const checkResourceId = (value: unknown, label: string, errors: string[]) => {
  if (typeof value !== "string" || !terminalResourceId.test(value)) {
    errors.push(`${label}: opaque resource id required`);
  }
};
const checkImageMime = (value: unknown, label: string, errors: string[]) => {
  if (typeof value !== "string" || !terminalImageMime.test(value)) {
    errors.push(`${label}: image MIME required`);
  }
};
const checkPositiveInteger = (value: unknown, label: string, errors: string[]) => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    errors.push(`${label}: positive integer required`);
  }
};
const checkNonNegativeInteger = (value: unknown, label: string, errors: string[]) => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    errors.push(`${label}: non-negative integer required`);
  }
};
const checkRefusal = (value: unknown, label: string, errors: string[]) => {
  const refusal = ownRecord(value);
  if (!refusal) {
    errors.push(`${label}: refusal object required`);
    return;
  }
  checkClosed(refusal, ["code", "message"], ["code", "message"], label, errors);
  if (!TERMINAL_INLINE_IMAGE_REFUSAL_CODES.includes(refusal.code as TerminalInlineImageRefusalCode)) {
    errors.push(`${label}.code: unknown refusal`);
  }
  if (typeof refusal.message !== "string" || refusal.message === "") {
    errors.push(`${label}.message: non-empty message required`);
  }
};

export function validateTerminalImageResource(value: unknown): string[] {
  const errors: string[] = [];
  const resource = ownRecord(value);
  if (!resource) return ["resource: object required"];
  checkClosed(
    resource, ["resourceId", "mime", "sizeBytes", "lifetime"],
    ["resourceId", "mime", "sizeBytes", "lifetime"], "resource", errors,
  );
  if ("resourceId" in resource) checkResourceId(resource.resourceId, "resource.resourceId", errors);
  if ("mime" in resource) checkImageMime(resource.mime, "resource.mime", errors);
  if ("sizeBytes" in resource) checkPositiveInteger(resource.sizeBytes, "resource.sizeBytes", errors);
  if ("lifetime" in resource) {
    const lifetime = ownRecord(resource.lifetime);
    if (!lifetime) errors.push("resource.lifetime: object required");
    else {
      checkClosed(lifetime, ["kind", "expiresAtUnixMs"], ["kind", "expiresAtUnixMs"], "resource.lifetime", errors);
      if (lifetime.kind !== "single-presentation") {
        errors.push("resource.lifetime.kind: single-presentation required");
      }
      if ("expiresAtUnixMs" in lifetime) {
        checkPositiveInteger(lifetime.expiresAtUnixMs, "resource.lifetime.expiresAtUnixMs", errors);
      }
    }
  }
  return errors;
}

export function validateTerminalInlineImageStatus(value: unknown): string[] {
  const errors: string[] = [];
  const status = ownRecord(value);
  if (!status) return ["inline image status: object required"];
  checkClosed(
    status, ["inlineImageProtocols", "inlineImageLimits", "inlineImageRefusal"],
    ["inlineImageProtocols", "inlineImageLimits", "inlineImageRefusal"], "inline image status", errors,
  );
  const protocols = status.inlineImageProtocols;
  if (!Array.isArray(protocols)) errors.push("inlineImageProtocols: array required");
  else {
    protocols.forEach((protocol, index) => {
      if (!TERMINAL_INLINE_IMAGE_PROTOCOLS.includes(protocol as TerminalInlineImageProtocol)) {
        errors.push(`inlineImageProtocols[${index}]: unknown protocol`);
      }
    });
    if (new Set(protocols).size !== protocols.length) {
      errors.push("inlineImageProtocols: duplicates forbidden");
    }
  }
  const limits = ownRecord(status.inlineImageLimits);
  if (!limits) errors.push("inlineImageLimits: object required");
  else {
    checkClosed(
      limits, ["maxBytes", "supportedMimeTypes"], ["maxBytes", "supportedMimeTypes"],
      "inlineImageLimits", errors,
    );
    if ("maxBytes" in limits) checkNonNegativeInteger(limits.maxBytes, "inlineImageLimits.maxBytes", errors);
    const mimes = limits.supportedMimeTypes;
    if (!Array.isArray(mimes)) errors.push("inlineImageLimits.supportedMimeTypes: array required");
    else {
      mimes.forEach((mime, index) => checkImageMime(mime, `inlineImageLimits.supportedMimeTypes[${index}]`, errors));
      if (new Set(mimes).size !== mimes.length) errors.push("inlineImageLimits.supportedMimeTypes: duplicates forbidden");
    }
  }
  if (status.inlineImageRefusal !== null && status.inlineImageRefusal !== undefined) {
    checkRefusal(status.inlineImageRefusal, "inlineImageRefusal", errors);
  }
  if (Array.isArray(protocols) && limits && typeof limits.maxBytes === "number") {
    if (protocols.length === 0 && limits.maxBytes !== 0) {
      errors.push("inlineImageLimits.maxBytes: unsupported engine limit must be zero");
    }
    if (protocols.length > 0 && limits.maxBytes <= 0) {
      errors.push("inlineImageLimits.maxBytes: supported protocol limit must be positive");
    }
  }
  return errors;
}

export function validateTerminalImagePresentResult(value: unknown): string[] {
  const errors: string[] = [];
  const result = ownRecord(value);
  if (!result) return ["result: object required"];
  checkClosed(
    result, ["pane", "resourceId", "presented", "protocol", "refusal"],
    ["pane", "resourceId", "presented", "protocol", "refusal"], "result", errors,
  );
  if (result.pane !== null && typeof result.pane !== "string") errors.push("result.pane: string or null required");
  if ("resourceId" in result) checkResourceId(result.resourceId, "result.resourceId", errors);
  if (typeof result.presented !== "boolean") errors.push("result.presented: boolean required");
  const protocol = result.protocol;
  if (protocol !== null && !TERMINAL_INLINE_IMAGE_PROTOCOLS.includes(protocol as TerminalInlineImageProtocol)) {
    errors.push("result.protocol: unknown protocol");
  }
  if (result.presented === true) {
    if (!TERMINAL_INLINE_IMAGE_PROTOCOLS.includes(protocol as TerminalInlineImageProtocol)) {
      errors.push("result.protocol: supported protocol required when presented");
    }
    if (result.refusal !== null) errors.push("result.refusal: must be null when presented");
  } else if (result.presented === false) {
    if (protocol !== null) errors.push("result.protocol: must be null when refused");
    if (result.refusal === null || result.refusal === undefined) {
      errors.push("result.refusal: explicit refusal required when not presented");
    } else checkRefusal(result.refusal, "result.refusal", errors);
  }
  return errors;
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
  inlineImageProtocols: readonly TerminalInlineImageProtocol[];
  inlineImageLimits: TerminalInlineImageLimits;
  inlineImageRefusal: TerminalInlineImageRefusal | null;
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
  followMode: "follow" | "pinned";
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
