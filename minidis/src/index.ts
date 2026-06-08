/**
 * PixelCharacter 모듈 — public API
 * mocum 통합 시 frontend/components/PixelCharacter/index.ts 로 이동
 *
 * import { PixelCharacterFromData, CELL_SIZE } from '@/components/PixelCharacter';
 */

/* ── 타입 ──────────────────────────────────── */
export type {
  CharacterState,
  CharacterStats,
  CharacterData,
  CharacterPalette,
  StateConfig,
  PixelFrame,
  AccessoryType,
  EffectType,
  GrowthLevel,
  EnergyLevel,
  WorkoutPart,
  RenderOptions,
} from './types';

/* ── 유틸 함수 ─────────────────────────────── */
export {
  SCORE_CRITICAL,
  SCORE_GREAT,
  resolveCharacterState,
  resolveEnergyLevel,
  resolveGrowthLevel,
} from './types';

/* ── 훅 ────────────────────────────────────── */
export { usePixelCharacter, useCharacterFromData } from './usePixelCharacter';
export type {
  PixelCharacterController,
  UsePixelCharacterResult,
  CharacterDataExtras,
} from './usePixelCharacter';

/* ── 컴포넌트 + 상수 ──────────────────────── */
export {
  CELL_SIZE,
  PixelGrid,
  PixelCharacter,
  PixelCharacterFromData,
} from './PixelCharacter';
export type {
  CellSizeKey,
  PixelGridProps,
  PixelCharacterProps,
  PixelCharacterFromDataProps,
} from './PixelCharacter';

/* ── 렌더 엔진 (고급 사용자용) ──────────────── */
export {
  buildFrame,
  STATE_CONFIGS,
  PALETTES,
  ENERGY_BODY,
  COLS,
  ROWS,
  N,
  BG,
} from './pixelEngine';
