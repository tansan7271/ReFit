/**
 * axios 인스턴스 + API 함수
 * baseURL 은 EXPO_PUBLIC_API_URL 환경변수로 관리한다.
 */
import axios, { AxiosError, type AxiosInstance } from 'axios';

import { ACCESS_TOKEN_KEY, storage } from '@/services/storage';
import type { OnboardingPayload, User } from '@/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
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
// API 함수
// ---------------------------------------------------------------------------

/**
 * 백엔드 TokenResponse 원본 형태.
 * 백엔드는 snake_case 로 access_token / refresh_token 을 반환한다.
 */
interface TokenResponseRaw {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

/** 프론트에서 사용하는 인증 세션 — camelCase 로 통일 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** 백엔드 TokenResponse → AuthSession (camelCase) 매핑 */
function toAuthSession(data: TokenResponseRaw): AuthSession {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
  };
}

/** 로그인 — 백엔드 TokenResponse 를 camelCase AuthSession 으로 매핑해 반환 */
export async function login(
  email: string,
  password: string,
): Promise<AuthSession> {
  const { data } = await api.post<TokenResponseRaw>('/auth/login', {
    email,
    password,
  });
  return toAuthSession(data);
}

/** 회원가입 — 로그인과 동일하게 AuthSession 으로 매핑해 반환 */
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

/**
 * 온보딩 완료 — POST /api/v1/users/me/onboard
 * 백엔드 응답 형식 미확정. 현재는 갱신된 User 를 돌려준다고 가정.
 */
export async function submitOnboarding(
  payload: OnboardingPayload,
): Promise<User> {
  const { data } = await api.post<User>('/users/me/onboard', payload);
  return data;
}

/** 현재 유저 조회 — 앱 부팅 시 토큰 검증 용도 */
export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/users/me');
  return data;
}
