/**
 * ReFit 디자인 토큰 — 타이포그래피 / 간격 / 반경
 * 프로토타입은 Nunito(영문 헤딩) + Noto Sans KR(본문)을 사용.
 * 폰트 미탑재 시 시스템 폰트로 폴백된다.
 */
export const fontSize = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  display: 34,
} as const;

export const fontWeight = {
  regular: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
