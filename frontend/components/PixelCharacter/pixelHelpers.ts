import type { PixelFrame } from './types';

export const COLS = 100;
export const ROWS = 100;
export const N    = COLS * ROWS;

export const BG: string | null = null;

export function pxSet(g: PixelFrame, r: number, c: number, color: string | null): void {
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) g[r * COLS + c] = color;
}

export function oval(
  g: PixelFrame, cx: number, cy: number,
  rx: number, ry: number, color: string | null,
): void {
  const r0 = Math.max(0, Math.ceil(cy - ry));
  const r1 = Math.min(ROWS - 1, Math.floor(cy + ry));
  const c0 = Math.max(0, Math.ceil(cx - rx));
  const c1 = Math.min(COLS - 1, Math.floor(cx + rx));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const dx = (c - cx) / rx, dy = (r - cy) / ry;
      if (dx * dx + dy * dy <= 1) pxSet(g, r, c, color);
    }
  }
}

export function hline(g: PixelFrame, r: number, c1: number, c2: number, color: string | null): void {
  for (let c = c1; c <= c2; c++) pxSet(g, r, c, color);
}

export function drawZ(g: PixelFrame, r: number, c: number, color: string): void {
  hline(g, r,     c, c + 4, color);
  pxSet(g, r + 1, c + 3,    color);
  pxSet(g, r + 2, c + 2,    color);
  pxSet(g, r + 3, c + 1,    color);
  hline(g, r + 4, c, c + 4, color);
}
