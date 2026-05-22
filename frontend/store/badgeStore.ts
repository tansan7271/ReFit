/**
 * 뱃지 스토어 (Zustand)
 * - fetchData 한 번에 allBadges + myBadges 동시 조회 (Promise.all)
 * - loaded 플래그로 화면 재진입 시 중복 호출 방지
 */
import { create } from 'zustand';

import { fetchAllBadges, fetchMyBadges } from '@/services/api';
import type { Badge, UserBadge } from '@/types';

interface BadgeState {
  allBadges: Badge[];
  myBadges: UserBadge[];
  loading: boolean;
  loaded: boolean;
  error: string | null;

  fetchData: (force?: boolean) => Promise<void>;
}

export const useBadgeStore = create<BadgeState>((set, get) => ({
  allBadges: [],
  myBadges: [],
  loading: false,
  loaded: false,
  error: null,

  fetchData: async (force = false) => {
    if (!force && get().loaded) return;
    set({ loading: true, error: null });
    try {
      const [allBadges, myBadges] = await Promise.all([fetchAllBadges(), fetchMyBadges()]);
      set({ allBadges, myBadges, loaded: true });
    } catch {
      set({ error: '뱃지를 불러오지 못했어요.' });
    } finally {
      set({ loading: false });
    }
  },
}));
