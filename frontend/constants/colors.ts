/**
 * ReFit 디자인 토큰 — 색상
 * prototype/Refit_v1.html :root 변수에서 추출.
 */
export const colors = {
  // 배경 / 표면
  bg: '#f5f7fb',
  bgOnboarding: '#f0f4ff', // 온보딩 화면 배경
  card: '#ffffff',
  border: '#dde4f0',

  // 텍스트
  text: '#1a1a2e',
  text2: '#5a6070',
  text3: '#a0a8b8',

  // 브랜드 / 강조
  accent: '#1A5CCC', // 메인 블루
  accent2: '#FF7200', // 오렌지
  green: '#4caf8a', // 헬스/긍정
  amber: '#f5a623',
  pink: '#e91e63',

  // 연한 톤 (선택 상태 배경)
  softBlue: '#e8effc',
  softGreen: '#e8f5ee',
  softAmber: '#fff3e0',

  white: '#ffffff',
} as const;

/** accent 블루 그라데이션 (버튼 등) */
export const gradients = {
  primary: ['#1A5CCC', '#2a7aff'] as const,
  warm: ['#1A5CCC', '#FF7200'] as const,
} as const;

export type ColorKey = keyof typeof colors;
