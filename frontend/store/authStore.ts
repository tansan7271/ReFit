/**
 * 인증 상태 스토어 (Zustand)
 * JWT 토큰은 expo-secure-store 에 보관, 메모리에는 user/status 만 유지.
 */
import { create } from 'zustand';

import { fetchMe } from '@/services/api';
import { ACCESS_TOKEN_KEY, storage } from '@/services/storage';
import type { User } from '@/types';

/** 앱 부팅 시 토큰 복원 흐름의 상태 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;

  /** 앱 시작 시 1회 호출 — 저장된 토큰으로 세션 복원 */
  bootstrap: () => Promise<void>;
  /** 로그인/회원가입 성공 후 호출 */
  setSession: (token: string, user: User) => Promise<void>;
  /** 온보딩 완료 등으로 user 정보만 갱신 */
  setUser: (user: User) => void;
  /** 로그아웃 */
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  bootstrap: async () => {
    try {
      const token = await storage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        set({ status: 'unauthenticated', user: null });
        return;
      }
      // 토큰이 있으면 유효성 검증 + 유저 조회
      const user = await fetchMe();
      set({ status: 'authenticated', user });
    } catch {
      // 토큰 만료/무효 — 정리 후 비로그인 처리
      await storage.deleteItem(ACCESS_TOKEN_KEY);
      set({ status: 'unauthenticated', user: null });
    }
  },

  setSession: async (token, user) => {
    await storage.setItem(ACCESS_TOKEN_KEY, token);
    set({ status: 'authenticated', user });
  },

  setUser: (user) => set({ user }),

  signOut: async () => {
    await storage.deleteItem(ACCESS_TOKEN_KEY);
    set({ status: 'unauthenticated', user: null });
  },
}));
