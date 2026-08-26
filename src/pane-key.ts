// A pane key is "<viewId>.<k>": the view id, one dot, a positive integer. A view id carries no dot,
// whitespace, slash or backslash, so the last dot always separates the index.
export const PANE_KEY_RE = /^([^.\s/\\]+)\.([1-9]\d*)$/;

const VIEW_ID_RE = /^[^.\s/\\]+$/;

export function paneKey(viewId: string, k: number): string {
  if (!Number.isInteger(k) || k < 1) throw new Error(`pane index must be a positive integer: ${k}`);
  if (!VIEW_ID_RE.test(viewId)) throw new Error(`view id cannot form a pane key: ${viewId}`);
  return `${viewId}.${k}`;
}

export function parsePaneKey(key: string): { viewId: string; k: number } | null {
  const match = PANE_KEY_RE.exec(key);
  return match ? { viewId: match[1], k: Number(match[2]) } : null;
}
