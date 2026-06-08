import type { PixelFrame } from './types';
import { pxSet, oval, hline } from './pixelHelpers';

const s = (n: number, sc: number) => Math.round(n * sc);

/* ── 헤드밴드 ── 범프 베이스를 가로지르는 밴드 */
export function drawHeadband(g: PixelFrame, cx: number, cy: number, sc: number): void {
  const y  = Math.round(cy - 18 * sc);
  const x  = Math.round(cx);
  const w  = Math.round(14 * sc);
  const c1 = '#4488ff';
  const c2 = '#2266ee';
  hline(g, y - 1, x - w + 2, x + w - 1, c1);
  hline(g, y,     x - w,     x + w + 1, c1);
  hline(g, y + 1, x - w,     x + w + 1, c2);
  if (sc >= 0.7) hline(g, y + 2, x - w + 1, x + w, c2);
}

/* ── 왕관 ── 캐릭터 최상단 위 */
export function drawCrown(g: PixelFrame, cx: number, cy: number, sc: number): void {
  const base = Math.round(cy - 27 * sc);
  const x    = Math.round(cx);
  const w    = Math.round(10 * sc);
  const gold = '#ffdd22';
  const dark = '#cc9900';
  const gem  = '#ff4488';
  hline(g, base,     x - w, x + w, gold);
  hline(g, base - 1, x - w, x + w, gold);
  hline(g, base - 2, x - w, x + w, dark);
  const ph = Math.max(2, Math.round(3 * sc));
  for (let i = 1; i <= ph; i++) {
    hline(g, base - 2 - i, x - w,     x - w + 2, gold);  // 왼쪽 스파이크
    hline(g, base - 2 - i, x - 1,     x + 1,     gold);  // 가운데 스파이크
    hline(g, base - 2 - i, x + w - 2, x + w,     gold);  // 오른쪽 스파이크
  }
  pxSet(g, base - 2 - ph, x, gem);  // 중앙 보석
}

/* ── 선글라스 ── 눈 행(er)에 딱 맞게 위치 */
export function drawSunglasses(g: PixelFrame, cx: number, cy: number, sc: number, er: number): void {
  const sy   = er;
  const x    = Math.round(cx);
  const lw   = Math.round(9 * sc);
  const lh   = Math.max(1, Math.round(sc));
  const gap  = Math.max(1, Math.round(2 * sc));
  const dark = '#111122';
  const rim  = '#334466';
  for (let r = sy - lh; r <= sy + lh; r++) {
    hline(g, r, x - lw - gap, x - gap, dark);   // 왼쪽 렌즈
    hline(g, r, x + gap,      x + lw + gap, dark); // 오른쪽 렌즈
  }
  hline(g, sy, x - gap + 1, x + gap - 1, rim);   // 브릿지
  pxSet(g, sy, x - lw - gap - 1, rim);            // 왼쪽 테 끝
  pxSet(g, sy, x + lw + gap + 1, rim);            // 오른쪽 테 끝
  if (sc >= 0.7) {
    pxSet(g, sy - lh, x - lw - gap + 1, '#3a5080');
    pxSet(g, sy - lh, x + gap + 1,      '#3a5080');
  }
}

/* ── 손목밴드 ── 양 손목 위치에 맞게 sc 적용 */
export function drawWristband(g: PixelFrame, cx: number, cy: number, sc: number): void {
  const wy = Math.round(cy + 4 * sc);
  const lx = Math.round(cx - 26 * sc);
  const rx = Math.round(cx + 25 * sc);
  const hw = Math.max(2, Math.round(4 * sc));
  const c1 = '#ff4444';
  const c2 = '#cc2222';
  for (let r = wy - 1; r <= wy + 2; r++) {
    const col = r === wy ? c2 : c1;
    hline(g, r, lx - hw, lx + hw, col);
    hline(g, r, rx - hw, rx + hw, col);
  }
}

/* ── 메달 ── 몸통 중앙 하부에 리본 + 원형 메달 */
export function drawMedalItem(g: PixelFrame, cx: number, cy: number, sc: number): void {
  const mX   = Math.round(cx);
  const mY   = Math.round(cy + 19 * sc);
  const rY   = Math.round(cy + 8  * sc);
  const rh   = Math.round(2 * sc);
  const gold = '#ffdd44';
  const med  = Math.max(3, Math.round(5 * sc));
  hline(g, rY,      mX - 2, mX + 2, '#4488ff');
  hline(g, rY + rh, mX - 2, mX + 2, '#ee3344');
  hline(g, rY + rh * 2, mX - 2, mX + 2, '#4488ff');
  oval(g, mX, mY, med, med, gold);
  pxSet(g, mY - Math.max(1, Math.round(sc)), mX, '#ffffff');
}

/* ── 아령 ── 양 손 바깥 위치, sc로 정확히 스케일 */
export function drawDumbbells(g: PixelFrame, cx: number, cy: number, sc: number): void {
  const dy   = Math.round(cy - 2 * sc);
  const gray = '#8888aa';
  const dark = '#444466';
  for (let r = dy - 1; r <= dy + 1; r++) {
    const col = r === dy ? dark : gray;
    hline(g, r, Math.round(cx - 35 * sc), Math.round(cx - 33 * sc), col); // 왼 외판
    hline(g, r, Math.round(cx - 30 * sc), Math.round(cx - 28 * sc), col); // 왼 내판
    hline(g, r, Math.round(cx + 28 * sc), Math.round(cx + 30 * sc), col); // 오 내판
    hline(g, r, Math.round(cx + 33 * sc), Math.round(cx + 35 * sc), col); // 오 외판
  }
  hline(g, dy, Math.round(cx - 32 * sc), Math.round(cx - 31 * sc), gray); // 왼 바
  hline(g, dy, Math.round(cx + 31 * sc), Math.round(cx + 32 * sc), gray); // 오 바
}

/* ══════════════════════════════════════════
   신규 피트니스 액세서리
══════════════════════════════════════════ */

/* ── 물통 ── 오른손에 들고 있는 워터보틀 */
export function drawWaterBottle(g: PixelFrame, cx: number, cy: number, sc: number): void {
  const bx = Math.round(cx + 31 * sc);
  const by = Math.round(cy + 3  * sc);
  const rx = Math.max(2, Math.round(2 * sc));
  const ry = Math.max(3, Math.round(5 * sc));
  oval(g, bx, by, rx, ry, '#88c4f4');
  for (let r = by - ry + 1; r < by; r++) pxSet(g, r, bx - rx + 1, '#c0e8ff'); // 하이라이트
  hline(g, by - ry - 1, bx - rx + 1, bx + rx - 1, '#ddeeff');                 // 뚜껑
}

/* ── 러닝화 ── 발바닥 아래 컬러 솔 + 스트라이프 */
export function drawRunningShoes(g: PixelFrame, cx: number, cy: number, sc: number): void {
  const sole   = '#ff4444';
  const stripe = '#ffaaaa';
  const ly = Math.round(cy + 23 * sc);
  const lx = Math.round(cx - 10 * sc);
  const lw = Math.round(8 * sc);
  const ry = Math.round(cy + 22 * sc);
  const rx = Math.round(cx + 9  * sc);
  const rw = Math.round(7 * sc);
  hline(g, ly,     lx - lw, lx + lw, sole);
  hline(g, ly - 1, lx - lw + 1, lx + lw - 1, stripe);
  hline(g, ry,     rx - rw, rx + rw, sole);
  hline(g, ry - 1, rx - rw + 1, rx + rw - 1, stripe);
}

/* ── 에어팟 ── 머리 양옆 이어버드 + 오버헤드 연결선 */
export function drawEarphones(g: PixelFrame, cx: number, cy: number, sc: number): void {
  const ey  = Math.round(cy - 16 * sc);
  const lx  = Math.round(cx - 19 * sc);
  const rx  = Math.round(cx + 17 * sc);
  const bud = '#f0f0f0';
  const wir = '#888888';
  pxSet(g, ey,     lx, bud); pxSet(g, ey + 1, lx, bud); pxSet(g, ey, lx - 1, '#cccccc');
  pxSet(g, ey,     rx, bud); pxSet(g, ey + 1, rx, bud); pxSet(g, ey, rx + 1, '#cccccc');
  const wireY = Math.round(cy - 29 * sc);
  if (wireY < ey - 1) {
    hline(g, wireY, lx, rx, wir);
    for (let r = wireY + 1; r < ey; r++) { pxSet(g, r, lx, wir); pxSet(g, r, rx, wir); }
  }
}
