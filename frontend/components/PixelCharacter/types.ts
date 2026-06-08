/**
 * 픽셀 캐릭터 타입 정의
 * mocum 통합 시 frontend/types/character.ts 로 이동
 */

export type CharacterState =
  | 'neutral'    // 기본 — 라벤더
  | 'happy'      // 최고 컨디션 — 골드
  | 'tired'      // 수면 부족 — 회청
  | 'sleeping'   // 수면 중 — 딥블루
  | 'workout'    // 운동 중 — 레드
  | 'flex'       // 운동 완료 — 골드
  | 'sedentary'  // 운동 부족 — 뮤트 보라
  | 'overfed'    // 과식/식단 불균형 — 민트
  | 'derailed';  // 루틴 깨짐 — 다크 그레이

/** 100×100 = 10000개 픽셀의 색상 배열. null = 투명 */
export type PixelFrame = (string | null)[];

/** 착용 가능한 액세서리 종류 (중복 가능) */
export type AccessoryType =
  | 'headband'      // 헤드밴드
  | 'dumbbells'     // 아령
  | 'crown'         // 왕관
  | 'sunglasses'    // 선글라스
  | 'wristband'     // 손목밴드
  | 'medal'         // 메달 (목걸이)
  | 'water_bottle'  // 물통 (수분 보충)
  | 'running_shoes' // 러닝화 (솔 컬러)
  | 'earphones';    // 무선 이어폰 (운동 중 음악)

/** 상태 오버레이 이펙트 (하나만 활성) */
export type EffectType =
  | 'fire'           // 불꽃 오라
  | 'sparkles'       // 스파클 (목표 달성)
  | 'moon_stars'     // 달·별 (수면 완료)
  | 'aura'           // 에너지 오라
  | 'rain_cloud'     // 먹구름
  | 'speed_lines'    // 속도선 (러닝 중)
  | 'recovery_glow'  // 회복 오라 (따뜻한 빛)
  | 'heart_beat';    // 하트 (동기부여·성취)

/** 성장 단계 1-5 (캐릭터 크기·밝기 영향) */
export type GrowthLevel = 1 | 2 | 3 | 4 | 5;

/** 에너지 레벨 0-6 (몸 색상 결정) */
export type EnergyLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 운동 집중 부위 — 해당 부위 체형으로 발달 */
export type WorkoutPart = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';

/** buildFrame 옵션 */
export interface RenderOptions {
  accessories?: AccessoryType[];
  effect?:      EffectType;
  growthLevel?: GrowthLevel;
  energyLevel?: EnergyLevel;
  workoutPart?: WorkoutPart;
}

/** 각 상태의 팔레트 */
export interface CharacterPalette {
  body:   string;
  hi:     string;
  shd:    string;
  eye:    string;
  mouth:  string;
  trail?: string;
  circ?:  string;
  zzz?:   string;
  glow?:  string;
  arm?:   string;
  shine?: string;
  sweat?: string;
  medal?: string;
  cloud?: string;
  rain?:  string;
}

/** 상태 메타데이터 */
export interface StateConfig {
  fps:        number;
  frameCount: number;
  label:      string;
}

/**
 * 네 기둥 건강 지표 — 각 0~100
 *   수면  → 에너지   (낮으면 tired)
 *   운동  → 성장     (낮으면 sedentary)
 *   식단  → 영양     (낮으면 overfed)
 *   루틴  → 행복     (낮으면 derailed)
 */
export interface CharacterStats {
  sleep:    number;
  exercise: number;
  diet:     number;
  routine:  number;
}

/** 백엔드 API 응답 */
export interface CharacterData {
  stats:           CharacterStats;
  workout_status:  'none' | 'active' | 'completed';
  is_sleeping:     boolean;
  character_level: number;
  character_xp:    number;
  workout_part?:   WorkoutPart;  // 가장 최근 집중 운동 부위
}

/** 기둥 점수 임계값 */
export const SCORE_CRITICAL = 40;  // 이하면 해당 부족 상태 발동
export const SCORE_GREAT    = 75;  // 전체 평균 이상이면 happy
export const SCORE_OVERFED  = 20;  // 루틴 점수가 이 미만이면 derailed → overfed 전환

/**
 * 에너지 레벨 계산: (수면점수 + 루틴점수) / 2 → EnergyLevel 0~6.
 * API 명세의 공식: Math.min(6, Math.floor(score * 7 / 100))
 */
export function resolveEnergyLevel(data: CharacterData): EnergyLevel {
  const score = (data.stats.sleep + data.stats.routine) / 2;
  return Math.min(6, Math.floor(score * 7 / 100)) as EnergyLevel;
}

/**
 * character_level(1~5) → GrowthLevel. 범위 밖 값은 클램프.
 */
export function resolveGrowthLevel(data: CharacterData): GrowthLevel {
  return Math.max(1, Math.min(5, Math.round(data.character_level))) as GrowthLevel;
}

/**
 * 백엔드 데이터 → CharacterState 변환.
 *
 * 우선순위:
 *  1. 실시간 행동  (workout / sleeping / flex)
 *  2. 가장 낮은 기둥이 SCORE_CRITICAL 미만이면 해당 부족 상태
 *     — 우선순위: 수면(에너지) > 운동(성장) > 식단(영양) > 루틴(행복)
 *  3. 전체 평균 SCORE_GREAT 이상 → happy
 *  4. 기본 → neutral
 */
export function resolveCharacterState(data: CharacterData): CharacterState {
  const { workout_status, is_sleeping, stats } = data;

  // 1. 실시간 상태
  if (workout_status === 'active')    return 'workout';
  if (is_sleeping)                    return 'sleeping';
  if (workout_status === 'completed') return 'flex';

  // 2. 기둥별 부족 상태 — 낮은 순으로 정렬해 가장 심각한 기둥이 이김
  // routine < SCORE_OVERFED(20) 이면 derailed 대신 overfed (심각한 루틴 이탈 → 통통해짐)
  const pillars: [number, CharacterState][] = [
    [stats.sleep,    'tired'],
    [stats.exercise, 'sedentary'],
    [stats.diet,     'overfed'],
    [stats.routine,  stats.routine < SCORE_OVERFED ? 'overfed' : 'derailed'],
  ];

  let worstScore = 101;
  let worstState: CharacterState = 'neutral';
  for (const [score, state] of pillars) {
    if (score < worstScore) { worstScore = score; worstState = state; }
  }
  if (worstScore < SCORE_CRITICAL) return worstState;

  // 3. 전체 평균이 좋으면 happy
  const avg = (stats.sleep + stats.exercise + stats.diet + stats.routine) / 4;
  if (avg >= SCORE_GREAT) return 'happy';

  return 'neutral';
}
