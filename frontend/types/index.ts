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

/** 숙련도 */
export type SkillLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced';

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
  skillLevel: SkillLevel | null;
}

/** 성별 — 백엔드 Gender enum 과 일치 */
export type Gender = 'male' | 'female' | 'other';

/**
 * 온보딩 전체 페이로드 — POST /users/me/onboard 로 전송.
 * 백엔드 OnboardingRequest 스키마(snake_case)와 필드명을 일치시킨다.
 * 아직 수집 화면이 없는 필드는 undefined 로 전송될 수 있다.
 */
export interface OnboardingPayload {
  age?: number;
  gender?: Gender;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_level: SkillLevel | null;
  goal?: string;
  character_emoji?: string;
  /** 취침 목표 시각 "HH:MM" */
  sleep_goal_bedtime: string;
  /** 기상 목표 시각 "HH:MM" */
  sleep_goal_wakeup: string;
  routines: DayRoutine[];
  healthLinked: boolean;
}

/** 인증 유저 */
export interface User {
  id: string;
  email: string;
  nickname: string;
  is_onboarding_complete: boolean;
}
