/**
 * 온보딩 진행 상태 스토어 (Zustand)
 * 5개 화면을 거치며 수집한 값을 누적했다가 마지막에 한 번에 제출한다.
 */
import { create } from 'zustand';

import type {
  BodyPart,
  DayRoutine,
  Gender,
  OnboardingPayload,
  PhysicalProfile,
  SkillLevel,
  SleepGoal,
  Weekday,
} from '@/types';

/** 온보딩 단계 순서 — 진행 도트 인디케이터 계산에 사용 */
export const ONBOARDING_STEPS = [
  'workout-routine',
  'sleep-goal',
  'physical-profile',
  'personal-info',
  'health-connect',
  'character-intro',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** 7개 요일 빈 루틴 초기값 */
const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const emptyRoutines = (): DayRoutine[] =>
  WEEKDAYS.map((day) => ({ day, bodyParts: [] }));

interface OnboardingState {
  routines: DayRoutine[];
  sleepGoal: SleepGoal;
  physicalProfile: PhysicalProfile;
  healthLinked: boolean;
  /** 나이 — 인적사항 화면에서 수집 */
  age: number | null;
  /** 성별 — 인적사항 화면에서 수집 */
  gender: Gender | null;
  /** 캐릭터 이모지 — 캐릭터 소개 화면에서 수집 */
  characterEmoji: string | null;
  /** 운동 목표 — 캐릭터 소개 화면에서 수집 */
  goal: string | null;

  /** 운동 부위 토글 */
  toggleBodyPart: (day: Weekday, part: BodyPart) => void;
  setSleepGoal: (goal: Partial<SleepGoal>) => void;
  setPhysicalProfile: (profile: Partial<PhysicalProfile>) => void;
  setSkillLevel: (level: SkillLevel) => void;
  setHealthLinked: (linked: boolean) => void;
  /** 인적사항(나이/성별) 설정 */
  setPersonalInfo: (age: number, gender: Gender) => void;
  /** 캐릭터 정보(이모지/목표) 설정 */
  setCharacterInfo: (emoji: string, goal: string) => void;

  /** 제출용 페이로드 생성 */
  buildPayload: () => OnboardingPayload;
  /** 초기화 (온보딩 재진입 시) */
  reset: () => void;
}

const initialState = {
  routines: emptyRoutines(),
  sleepGoal: { wakeTime: '07:00', bedTime: '23:30' } as SleepGoal,
  physicalProfile: {
    heightCm: null,
    weightKg: null,
    skillLevel: null,
  } as PhysicalProfile,
  healthLinked: false,
  age: null as number | null,
  gender: null as Gender | null,
  characterEmoji: null as string | null,
  goal: null as string | null,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...initialState,

  toggleBodyPart: (day, part) =>
    set((state) => ({
      routines: state.routines.map((r) => {
        if (r.day !== day) return r;
        const has = r.bodyParts.includes(part);
        return {
          ...r,
          bodyParts: has
            ? r.bodyParts.filter((p) => p !== part)
            : [...r.bodyParts, part],
        };
      }),
    })),

  setSleepGoal: (goal) =>
    set((state) => ({ sleepGoal: { ...state.sleepGoal, ...goal } })),

  setPhysicalProfile: (profile) =>
    set((state) => ({
      physicalProfile: { ...state.physicalProfile, ...profile },
    })),

  setSkillLevel: (skillLevel) =>
    set((state) => ({
      physicalProfile: { ...state.physicalProfile, skillLevel },
    })),

  setHealthLinked: (healthLinked) => set({ healthLinked }),

  setPersonalInfo: (age, gender) => set({ age, gender }),

  setCharacterInfo: (emoji, goal) => set({ characterEmoji: emoji, goal }),

  buildPayload: () => {
    const {
      routines,
      sleepGoal,
      physicalProfile,
      healthLinked,
      age,
      gender,
      characterEmoji,
      goal,
    } = get();
    return {
      // 인적사항 — 화면 미구현, 값이 없으면 undefined 로 전송
      age: age ?? undefined,
      gender: gender ?? undefined,
      // 신체 정보 — snake_case 로 변환
      height_cm: physicalProfile.heightCm,
      weight_kg: physicalProfile.weightKg,
      fitness_level: physicalProfile.skillLevel,
      // 캐릭터 정보 — 화면 미구현, 값이 없으면 undefined 로 전송
      goal: goal ?? undefined,
      character_emoji: characterEmoji ?? undefined,
      // 수면 목표 — 백엔드 필드명에 맞춰 snake_case 로 변환
      sleep_goal_bedtime: sleepGoal.bedTime,
      sleep_goal_wakeup: sleepGoal.wakeTime,
      routines,
      healthLinked,
    };
  },

  reset: () => set({ ...initialState, routines: emptyRoutines() }),
}));
