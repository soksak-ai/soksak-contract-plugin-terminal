export const TERMINAL_PLUGIN_CONTRACT = Object.freeze({
  id: "soksak-spec-plugin-terminal",
  version: "0.0.1",
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
export const TERMINAL_PLUGIN_NODES = Object.freeze([
  "terminal-root", "terminal-screen", "terminal-input", "terminal-restore-status",
] as const);

export interface TerminalPluginFailure { code: string; message: string }
export interface TerminalPluginPublicStatus {
  phase: TerminalPluginPhase;
  pluginId: string;
  engineId: string;
  rendererId: string;
  rendererProfile: TerminalRendererProfile;
  recoveryOutcome: TerminalRecoveryOutcome;
  fidelity: TerminalRecoveryFidelity;
  failure: TerminalPluginFailure | null;
}
