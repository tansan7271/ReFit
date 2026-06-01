/**
 * 운동 플랜·세션 스토어 (Zustand)
 * - plans / sessions 각자 loading 플래그를 분리해 race condition 방지
 * - loaded 플래그로 화면 재진입 시 중복 호출 방지
 */
import { create } from 'zustand';

import {
  fetchWorkoutPlans,
  fetchWorkoutSessions,
  startWorkoutSession,
} from '@/services/api';
import type { WorkoutPlan, WorkoutSessionSummary } from '@/types';

interface WorkoutState {
  plans: WorkoutPlan[];
  sessions: WorkoutSessionSummary[];
  currentSessionId: number | null;
  lastSession: WorkoutSessionSummary | null;
  plansLoading: boolean;
  sessionsLoading: boolean;
  plansLoaded: boolean;
  sessionsLoaded: boolean;
  error: string | null;

  fetchPlans: (force?: boolean) => Promise<void>;
  fetchSessions: (force?: boolean) => Promise<void>;
  startSession: (planId?: number) => Promise<number | null>;
  setCurrentSessionId: (id: number | null) => void;
  setLastSession: (session: WorkoutSessionSummary) => void;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  plans: [],
  sessions: [],
  currentSessionId: null,
  lastSession: null,
  plansLoading: false,
  sessionsLoading: false,
  plansLoaded: false,
  sessionsLoaded: false,
  error: null,

  fetchPlans: async (force = false) => {
    if (!force && get().plansLoaded) return;
    if (get().plansLoading) return;
    set({ plansLoading: true, error: null });
    try {
      const plans = await fetchWorkoutPlans();
      set({ plans, plansLoaded: true });
    } catch {
      set({ error: '운동 플랜을 불러오지 못했어요.' });
    } finally {
      set({ plansLoading: false });
    }
  },

  fetchSessions: async (force = false) => {
    if (!force && get().sessionsLoaded) return;
    if (get().sessionsLoading) return;
    set({ sessionsLoading: true, error: null });
    try {
      const sessions = await fetchWorkoutSessions();
      set({ sessions, sessionsLoaded: true });
    } catch {
      set({ error: '운동 기록을 불러오지 못했어요.' });
    } finally {
      set({ sessionsLoading: false });
    }
  },

  startSession: async (planId) => {
    try {
      const { id } = await startWorkoutSession(planId);
      set({ currentSessionId: id });
      return id;
    } catch {
      return null;
    }
  },

  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  setLastSession: (session) => set({ lastSession: session }),

  reset: () =>
    set({
      plans: [],
      sessions: [],
      currentSessionId: null,
      lastSession: null,
      plansLoaded: false,
      sessionsLoaded: false,
      plansLoading: false,
      sessionsLoading: false,
      error: null,
    }),
}));
