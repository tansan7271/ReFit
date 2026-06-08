export const colors = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  border: '#C6C6C8',
  separator: '#E5E5EA',
  text: '#000000',
  text2: '#3C3C43',
  text3: '#8E8E93',
  accent: '#1A5CCC',
  accentOrange: '#FF7200',
  green: '#34C759',
  red: '#FF3B30',
  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
