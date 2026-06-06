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
  BodyPart,
  CoopCelebrateResponse,
  Friend,
  FriendActivity,
  InBodyInput,
  InBodyRecord,
  NotificationSettings,
  NotificationSettingsUpdate,
  OnboardingPayload,
  Poke,
  ProfileUpdatePayload,
  SleepStats,
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
          // authStore 와의 순환참조를 피하기 위해 호출 시점에 lazy require
          const { useAuthStore } = require('@/store/authStore') as typeof import('@/store/authStore');
          await useAuthStore.getState().signOut();
        }
      }
    }
    return Promise.reject(error);
  },
);

/** FastAPI/Pydantic 검증 에러 항목 (422 응답 detail 배열의 요소) */
interface ValidationErrorItem {
  type?: string;
  loc?: (string | number)[];
  msg?: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

/** API 에러 응답 바디 형태 */
interface ApiErrorData {
  detail?: string | ValidationErrorItem[];
  message?: string;
}

/**
 * 어떤 형태의 detail/message 든 안전하게 사람이 읽을 수 있는 문자열로 변환한다.
 * - detail 이 배열(FastAPI 422)이면 → 첫 항목의 msg
 * - detail 이 문자열이면 → 그대로
 * - message 가 있으면 → 그 값
 * - 그 외 → fallback
 */
function extractErrorMessage(data: ApiErrorData | undefined): string | null {
  if (!data) return null;

  const { detail } = data;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first && typeof first.msg === 'string') {
      return first.msg;
    }
    return '입력값을 다시 확인해 주세요.';
  }
  if (typeof detail === 'string' && detail.length > 0) {
    return detail;
  }
  if (typeof data.message === 'string' && data.message.length > 0) {
    return data.message;
  }
  return null;
}

/** 일관된 에러 메시지 추출 — 항상 <Text> 에 안전한 문자열을 반환한다. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorData>;
    const extracted = extractErrorMessage(axiosError.response?.data);
    if (extracted) {
      return String(extracted);
    }
    if (axiosError.code === 'ECONNABORTED') {
      return '요청 시간이 초과됐어요. 네트워크를 확인해 주세요.';
    }
    if (!axiosError.response) {
      return '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.';
    }
    return `오류가 발생했어요 (${axiosError.response.status})`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return '오류가 발생했습니다.';
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
  if (!data.user) {
    throw new Error('서버 응답에 사용자 정보가 없습니다.');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
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

export async function updateProfile(payload: ProfileUpdatePayload): Promise<User> {
  const { data } = await api.patch<User>('/users/me', payload);
  return data;
}

export async function updateSleepGoal(
  bedtime: string,
  wakeup: string,
): Promise<{ sleep_goal_bedtime: string | null; sleep_goal_wakeup: string | null; sleep_goal_minutes: number | null }> {
  const { data } = await api.put('/users/me/sleep-goal', {
    sleep_goal_bedtime: bedtime,
    sleep_goal_wakeup: wakeup,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Push Token
// ---------------------------------------------------------------------------

export async function registerPushToken(
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  await api.post('/notifications/token', { token, platform });
}

// ---------------------------------------------------------------------------
// Notification Settings
// ---------------------------------------------------------------------------

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await api.get<NotificationSettings>('/notifications/settings');
  return data;
}

export async function updateNotificationSettings(
  payload: NotificationSettingsUpdate,
): Promise<NotificationSettings> {
  const { data } = await api.patch<NotificationSettings>('/notifications/settings', payload);
  return data;
}

// ---------------------------------------------------------------------------
// Workout Plans
// ---------------------------------------------------------------------------

export async function fetchWorkoutPlans(): Promise<WorkoutPlan[]> {
  const { data } = await api.get<WorkoutPlan[]>('/workouts/plans');
  return data;
}

export async function createWorkoutPlan(
  dayOfWeek: number,
  bodyParts: BodyPart[],
): Promise<WorkoutPlan> {
  const { data } = await api.post<WorkoutPlan>('/workouts/plans', {
    day_of_week: dayOfWeek,
    name: bodyParts.join(','),
    is_rest_day: false,
    exercises: [],
  });
  return data;
}

export async function updateWorkoutPlan(
  planId: number,
  bodyParts: BodyPart[],
): Promise<WorkoutPlan> {
  const { data } = await api.patch<WorkoutPlan>(`/workouts/plans/${planId}`, {
    name: bodyParts.join(','),
    is_rest_day: false,
  });
  return data;
}

export async function deleteWorkoutPlan(planId: number): Promise<void> {
  await api.delete(`/workouts/plans/${planId}`);
}

// ---------------------------------------------------------------------------
// Workout Sessions
// ---------------------------------------------------------------------------

export interface PreWorkoutMessage {
  message: string;
  plan_name: string | null;
  weather_desc: string | null;
}

export async function fetchPreWorkoutMessage(): Promise<PreWorkoutMessage> {
  const { data } = await api.get<PreWorkoutMessage>('/workouts/pre-message');
  return data;
}

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

/**
 * 배지 장착 — 한 번에 1개만 장착 가능(기존 장착은 자동 해제됨).
 * 백엔드: POST /badges/me/equip { badge_id }
 */
export async function equipBadge(badgeId: number): Promise<UserBadge> {
  const { data } = await api.post<UserBadge>('/badges/me/equip', { badge_id: badgeId });
  return data;
}

// ---------------------------------------------------------------------------
// Community — Friends & Pokes
// ---------------------------------------------------------------------------

export async function fetchFriends(): Promise<Friend[]> {
  const { data } = await api.get<Friend[]>('/community/friends');
  return data;
}

/**
 * 친구 요청 보내기.
 * 백엔드는 닉네임이 아닌 `addressee_id`(상대 user_id)를 받는다.
 * UI에서 닉네임으로 검색해야 한다면 별도의 사용자 검색 엔드포인트가 선행되어야 한다.
 */
export async function sendFriendRequest(addresseeId: number): Promise<void> {
  await api.post('/community/friends/request', { addressee_id: addresseeId });
}

export async function acceptFriendRequest(friendshipId: number): Promise<void> {
  await api.post(`/community/friends/${friendshipId}/accept`);
}

export async function removeFriend(friendshipId: number): Promise<void> {
  await api.delete(`/community/friends/${friendshipId}`);
}

/**
 * 콕 찌르기 보내기.
 * 백엔드 필드명은 `receiver_id` (target_user_id 가 아님).
 */
export async function sendPoke(receiverId: number, message?: string): Promise<Poke> {
  const { data } = await api.post<Poke>('/community/pokes', {
    receiver_id: receiverId,
    message: message ?? null,
  });
  return data;
}

export async function fetchReceivedPokes(limit = 20): Promise<Poke[]> {
  const { data } = await api.get<Poke[]>('/community/pokes/received', {
    params: { limit },
  });
  return data;
}

export async function fetchFriendActivity(friendId: number): Promise<FriendActivity> {
  const { data } = await api.get<FriendActivity>(
    `/community/friends/${friendId}/activity`,
  );
  return data;
}

export async function coopCelebrate(friendId: number): Promise<CoopCelebrateResponse> {
  const { data } = await api.post<CoopCelebrateResponse>(
    `/community/coop/celebrate/${friendId}`,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------------

export async function fetchSleepStats(days = 7): Promise<SleepStats> {
  const { data } = await api.get<SleepStats>('/sleep/stats', { params: { days } });
  return data;
}
