/**
 * 커뮤니티 스토어 (Zustand)
 * - 친구 목록 / 받은 콕(응원) 목록 / 콕 보내기 상태를 관리한다.
 * - sentPokeIds 는 세션 내 이미 콕을 보낸 user_id 목록으로,
 *   화면에서 "이미 보냄" 비활성 처리를 위해 사용된다.
 * - 에러는 조용히 로그만 남기고 UI 는 빈 상태/이전 상태를 유지한다(요구사항).
 */
import { create } from 'zustand';

import { fetchFriends, fetchReceivedPokes, sendPoke } from '@/services/api';
import type { Friend, Poke } from '@/types';

interface CommunityState {
  friends: Friend[];
  pokes: Poke[];
  friendsLoading: boolean;
  pokesLoading: boolean;
  /** 이번 세션 동안 콕을 보낸 user_id 목록 */
  sentPokeIds: number[];

  fetchFriends: () => Promise<void>;
  fetchPokes: () => Promise<void>;
  sendPokeToUser: (userId: number) => Promise<void>;
  reset: () => void;
}

const initialState = {
  friends: [] as Friend[],
  pokes: [] as Poke[],
  friendsLoading: false,
  pokesLoading: false,
  sentPokeIds: [] as number[],
};

export const useCommunityStore = create<CommunityState>((set, get) => ({
  ...initialState,

  fetchFriends: async () => {
    set({ friendsLoading: true });
    try {
      const friends = await fetchFriends();
      set({ friends });
    } catch (error) {
      console.warn('[communityStore] fetchFriends failed', error);
    } finally {
      set({ friendsLoading: false });
    }
  },

  fetchPokes: async () => {
    set({ pokesLoading: true });
    try {
      const pokes = await fetchReceivedPokes();
      set({ pokes });
    } catch (error) {
      console.warn('[communityStore] fetchPokes failed', error);
    } finally {
      set({ pokesLoading: false });
    }
  },

  sendPokeToUser: async (userId: number) => {
    const { sentPokeIds } = get();
    if (sentPokeIds.includes(userId)) return;
    set({ sentPokeIds: [...sentPokeIds, userId] });
    try {
      await sendPoke(userId);
    } catch (error) {
      console.warn('[communityStore] sendPokeToUser failed', error);
      set({ sentPokeIds: get().sentPokeIds.filter((id) => id !== userId) });
    }
  },

  reset: () => set({ ...initialState }),
}));
