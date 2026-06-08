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
  planned_time?: string | null; // "HH:MM" UTC
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
  skillLevel: SkillLevel | null;
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
  fitness_level: FitnessLevel | undefined;
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

/**
 * 프로필 수정 페이로드 — PATCH /users/me.
 * 백엔드 UserProfileUpdate 스키마(모든 필드 선택)와 일치. 전달된 필드만 갱신된다.
 */
export interface ProfileUpdatePayload {
  nickname?: string;
  age?: number;
  gender?: Gender;
  height_cm?: number;
  weight_kg?: number;
  fitness_level?: FitnessLevel;
  goal?: string;
  character_emoji?: string;
}

/** 알림 설정 — 백엔드 NotificationSettingResponse 와 일치 */
export interface NotificationSettings {
  workout_reminder: boolean;
  workout_reminder_time: string | null;
  sleep_reminder: boolean;
  sleep_reminder_time: string | null;
  friend_poke: boolean;
  achievement: boolean;
  ai_coaching: boolean;
}

/**
 * 알림 설정 수정 페이로드 — PATCH /notifications/settings.
 * 백엔드 NotificationSettingUpdate 와 일치. 전달된 필드만 갱신된다.
 */
export interface NotificationSettingsUpdate {
  workout_reminder?: boolean;
  workout_reminder_time?: string;
  sleep_reminder?: boolean;
  sleep_reminder_time?: string;
  friend_poke?: boolean;
  achievement?: boolean;
  ai_coaching?: boolean;
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
  planned_time: string | null; // "HH:MM" UTC
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
  ai_feedback?: string | null;
  completed_parts?: string | null;
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

// ── Sleep ─────────────────────────────────────────────────────────────────────

/** 백엔드 SleepQuality enum 값 */
export type SleepQuality = 'very_bad' | 'bad' | 'normal' | 'good' | 'very_good';

/**
 * 수면 기록 1건 — 백엔드 SleepRecordResponse 와 일치.
 * `source` 는 정수 코드(1=manual, 2=apple_health, 3=galaxy_health).
 */
export interface SleepRecord {
  id: number;
  sleep_start: string;
  sleep_end: string;
  duration_minutes: number;
  quality: SleepQuality | null;
  quality_score: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  light_sleep_minutes: number | null;
  awake_minutes: number | null;
  heart_rate_avg: number | null;
  hrv_ms: number | null;
  memo: string | null;
  source: number | null;
  created_at: string;
}

/** GET /sleep/stats — 백엔드 SleepStatResponse 와 일치 */
export interface SleepStats {
  period_days: number;
  avg_duration_minutes: number;
  avg_quality_score: number | null;
  total_records: number;
}

// ── Community ─────────────────────────────────────────────────────────────────

/** 친구 관계 상태 — 백엔드 FriendshipStatus enum 과 일치 */
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

/**
 * 친구 1명 — 백엔드 FriendInfo 와 일치.
 * GET /community/friends 응답.
 */
export interface Friend {
  friendship_id: number;
  user_id: number;
  nickname: string;
  character_emoji: string;
  character_level: number;
  status: FriendshipStatus;
}

/**
 * 받은 콕 찌르기 1건 — 백엔드 PokeResponse 와 일치.
 * 주의: 백엔드는 sender_nickname/sender_emoji 를 포함하지 않으므로
 * 발신자 정보가 필요하면 별도 사용자 조회가 필요하다.
 */
export interface Poke {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string | null;
  created_at: string;
}

/**
 * 친구의 최근 운동 활동 요약 — 백엔드 FriendActivityResponse 와 일치.
 * GET /community/friends/{friend_id}/activity 응답.
 */
export interface FriendActivity {
  user_id: number;
  nickname: string;
  character_emoji: string;
  character_level: number;
  workout_count_this_week: number;
  last_worked_out_at: string | null;
  worked_out_today: boolean;
}

/**
 * Co-op 축하 결과 — 백엔드 CoopCelebrateResponse 와 일치.
 * POST /community/coop/celebrate/{friend_id} 응답.
 */
export interface CoopCelebrateResponse {
  both_worked_out_today: boolean;
  message: string;
}
