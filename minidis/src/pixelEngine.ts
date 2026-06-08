import type {
  CharacterState, CharacterPalette, PixelFrame, StateConfig,
  AccessoryType, RenderOptions, GrowthLevel, WorkoutPart, EnergyLevel,
} from './types';
import { N, BG, COLS, ROWS, oval, hline, pxSet, drawZ } from './pixelHelpers';
import {
  drawHeadband, drawCrown, drawSunglasses,
  drawWristband, drawMedalItem, drawDumbbells,
  drawWaterBottle, drawRunningShoes, drawEarphones,
} from './accessories';
import {
  drawAuraEffect, drawFireEffect, drawSparklesEffect,
  drawMoonStarsEffect, drawRainCloudEffect,
  drawSpeedLinesEffect, drawRecoveryGlowEffect, drawHeartBeatEffect,
} from './effects';

export { COLS, ROWS, N, BG };

export const STATE_CONFIGS: Record<CharacterState, StateConfig> = {
  neutral:   { fps: 2, frameCount: 2, label: '보통'       },
  happy:     { fps: 4, frameCount: 3, label: '최고 컨디션' },
  tired:     { fps: 2, frameCount: 2, label: '수면 부족'   },
  sleeping:  { fps: 2, frameCount: 3, label: '수면 중'     },
  workout:   { fps: 8, frameCount: 4, label: '운동 중'     },
  flex:      { fps: 2, frameCount: 2, label: '운동 완료'   },
  sedentary: { fps: 2, frameCount: 2, label: '운동 부족'   },
  overfed:   { fps: 2, frameCount: 2, label: '식단 불균형' },
  derailed:  { fps: 3, frameCount: 3, label: '루틴 깨짐'   },
};

/*
 * 몸 색상은 에너지 레벨(ENERGY_BODY)이 결정한다.
 * PALETTES는 eye/mouth/이펙트 색상만 담당 — body/hi/shd는 buildFrame에서 덮어씌워진다.
 */
export const PALETTES: Record<CharacterState, CharacterPalette> = {
  neutral:   { body:'#c4b4ec', hi:'#ddd0ff', shd:'#8868cc', eye:'#18102e', mouth:'#18102e' },
  happy:     { body:'#c4b4ec', hi:'#ddd0ff', shd:'#8868cc', eye:'#18102e', mouth:'#ee2244', glow:'#ffee99' },
  tired:     { body:'#c4b4ec', hi:'#ddd0ff', shd:'#8868cc', eye:'#18102e', mouth:'#18102e', circ:'#7890a8' },
  sleeping:  { body:'#c4b4ec', hi:'#ddd0ff', shd:'#8868cc', eye:'#18102e', mouth:'#18102e', zzz:'#9090cc' },
  workout:   { body:'#c4b4ec', hi:'#ddd0ff', shd:'#8868cc', eye:'#18102e', mouth:'#18102e', trail:'#ff4020', sweat:'#88ccff' },
  flex:      { body:'#c4b4ec', hi:'#ddd0ff', shd:'#8868cc', eye:'#18102e', mouth:'#ee2244', arm:'#d4a000', shine:'#ffffff', medal:'#f8d040' },
  sedentary: { body:'#c4b4ec', hi:'#ddd0ff', shd:'#8868cc', eye:'#18102e', mouth:'#18102e', sweat:'#88ccff' },
  overfed:   { body:'#c4b4ec', hi:'#ddd0ff', shd:'#8868cc', eye:'#18102e', mouth:'#18102e' },
  derailed:  { body:'#c4b4ec', hi:'#ddd0ff', shd:'#8868cc', eye:'#18102e', mouth:'#18102e', cloud:'#5070a0', rain:'#88aacc' },
};

/*
 * 에너지 레벨별 몸 색상 팔레트.
 * 에너지 = (수면점수 + 루틴점수) / 2
 *   0 → 거의 흰색   (에너지 없음)
 *   1 → 옅은 하늘   (매우 부족)
 *   2 → 하늘색       (부족)
 *   3 → 옅은 보라    (기본, 중간)
 *   4 → 살몬/분홍   (좋음)
 *   5 → 주황/붉은   (높음)
 *   6 → 골드/노랑   (최고 에너지)
 */
export const ENERGY_BODY: Record<EnergyLevel, Pick<CharacterPalette, 'body' | 'hi' | 'shd'>> = {
  0: { body: '#f0f5ff', hi: '#f8faff', shd: '#b0c8e0' },  // 거의 흰색 (에너지 없음)
  1: { body: '#c0dcf4', hi: '#e0efff', shd: '#7aaace' },  // 옅은 하늘
  2: { body: '#88b8ec', hi: '#b8d8ff', shd: '#4478b8' },  // 하늘색
  3: { body: '#c4b4ec', hi: '#ddd0ff', shd: '#8868cc' },  // 옅은 보라 (기본)
  4: { body: '#f4a888', hi: '#ffd0b4', shd: '#c86040' },  // 살몬/분홍
  5: { body: '#f07848', hi: '#ffaa80', shd: '#c04820' },  // 주황/붉은
  6: { body: '#f8cc40', hi: '#fff080', shd: '#c89000' },  // 골드/노랑 (최고)
};

/* ════════════════════════════════════════════
   몸통 형태 설정
════════════════════════════════════════════ */

type OvalSpec = readonly [dx: number, dy: number, rx: number, ry: number];

interface BlobConfig {
  body:  readonly [rx: number, ry: number];
  bumpL: OvalSpec;
  bumpR: OvalSpec;
  handL: OvalSpec;
  handR: OvalSpec;
  footL: OvalSpec;
  footR: OvalSpec;
  hi:    OvalSpec;
  shdAt: number;   // cy + shdAt*sc 이하 행 → 그림자
}

const BLOB_NORMAL: BlobConfig = {
  body:  [23, 17],
  bumpL: [ -9, -19, 10,  8],
  bumpR: [  7, -21,  8,  7],
  handL: [-26,   4,  6,  5],
  handR: [ 25,   3,  5,  5],
  footL: [-10,  18,  9,  8],
  footR: [  9,  17,  8,  7],
  hi:    [ -7,  -6,  9,  6],
  shdAt: 11,
};

/* 좁고 길쭉한 몸 + 가느다란 손발 — 힘없이 홀쭉한 느낌 */
const BLOB_THIN: BlobConfig = {
  body:  [13, 20],
  bumpL: [ -4, -18,  6,  5],
  bumpR: [  3, -20,  5,  4],
  handL: [-20,   5,  3,  3],
  handR: [ 19,   4,  3,  3],
  footL: [ -7,  21,  5,  4],
  footR: [  6,  20,  4,  4],
  hi:    [ -4,  -7,  5,  4],
  shdAt: 13,
};

/* 거의 원형 몸통 + 크고 울룩불룩한 손발 — 굴러다닐 것 같은 느낌 */
const BLOB_CHUBBY: BlobConfig = {
  body:  [28, 26],
  bumpL: [-11, -24, 15, 13],
  bumpR: [ 10, -26, 13, 11],
  handL: [-32,   5, 11, 10],
  handR: [ 31,   4, 10, 10],
  footL: [-11,  22, 14, 12],
  footR: [ 10,  21, 13, 11],
  hi:    [ -9,  -9, 13, 10],
  shdAt: 16,
};

/* ── 운동 부위별 발달 체형 ── */

/*
 * 가슴 — 몸통 oval만 크게, 범프·팔·발 크기는 NORMAL 동일.
 * 등(BACK)은 범프가 넓어지고, 가슴(CHEST)은 몸통이 두꺼워져 명확히 구분됨.
 */
const BLOB_CHEST: BlobConfig = {
  body:  [27, 21],             // 몸통만 크게 (NORMAL: [23, 17])
  bumpL: [ -9, -19, 10,  8],  // 크기 NORMAL 동일
  bumpR: [  7, -21,  8,  7],  // 크기 NORMAL 동일
  handL: [-30,   4,  6,  5],  // 더 큰 몸통 밖으로 위치 조정
  handR: [ 29,   3,  5,  5],
  footL: [-11,  22,  9,  8],  // 더 큰 몸통 아래로 위치 조정
  footR: [ 10,  21,  8,  7],
  hi:    [ -8,  -7, 10,  7],
  shdAt: 14,
};

/* 등 — 넓은 어깨·등판 V라인. body ry=17 유지로 납작하지 않게 */
const BLOB_BACK: BlobConfig = {
  body:  [26, 17],
  bumpL: [-13, -17, 14, 10],
  bumpR: [ 11, -19, 12,  9],
  handL: [-30,   4,  8,  5],
  handR: [ 29,   3,  7,  5],
  footL: [-12,  19, 10,  8],
  footR: [ 11,  18,  9,  8],
  hi:    [-10,  -5, 11,  6],
  shdAt: 11,
};

/* 하체 — 왼쪽 다리만 크게 발달 (팔 운동의 왼팔과 같은 방향) */
const BLOB_LEGS: BlobConfig = {
  body:  [22, 18],
  bumpL: [ -8, -19,  8,  7],
  bumpR: [  6, -21,  6,  6],
  handL: [-23,   3,  5,  4],
  handR: [ 22,   2,  4,  4],
  footL: [-12,  22, 16, 14],   // 왼발: 크게 발달
  footR: [  9,  19,  9,  8],   // 오른발: 기본 크기
  hi:    [ -7,  -6,  9,  6],
  shdAt: 11,
};

/* 어깨 — 양 옆으로 넓게 벌어진 어깨 범프 */
const BLOB_SHOULDERS: BlobConfig = {
  body:  [23, 17],
  bumpL: [-15, -17, 16, 12],
  bumpR: [ 13, -19, 14, 11],
  handL: [-28,   4,  6,  5],
  handR: [ 27,   3,  5,  5],
  footL: [-10,  18,  9,  8],
  footR: [  9,  17,  8,  7],
  hi:    [ -8,  -6, 10,  7],
  shdAt: 11,
};

/* 팔 — 오른팔을 들어올려 이두 표현 (비대칭) */
const BLOB_ARMS: BlobConfig = {
  body:  [23, 17],
  bumpL: [ -9, -19, 10,  8],
  bumpR: [  7, -21,  8,  7],
  handL: [-27,   4,  6,  5],
  handR: [ 23, -10, 10,  9],   // 오른팔 들어올려 이두 표현
  footL: [-10,  18,  9,  8],
  footR: [  9,  17,  8,  7],
  hi:    [ -7,  -6,  9,  6],
  shdAt: 11,
};

/* 복근 — 납작하고 직사각형에 가까운 몸통 (abs 선은 별도 drawAbs로) */
const BLOB_CORE: BlobConfig = {
  body:  [20, 21],
  bumpL: [ -8, -22,  9,  7],
  bumpR: [  6, -24,  7,  6],
  handL: [-25,   4,  6,  5],
  handR: [ 24,   3,  5,  5],
  footL: [-10,  22,  9,  8],
  footR: [  9,  21,  8,  7],
  hi:    [ -7,  -8,  9,  6],
  shdAt: 12,
};

const WORKOUT_BLOB: Record<WorkoutPart, BlobConfig> = {
  chest:     BLOB_CHEST,
  back:      BLOB_BACK,
  legs:      BLOB_LEGS,
  shoulders: BLOB_SHOULDERS,
  arms:      BLOB_ARMS,
  core:      BLOB_CORE,
};

/* 6-pack abs: 가로선 3줄 + 세로 중심선 → 6구역 */
function drawAbs(g: PixelFrame, cx: number, cy: number, sc: number, shd: string): void {
  const x  = Math.round(cx);
  const hw = Math.round(7 * sc);
  const ra = Math.round(cy - 6 * sc);  // 위
  const rb = Math.round(cy);            // 중간
  const rc = Math.round(cy + 6 * sc);  // 아래
  hline(g, ra, x - hw, x + hw, shd);
  hline(g, rb, x - hw, x + hw, shd);
  hline(g, rc, x - hw, x + hw, shd);
  for (let r = ra + 1; r < rc; r++) pxSet(g, r, x, shd);
}

/* sc = 성장 레벨 바디 스케일 (1.0이 기본, 레벨 낮을수록 작아짐) */
function dittoBlob(
  g: PixelFrame,
  cx: number, cy: number,
  color: string, shadow: string, hiColor: string,
  cfg: BlobConfig,
  sc: number,
): void {
  const scOval = ([dx, dy, rx, ry]: OvalSpec) =>
    oval(g, cx + dx * sc, cy + dy * sc, rx * sc, ry * sc, color);

  oval(g, cx, cy, cfg.body[0] * sc, cfg.body[1] * sc, color);
  scOval(cfg.bumpL);
  scOval(cfg.bumpR);
  scOval(cfg.handL);
  scOval(cfg.handR);
  scOval(cfg.footL);
  scOval(cfg.footR);

  const shdY = cy + cfg.shdAt * sc;
  for (let i = 0; i < N; i++) {
    if (g[i] === color && Math.floor(i / COLS) > shdY) g[i] = shadow;
  }

  const [hiDx, hiDy, hiRx, hiRy] = cfg.hi;
  oval(g, cx + hiDx * sc, cy + hiDy * sc, hiRx * sc, hiRy * sc, hiColor);
}

/* ════════════════════════════════════════════
   성장 레벨별 얼굴 설정
════════════════════════════════════════════ */

interface FaceConfig {
  eyeDy:   number;   // 눈 행 오프셋 (cy 기준, +아래)
  eyeLDx:  number;   // 왼눈 열 오프셋 (cx 기준, 음수=왼쪽)
  eyeRDx:  number;   // 오른눈 열 오프셋 (cx 기준, 양수=오른쪽)
  mouthDy: number;   // 입 행 오프셋 (cy 기준, +아래)
  xs:      number;   // 표정 내부 픽셀 오프셋 스케일
}

/* 몸 스케일: 1단계는 절반 크기, 5단계는 풀사이즈 */
const BODY_SCALE: Record<GrowthLevel, number> = {
  1: 0.55, 2: 0.70, 3: 0.82, 4: 0.91, 5: 1.00,
};

/*
 * 얼굴은 몸보다 덜 줄어든다 → 저레벨에서 눈이 몸 대비 상대적으로 커 보임.
 * eyeDy/eyeLDx/eyeRDx는 눈 간격과 위치가 좁아지며 아기 비율을 만든다.
 */
const FACE_LV: Record<GrowthLevel, FaceConfig> = {
  1: { eyeDy: 2, eyeLDx: -3, eyeRDx:  3, mouthDy: 4, xs: 0.55 },
  2: { eyeDy: 2, eyeLDx: -4, eyeRDx:  4, mouthDy: 5, xs: 0.68 },
  3: { eyeDy: 2, eyeLDx: -5, eyeRDx:  4, mouthDy: 7, xs: 0.82 },
  4: { eyeDy: 3, eyeLDx: -6, eyeRDx:  5, mouthDy: 7, xs: 0.91 },
  5: { eyeDy: 3, eyeLDx: -6, eyeRDx:  5, mouthDy: 8, xs: 1.00 },
};

/*
 * 얼굴 픽셀 그리기. 위치 좌표(er/elc/erc/mr/mc)는 buildFrame에서 계산해서 전달.
 * xs = 표정 내부 픽셀 간격 스케일 (입 너비, 눈썹 오프셋 등에 적용).
 */
function drawFace(
  g: PixelFrame,
  state: CharacterState, pal: CharacterPalette,
  er: number, elc: number, erc: number,
  mr: number, mc: number,
  xs: number,
): void {
  const s = (n: number) => Math.round(n * xs);

  /* ── 눈 ── */
  const dotL = () => { pxSet(g, er, elc, pal.eye); pxSet(g, er + 1, elc, pal.eye); };
  const dotR = () => { pxSet(g, er - 1, erc, pal.eye); pxSet(g, er, erc, pal.eye); };

  if (state === 'sleeping') {
    hline(g, er, elc, elc + s(2), pal.eye);
    hline(g, er, erc, erc + s(2), pal.eye);

  } else if (state === 'tired' || state === 'sedentary') {
    dotL(); dotR();
    pxSet(g, er - s(2), elc, pal.shd);
    pxSet(g, er - s(2), erc, pal.shd);
    if (state === 'tired') {
      hline(g, er + s(4), elc - s(2), elc + s(2), pal.circ!);
      hline(g, er + s(4), erc - s(2), erc + s(2), pal.circ!);
      pxSet(g, er - s(5), elc + s(2), pal.shd);
      pxSet(g, er - s(5), erc - s(2), pal.shd);
      pxSet(g, er - s(7), elc + s(4), pal.shd);
      pxSet(g, er - s(7), erc - s(4), pal.shd);
    }

  } else if (state === 'overfed') {
    hline(g, er, elc, elc + s(2), pal.eye);
    hline(g, er, erc, erc + s(2), pal.eye);

  } else if (state === 'workout') {
    /* 눈 — 집중 일자 눈 (squint) */
    hline(g, er, elc, elc + s(2), pal.eye);
    hline(g, er, erc, erc + s(2), pal.eye);
    /* 눈썹 — 안쪽이 낮은 찌푸린 눈썹 */
    pxSet(g, er - s(4), elc - s(1), pal.eye); pxSet(g, er - s(3), elc + s(1), pal.eye);
    pxSet(g, er - s(3), erc + s(1), pal.eye); pxSet(g, er - s(4), erc + s(3), pal.eye);

  } else if (state === 'flex') {
    hline(g, er, elc, elc + s(2), pal.eye);
    hline(g, er, erc, erc + s(2), pal.eye);
    pxSet(g, er - s(5), elc + s(2), pal.eye); pxSet(g, er - s(3), elc,        pal.eye);
    pxSet(g, er - s(5), erc,        pal.eye); pxSet(g, er - s(3), erc + s(2), pal.eye);

  } else if (state === 'derailed') {
    /* 눈 — ㅜ자 (가로 눈꺼풀 + 아래로 흘러내리는 줄기) */
    hline(g, er - 1, elc - s(1), elc + s(1), pal.eye);
    pxSet(g, er,     elc, pal.eye);
    pxSet(g, er + 1, elc, pal.eye);
    hline(g, er - 1, erc - s(1), erc + s(1), pal.eye);
    pxSet(g, er,     erc, pal.eye);
    pxSet(g, er + 1, erc, pal.eye);
    /* 눈썹 — 안쪽이 처진 슬픈 슬라이트 (\ /) */
    pxSet(g, er - s(5), elc - s(2), pal.shd); pxSet(g, er - s(4), elc,        pal.shd);
    pxSet(g, er - s(5), erc + s(2), pal.shd); pxSet(g, er - s(4), erc,        pal.shd);

  } else {  /* neutral, happy */
    dotL(); dotR();
    if (state === 'happy') {
      hline(g, er + s(6), elc - s(4), elc,        pal.shd);
      hline(g, er + s(6), erc,        erc + s(4), pal.shd);
    }
  }

  /* ── 입 ── */
  if (state === 'happy' || state === 'flex') {
    /* 위가 넓고 아래로 좁아지는 연속 아치 */
    pxSet(g, mr - s(3), mc - s(10), pal.mouth); pxSet(g, mr - s(3), mc + s(10), pal.mouth);
    hline(g, mr - s(1), mc - s(12), mc + s(12), pal.mouth);
    hline(g, mr,        mc - s(12), mc + s(12), pal.mouth);
    hline(g, mr + s(1), mc - s(9),  mc + s(9),  pal.mouth);
    hline(g, mr + s(2), mc - s(6),  mc + s(6),  pal.mouth);
    hline(g, mr + s(3), mc - s(3),  mc + s(3),  pal.mouth);
  } else if (state === 'workout') {
    /* 이를 악문 노력 표정 — 작은 직사각형 입 */
    hline(g, mr,        mc - s(4), mc + s(4), pal.mouth);
    pxSet(g, mr + s(1), mc - s(4), pal.mouth); pxSet(g, mr + s(1), mc + s(4), pal.mouth);
    hline(g, mr + s(2), mc - s(4), mc + s(4), pal.mouth);
  } else if (state === 'tired' || state === 'sleeping' || state === 'sedentary') {
    hline(g, mr,     mc - s(4), mc + s(4), pal.mouth);
    pxSet(g, mr + 1, mc - s(5), pal.mouth); pxSet(g, mr + 1, mc + s(5), pal.mouth);
  } else if (state === 'derailed') {
    /* 양 끝이 처진 프라운 (의욕 없음) */
    hline(g, mr,     mc - s(4), mc + s(4), pal.mouth);
    pxSet(g, mr + 1, mc - s(5), pal.mouth); pxSet(g, mr + 1, mc + s(5), pal.mouth);
    pxSet(g, mr + 2, mc - s(6), pal.mouth); pxSet(g, mr + 2, mc + s(6), pal.mouth);
  } else if (state === 'overfed') {
    hline(g, mr,     mc - s(4), mc + s(4), pal.mouth);
    pxSet(g, mr + 1, mc - s(5), pal.mouth); pxSet(g, mr + 1, mc + s(5), pal.mouth);
  } else {
    hline(g, mr, mc - s(4), mc + s(4), pal.mouth);
  }
}

/* ════════════════════════════════════════════
   buildFrame
════════════════════════════════════════════ */

export function buildFrame(
  state:      CharacterState,
  frameIndex: number,
  options:    RenderOptions = {},
): PixelFrame {
  const g: PixelFrame = new Array(N).fill(null);
  const fi  = frameIndex;
  const { accessories = [], effect } = options;
  const workoutPart = options.workoutPart as WorkoutPart | undefined;

  /* 몸 색상은 에너지 레벨이 결정, 나머지(eye/mouth/이펙트)는 state가 결정 */
  const el: EnergyLevel = options.energyLevel ?? 3;
  const pal: CharacterPalette = { ...PALETTES[state], ...ENERGY_BODY[el] };

  /* 애니메이션 오프셋 */
  let dy = 0, dx = 0;
  if (state === 'neutral')   dy = fi === 1 ? -3 : 0;
  if (state === 'happy')     dy = [0, -3, -6][fi % 3];
  if (state === 'tired')     dy = fi === 1 ?  3 : 0;
  if (state === 'workout')   { dy = fi % 2 === 1 ? -3 : 0; dx = fi >= 2 ? 3 : 0; }
  if (state === 'sedentary') dy = fi === 1 ?  2 : 0;
  if (state === 'overfed')   dx = fi === 1 ?  1 : 0;

  const cx = 49.5 + dx;
  const cy = 49.5 + dy;

  /* 성장 레벨 → 몸 스케일 + 얼굴 설정 */
  const gl = (options.growthLevel ?? 5) as GrowthLevel;
  const sc = BODY_SCALE[gl];
  const fc = FACE_LV[gl];

  /* 얼굴 위치 (buildFrame과 drawFace가 공유 — 상태별 FX에서도 참조) */
  const er  = Math.round(cy + fc.eyeDy);
  const elc = Math.round(cx + fc.eyeLDx);
  const erc = Math.round(cx + fc.eyeRDx);
  const mr  = Math.round(cy + fc.mouthDy);
  const mc  = Math.round(cx);

  /* L1: 배경 이펙트 */
  if (effect === 'aura') drawAuraEffect(g, cx, cy, pal.glow ?? pal.hi, fi);

  /* L2: 몸통 (sc로 전체 스케일) */
  const blobCfg = state === 'sedentary'  ? BLOB_THIN
                : state === 'overfed'    ? BLOB_CHUBBY
                : workoutPart            ? WORKOUT_BLOB[workoutPart]
                : BLOB_NORMAL;
  dittoBlob(g, cx, cy, pal.body, pal.shd, pal.hi, blobCfg, sc);
  if (workoutPart === 'core') drawAbs(g, cx, cy, sc, pal.shd);

  /* L3: 몸통·손발 액세서리 */
  if ((accessories as AccessoryType[]).includes('wristband'))     drawWristband(g, cx, cy, sc);
  if ((accessories as AccessoryType[]).includes('dumbbells'))     drawDumbbells(g, cx, cy, sc);
  if ((accessories as AccessoryType[]).includes('medal'))         drawMedalItem(g, cx, cy, sc);
  if ((accessories as AccessoryType[]).includes('water_bottle'))  drawWaterBottle(g, cx, cy, sc);
  if ((accessories as AccessoryType[]).includes('running_shoes')) drawRunningShoes(g, cx, cy, sc);

  /* L4: 얼굴 */
  drawFace(g, state, pal, er, elc, erc, mr, mc, fc.xs);

  /* L5: 머리 액세서리 */
  if ((accessories as AccessoryType[]).includes('headband'))   drawHeadband(g, cx, cy, sc);
  if ((accessories as AccessoryType[]).includes('crown'))      drawCrown(g, cx, cy, sc);
  if ((accessories as AccessoryType[]).includes('sunglasses')) drawSunglasses(g, cx, cy, sc, er);
  if ((accessories as AccessoryType[]).includes('earphones'))  drawEarphones(g, cx, cy, sc);

  /* L6: 상태별 특수 FX */

  if (state === 'sleeping') {
    const f = fi % 3;
    drawZ(g, 14 - f * 3, 52, pal.zzz!);
    drawZ(g,  4 - f * 3, 60, pal.zzz!);
    if (f === 0) { oval(g, 72, 10, 8, 8, pal.zzz!); oval(g, 78, 8, 6, 6, BG); }
  }

  if (state === 'workout' && fi % 2 === 1) {
    /* 모션 트레일 + 땀방울 — sc로 위치 조정 */
    const tc = Math.round(cx - 34 * sc);
    const th = Math.round(7 * sc);
    for (let tr = -th; tr <= th * 2; tr++) pxSet(g, Math.round(cy) + tr, tc,     pal.trail!);
    for (let tr = -th; tr <= th;     tr++) pxSet(g, Math.round(cy) + tr, tc + 4, pal.trail!);
    const swC = Math.round(cx + 24 * sc);
    pxSet(g, er - 3, swC,     pal.sweat!);
    pxSet(g, er - 1, swC,     pal.sweat!);
    pxSet(g, er - 1, swC + 1, pal.sweat!);
  }

  if (state === 'happy' && fi === 2) {
    /* 반짝임 — sc로 위치 조정 */
    const sx = Math.round(cx + 22 * sc), sy = Math.round(cy - 22 * sc);
    pxSet(g, sy,     sx,     pal.glow!); pxSet(g, sy - 2, sx,     pal.glow!);
    pxSet(g, sy + 2, sx,     pal.glow!); pxSet(g, sy,     sx - 2, pal.glow!);
    pxSet(g, sy,     sx + 2, pal.glow!);
  }

  if (state === 'flex') {
    /* 굽힌 팔 + 메달 — sc 전체 적용 */
    const armOff = (-13 + (fi === 1 ? -2 : 0)) * sc;
    const armY   = cy + armOff;
    oval(g, cx - 26 * sc, armY, 10 * sc, 8 * sc, pal.arm!);
    oval(g, cx + 26 * sc, armY, 10 * sc, 8 * sc, pal.arm!);
    pxSet(g, Math.round(armY - 4 * sc), Math.round(cx - 32 * sc), pal.hi);
    pxSet(g, Math.round(armY - 4 * sc), Math.round(cx + 30 * sc), pal.hi);
    oval(g, cx - 26 * sc, armY - 10 * sc, 6 * sc, 6 * sc, pal.medal!);
    pxSet(g, Math.round(armY - 10 * sc), Math.round(cx - 26 * sc), pal.hi);
    if (fi === 1) {
      const sx = Math.round(cx + 22 * sc), sy = Math.round(cy - 26 * sc);
      pxSet(g, sy,     sx,     pal.shine!); pxSet(g, sy - 2, sx,     pal.shine!);
      pxSet(g, sy + 2, sx,     pal.shine!); pxSet(g, sy,     sx - 2, pal.shine!);
      pxSet(g, sy,     sx + 2, pal.shine!);
    }
  }

  if (state === 'sedentary') {
    /* 피로 땀방울 */
    const swC = erc + Math.round(18 * sc);
    pxSet(g, er,     swC,     pal.sweat!);
    pxSet(g, er + 2, swC,     pal.sweat!);
    pxSet(g, er + 2, swC - 1, pal.sweat!);
  }

  if (state === 'derailed') {
    /* 머리 위 먹구름 + 빗방울 — sc로 위치 조정 */
    const cX = Math.round(cx + 15 * sc);
    const cY = Math.round(cy - 32 * sc);
    oval(g, cX,                       cY,                       Math.round(8 * sc), Math.round(5 * sc), pal.cloud!);
    oval(g, cX + Math.round(7 * sc), cY - Math.round(3 * sc), Math.round(5 * sc), Math.round(4 * sc), pal.cloud!);
    oval(g, cX - Math.round(6 * sc), cY - Math.round(2 * sc), Math.round(5 * sc), Math.round(4 * sc), pal.cloud!);
    const dropY = cY + Math.round(7 * sc) + fi * 2;
    pxSet(g, dropY,     cX - Math.round(2 * sc), pal.rain!); pxSet(g, dropY + 1, cX - Math.round(2 * sc), pal.rain!);
    pxSet(g, dropY,     cX + Math.round(4 * sc), pal.rain!); pxSet(g, dropY + 1, cX + Math.round(4 * sc), pal.rain!);
  }

  /* L7: 전경 이펙트 */
  if (effect === 'fire')          drawFireEffect(g, cx, cy, sc, fi);
  if (effect === 'sparkles')      drawSparklesEffect(g, cx, cy, sc, fi);
  if (effect === 'moon_stars')    drawMoonStarsEffect(g, cx, cy, sc);
  if (effect === 'rain_cloud')    drawRainCloudEffect(g, cx, cy, sc, fi);
  if (effect === 'speed_lines')   drawSpeedLinesEffect(g, cx, cy, sc, fi);
  if (effect === 'recovery_glow') drawRecoveryGlowEffect(g, cx, cy, fi);
  if (effect === 'heart_beat')    drawHeartBeatEffect(g, cx, cy, sc, fi);

  return g;
}
