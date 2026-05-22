/**
 * axios 인스턴스 + API 함수
 * baseURL 은 EXPO_PUBLIC_API_URL 환경변수로 관리한다.
 * Android 에뮬레이터에서는 호스트 머신이 10.0.2.2 로 노출된다.
 */
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, storage } from '@/services/storage';
import type {
  Badge,
  InBodyInput,
  InBodyRecord,
  OnboardingPayload,
  User,
  UserBadge,
  WorkoutPlan,
  WorkoutSessionSummary,
} from '@/types';

const _envUrl = process.env.EXPO_PUBLIC_API_URL;
const BASE_URL =
  _envUrl ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');
const API_PREFIX = '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}${API_PREFIX}`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/** 요청 인터셉터 — 저장된 JWT 를 Authorization 헤더에 부착 */
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** 응답 인터셉터 — 401 시 리프레시 토큰으로 재발급 후 원 요청 재시도 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        try {
          const { data } = await axios.post<TokenResponseRaw>(
            `${BASE_URL}${API_PREFIX}/auth/refresh`,
            { refresh_token: refreshToken },
          );
          await storage.setItem(ACCESS_TOKEN_KEY, data.access_token);
          await storage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
          original.headers!.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          await storage.deleteItem(ACCESS_TOKEN_KEY);
          await storage.deleteItem(REFRESH_TOKEN_KEY);
        }
      }
    }
    return Promise.reject(error);
  },
);

/** 일관된 에러 메시지 추출 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }
    if (axiosError.code === 'ECONNABORTED') {
      return '요청 시간이 초과됐어요. 네트워크를 확인해 주세요.';
    }
    if (!axiosError.response) {
      return '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.';
    }
    return `오류가 발생했어요 (${axiosError.response.status})`;
  }
  return '알 수 없는 오류가 발생했어요.';
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface TokenResponseRaw {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user?: User;
}

/** 프론트에서 사용하는 인증 세션 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

function toAuthSession(data: TokenResponseRaw): AuthSession {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user!,
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<AuthSession> {
  const { data } = await api.post<TokenResponseRaw>('/auth/login', { email, password });
  return toAuthSession(data);
}

export async function register(
  email: string,
  password: string,
  nickname: string,
): Promise<AuthSession> {
  const { data } = await api.post<TokenResponseRaw>('/auth/register', {
    email,
    password,
    nickname,
  });
  return toAuthSession(data);
}

export async function submitOnboarding(payload: OnboardingPayload): Promise<User> {
  const { data } = await api.post<User>('/users/me/onboard', payload);
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/users/me');
  return data;
}

// ---------------------------------------------------------------------------
// Workout Plans
// ---------------------------------------------------------------------------

export async function fetchWorkoutPlans(): Promise<WorkoutPlan[]> {
  const { data } = await api.get<WorkoutPlan[]>('/workouts/plans');
  return data;
}

// ---------------------------------------------------------------------------
// Workout Sessions
// ---------------------------------------------------------------------------

export async function fetchWorkoutSessions(limit = 20): Promise<WorkoutSessionSummary[]> {
  const { data } = await api.get<WorkoutSessionSummary[]>('/workouts/sessions', {
    params: { limit },
  });
  return data;
}

export async function startWorkoutSession(planId?: number): Promise<{ id: number }> {
  const { data } = await api.post<{ id: number }>('/workouts/sessions/start', {
    plan_id: planId ?? null,
  });
  return data;
}

export async function completeWorkoutSession(
  sessionId: number,
  payload: { sets: unknown[]; calories_burned?: number; voice_memo?: string },
): Promise<WorkoutSessionSummary> {
  const { data } = await api.post<WorkoutSessionSummary>(
    `/workouts/sessions/${sessionId}/complete`,
    payload,
  );
  return data;
}

// ---------------------------------------------------------------------------
// InBody
// ---------------------------------------------------------------------------

export async function fetchInbodyHistory(limit = 10): Promise<InBodyRecord[]> {
  const { data } = await api.get<InBodyRecord[]>('/users/me/inbody', {
    params: { limit },
  });
  return data;
}

export async function submitInbody(input: InBodyInput): Promise<InBodyRecord> {
  const { data } = await api.post<InBodyRecord>('/users/me/inbody', input);
  return data;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export async function fetchAllBadges(): Promise<Badge[]> {
  const { data } = await api.get<Badge[]>('/badges');
  return data;
}

export async function fetchMyBadges(): Promise<UserBadge[]> {
  const { data } = await api.get<UserBadge[]>('/badges/me');
  return data;
}
