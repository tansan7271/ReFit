/** ReFit 공통 도메인 타입 */

/** 요일 (월~일) */
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** 헬스 운동 부위 */
export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulder'
  | 'arm'
  | 'leg'
  | 'core'
  | 'cardio';

/** 숙련도 — 백엔드 FitnessLevel enum 과 일치 */
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'athlete';

/** 온보딩 UI 숙련도 — 백엔드와 달리 'novice' 포함 (제출 시 'beginner' 로 매핑) */
export type SkillLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced';

/** 성별 — 백엔드 Gender enum 과 일치 */
export type Gender = 'male' | 'female' | 'other';

/** 요일별 루틴 1건 (해당 요일에 운동할 부위 목록) */
export interface DayRoutine {
  day: Weekday;
  bodyParts: BodyPart[];
}

/** 수면 목표 (24시간 "HH:mm") */
export interface SleepGoal {
  wakeTime: string;
  bedTime: string;
}

/** 신체 정보 */
export interface PhysicalProfile {
  heightCm: number | null;
  weightKg: number | null;
  skillLevel: FitnessLevel | null;
}

/**
 * 온보딩 전체 페이로드 — POST /users/me/onboard 로 전송.
 * 백엔드 OnboardingRequest 스키마(snake_case)와 필드명을 일치시킨다.
 */
export interface OnboardingPayload {
  age?: number;
  gender?: Gender;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_level: SkillLevel | FitnessLevel | null;
  goal?: string;
  character_emoji?: string;
  /** 취침 목표 시각 "HH:MM" */
  sleep_goal_bedtime: string;
  /** 기상 목표 시각 "HH:MM" */
  sleep_goal_wakeup: string;
  routines: DayRoutine[];
  healthLinked: boolean;
}

/** 인증 유저 — 백엔드 UserResponse 와 일치 */
export interface User {
  id: number;
  email: string;
  nickname: string;
  age: number | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_level: FitnessLevel;
  goal: string | null;
  sleep_goal_bedtime: string | null;
  sleep_goal_wakeup: string | null;
  sleep_goal_minutes: number | null;
  character_emoji: string;
  character_level: number;
  character_xp: number;
  is_onboarding_complete: boolean;
  created_at: string;
}

// ── Workout ───────────────────────────────────────────────────────────────────

export interface Exercise {
  id: number;
  name: string;
  name_en: string | null;
  muscle_group: string;
  category: string;
  description: string | null;
  emoji: string;
}

export interface WorkoutPlanExercise {
  id: number;
  exercise_id: number;
  exercise: Exercise;
  order: number;
  target_sets: number;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_duration_sec: number | null;
}

export interface WorkoutPlan {
  id: number;
  day_of_week: number; // 0=월 ~ 6=일
  name: string | null;
  is_rest_day: boolean;
  plan_exercises: WorkoutPlanExercise[];
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';

export interface WorkoutSessionSummary {
  id: number;
  plan_id: number | null;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  total_duration_sec: number | null;
  total_volume_kg: number | null;
  calories_burned: number | null;
  xp_earned: number;
}

// ── Badge ─────────────────────────────────────────────────────────────────────

export interface Badge {
  id: number;
  name: string;
  description: string;
  emoji: string;
  category: string;
  condition_type: string;
  condition_value: number;
  xp_reward: number;
}

export interface UserBadge {
  id: number;
  badge: Badge;
  is_equipped: boolean;
  earned_at: string;
}

// ── InBody ────────────────────────────────────────────────────────────────────

export interface InBodyRecord {
  id: number;
  weight_kg: number | null;
  body_fat_percent: number | null;
  muscle_mass_kg: number | null;
  body_water_percent: number | null;
  bmi: number | null;
  visceral_fat_level: number | null;
  memo: string | null;
  measured_at: string;
  created_at: string;
}

export interface InBodyInput {
  weight_kg?: number;
  body_fat_percent?: number;
  muscle_mass_kg?: number;
  body_water_percent?: number;
  bmi?: number;
  visceral_fat_level?: number;
  memo?: string;
  measured_at: string;
}
