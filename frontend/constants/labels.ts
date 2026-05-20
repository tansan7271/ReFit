/** ReFit 도메인 enum → 한글 라벨 매핑 */
import type { BodyPart, SkillLevel, Weekday } from '@/types';

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

export const WEEKDAY_ORDER: Weekday[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

export const BODY_PART_LABEL: Record<BodyPart, string> = {
  chest: '가슴',
  back: '등',
  shoulder: '어깨',
  arm: '팔',
  leg: '하체',
  core: '코어',
  cardio: '유산소',
};

export const BODY_PART_ORDER: BodyPart[] = [
  'chest',
  'back',
  'shoulder',
  'arm',
  'leg',
  'core',
  'cardio',
];

/** 숙련도 카드 정보 */
export const SKILL_LEVELS: {
  level: SkillLevel;
  emoji: string;
  title: string;
  description: string;
}[] = [
  {
    level: 'beginner',
    emoji: '🌱',
    title: '입문자',
    description: '헬스장 처음 등록, 기본 동작 익히는 중 (3개월 미만)',
  },
  {
    level: 'novice',
    emoji: '🏃',
    title: '초보자',
    description: '기본 동작은 익혔지만 루틴 불규칙 (3개월–1년)',
  },
  {
    level: 'intermediate',
    emoji: '🏋️',
    title: '중급자',
    description: '분할 루틴 소화, 무게 꾸준히 증가 (1–3년)',
  },
  {
    level: 'advanced',
    emoji: '🔥',
    title: '숙련자',
    description: '몸 상태를 정확히 파악하는 단계 (3년 이상)',
  },
];
