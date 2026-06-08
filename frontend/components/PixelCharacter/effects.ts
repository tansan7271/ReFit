import type { PixelFrame } from './types';
import { pxSet, oval, hline, BG } from './pixelHelpers';

export function drawAuraEffect(g: PixelFrame, cx: number, cy: number, color: string, fi: number): void {
  const r = 30 + fi;
  for (let angle = 0; angle < 360; angle += 9) {
    const rad = angle * Math.PI / 180;
    const px  = Math.round(cx + r * Math.cos(rad));
    const py  = Math.round(cy + r * Math.sin(rad));
    pxSet(g, py, px, color);
    if (fi === 1) pxSet(g, py - 1, px, color);
  }
}

export function drawFireEffect(g: PixelFrame, cx: number, cy: number, sc: number, fi: number): void {
  const base    = Math.round(cy + 25 * sc);
  const spread  = Math.round(12 * sc);
  const fcols   = ['#ffcc00', '#ff9900', '#ff6600'];
  for (let i = -3; i <= 3; i++) {
    const h = (4 - Math.abs(i)) + (fi % 2 === 1 ? Math.abs(i) % 2 : 0) + 2;
    const hs = Math.round(h * sc);
    for (let j = 0; j < hs; j++) {
      pxSet(g, base - j, Math.round(cx) + Math.round(i * spread / 3),
        fcols[Math.min(2, Math.floor(j * 3 / hs))]);
    }
  }
}

export function drawSparklesEffect(g: PixelFrame, cx: number, cy: number, sc: number, fi: number): void {
  const col = '#ffee88';
  const pts: [number, number][] = [
    [cy - 24 * sc, cx + 22 * sc], [cy - 30 * sc, cx - 18 * sc],
    [cy - 20 * sc, cx + 30 * sc], [cy - 34 * sc, cx +  5 * sc],
    [cy - 18 * sc, cx - 26 * sc],
  ];
  pts.forEach(([sy, sx], idx) => {
    if ((fi + idx) % 2 === 0) {
      const r = Math.round(sy), c = Math.round(sx);
      pxSet(g, r,     c,     col); pxSet(g, r - 2, c,     col);
      pxSet(g, r + 2, c,     col); pxSet(g, r,     c - 2, col);
      pxSet(g, r,     c + 2, col);
    }
  });
}

export function drawMoonStarsEffect(g: PixelFrame, cx: number, cy: number, sc: number): void {
  const blue = '#5e78bb';
  const mx = Math.round(cx + 22 * sc), my = Math.round(cy - 25 * sc);
  oval(g, mx, my, Math.round(8 * sc), Math.round(8 * sc), blue);
  oval(g, mx + Math.round(4 * sc), my - Math.round(2 * sc),
       Math.round(7 * sc), Math.round(7 * sc), BG);
  const stars: [number, number][] = [
    [cy - 34 * sc, cx - 17 * sc], [cy - 28 * sc, cx - 26 * sc], [cy - 37 * sc, cx + 11 * sc],
  ];
  stars.forEach(([sy, sx]) => {
    const r = Math.round(sy), c = Math.round(sx);
    pxSet(g, r,     c,     blue); pxSet(g, r - 1, c,     blue);
    pxSet(g, r + 1, c,     blue); pxSet(g, r,     c - 1, blue);
    pxSet(g, r,     c + 1, blue);
  });
}

export function drawRainCloudEffect(g: PixelFrame, cx: number, cy: number, sc: number, fi: number): void {
  const cloud = '#445566';
  const rain  = '#6688aa';
  const cX    = Math.round(cx + 14 * sc);
  const cY    = Math.round(cy - 32 * sc);
  oval(g, cX,                       cY,                       Math.round(10 * sc), Math.round(6 * sc), cloud);
  oval(g, cX + Math.round(8 * sc),  cY - Math.round(4 * sc), Math.round(7  * sc), Math.round(5 * sc), cloud);
  oval(g, cX - Math.round(7 * sc),  cY - Math.round(3 * sc), Math.round(6  * sc), Math.round(5 * sc), cloud);
  for (let d = 0; d < 4; d++) {
    const dropY = cY + Math.round(9 * sc) + ((fi + d) % 3) * 2;
    const dropX = cX - Math.round(7 * sc) + d * Math.round(5 * sc);
    pxSet(g, dropY,     dropX, rain);
    pxSet(g, dropY + 1, dropX, rain);
  }
}

/* ══════════════════════════════════════════
   신규 피트니스 이펙트
══════════════════════════════════════════ */

/* ── 속도선 ── 러닝 중 왼쪽에 나타나는 모션 라인 */
export function drawSpeedLinesEffect(g: PixelFrame, cx: number, cy: number, sc: number, fi: number): void {
  const col  = '#99bbee';
  const endX = Math.round(cx - 26 * sc);
  const data: [number, number][] = [
    [cy - 10 * sc, 22], [cy - 3 * sc, 32], [cy + 5 * sc, 26], [cy + 13 * sc, 18],
  ];
  data.forEach(([py, len], idx) => {
    const r    = Math.round(py);
    const aLen = len + ((fi + idx) % 2) * 5;
    hline(g, r, Math.max(0, endX - aLen), endX, col);
  });
}

/* ── 회복 오라 ── 따뜻한 주황 빛 (애프터 케어·리커버리) */
export function drawRecoveryGlowEffect(g: PixelFrame, cx: number, cy: number, fi: number): void {
  const r1 = 30 + fi * 2;
  const r2 = r1 + 5;
  for (let a = 0; a < 360; a += 12) {
    const rad = a * Math.PI / 180;
    pxSet(g, Math.round(cy + r1 * Math.sin(rad)), Math.round(cx + r1 * Math.cos(rad)), '#ff9966');
  }
  for (let a = 6; a < 360; a += 20) {
    const rad = a * Math.PI / 180;
    pxSet(g, Math.round(cy + r2 * Math.sin(rad)), Math.round(cx + r2 * Math.cos(rad)), '#ffcc88');
  }
}

/* ── 하트 비트 ── 성취·동기부여 시 하트가 퍼짐 */
function drawPixelHeart(g: PixelFrame, cx: number, cy: number, col: string): void {
  pxSet(g, cy - 1, cx - 1, col); pxSet(g, cy - 1, cx + 1, col);
  for (let c = cx - 2; c <= cx + 2; c++) pxSet(g, cy,     c, col);
  for (let c = cx - 1; c <= cx + 1; c++) pxSet(g, cy + 1, c, col);
  pxSet(g, cy + 2, cx, col);
}

export function drawHeartBeatEffect(g: PixelFrame, cx: number, cy: number, sc: number, fi: number): void {
  const col = '#ff4488';
  const pts: [number, number][] = [
    [cy - 28 * sc, cx + 22 * sc],
    [cy - 22 * sc, cx - 24 * sc],
    [cy - 34 * sc, cx +  5 * sc],
  ];
  pts.forEach(([hy, hx], idx) => {
    if ((fi + idx) % 2 === 0) drawPixelHeart(g, Math.round(hx), Math.round(hy), col);
  });
}
