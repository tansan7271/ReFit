/**
 * 픽셀 캐릭터 컴포넌트 모음
 *
 * ─ 사용 패턴 A: 백엔드 데이터 직결 (가장 간단) ─
 *   const { data } = useQuery(GET_CHARACTER);
 *   <PixelCharacterFromData data={data} cellSize={CELL_SIZE.phone} />
 *
 * ─ 사용 패턴 B: 여러 화면 동기화 (워치 + 폰 동시) ─
 *   const ctrl = useCharacterFromData(data, { accessories: ['headband'] });
 *   <PixelGrid {...ctrl} cellSize={CELL_SIZE.watch} />   ← 워치
 *   <PixelGrid {...ctrl} cellSize={CELL_SIZE.phone} />   ← 폰 (같은 프레임)
 *
 * ─ 사용 패턴 C: 상태 직접 제어 ─
 *   <PixelCharacter state="workout" options={{ energyLevel: 5 }} cellSize={CELL_SIZE.phone} />
 *
 * mocum 통합 시 frontend/components/PixelCharacter.tsx 로 이동
 */

import React, { memo, useEffect, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { BG, COLS, ROWS } from './pixelEngine';
import { usePixelCharacter, useCharacterFromData } from './usePixelCharacter';
import type { PixelCharacterController } from './usePixelCharacter';
import type {
  CharacterState, PixelFrame, RenderOptions,
  CharacterData, AccessoryType, EffectType,
} from './types';

/* ════════════════════════════════════════════
   화면별 권장 셀 크기
   실제 픽셀 그리드 크기 = COLS(100) × cellSize
════════════════════════════════════════════ */

export const CELL_SIZE = {
  watch: 2,  // → 200×200px  (워치 페이스 255px 원형에 맞춤)
  card:  2,  // → 200×200px  (인라인 카드·위젯)
  phone: 3,  // → 300×300px  (앱 홈 화면 메인)
  large: 4,  // → 400×400px  (태블릿·대형 화면)
} as const;

export type CellSizeKey = keyof typeof CELL_SIZE;

/* ════════════════════════════════════════════
   PixelGrid — dumb renderer
   훅·내부 상태 없음. 프레임을 받아서 그리기만 함.
   단일 훅 결과를 여러 화면에 공유할 때 사용.
════════════════════════════════════════════ */

export interface PixelGridProps {
  frameData:    PixelFrame;
  opacity:      Animated.Value;
  /** spread 편의용 — 렌더에 미사용. `{...ctrl}` 패턴으로 전달 시 그대로 흘러감 */
  currentState: CharacterState;
  cellSize?:    number;
}

export function PixelGrid({ frameData, opacity, cellSize = CELL_SIZE.phone }: PixelGridProps) {
  const cellStyle = useMemo(
    () => StyleSheet.create({ cell: { width: cellSize, height: cellSize } }).cell,
    [cellSize],
  );

  return (
    <Animated.View
      style={[
        styles.grid,
        { width: COLS * cellSize, height: ROWS * cellSize },
        { opacity },
      ]}
    >
      {frameData.map((color, i) => (
        <PixelCell key={i} color={color} style={cellStyle} />
      ))}
    </Animated.View>
  );
}

/* ════════════════════════════════════════════
   PixelCharacter — self-managing
   화면 1개에 독립적으로 상태를 관리할 때 사용.
   여러 화면 동기화가 필요하면 useCharacterFromData + PixelGrid 사용.
════════════════════════════════════════════ */

export interface PixelCharacterProps {
  state?:    CharacterState;
  options?:  RenderOptions;
  cellSize?: number;
  fadeMs?:   number;
}

export function PixelCharacter({
  state    = 'neutral',
  options  = {},
  cellSize = CELL_SIZE.phone,
  fadeMs   = 150,
}: PixelCharacterProps) {
  const { frameData, opacity, currentState, setState } = usePixelCharacter(state, options, fadeMs);
  useEffect(() => { setState(state); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  return <PixelGrid frameData={frameData} opacity={opacity} currentState={currentState} cellSize={cellSize} />;
}

/* ════════════════════════════════════════════
   PixelCharacterFromData — data-driven
   백엔드 응답을 그대로 연결하는 가장 간단한 패턴.
   SWR / React Query의 data prop을 바로 넘기면 됨.
════════════════════════════════════════════ */

export interface PixelCharacterFromDataProps {
  data?:         CharacterData | null;
  cellSize?:     number;
  fadeMs?:       number;
  accessories?:  AccessoryType[];
  effect?:       EffectType;
}

export function PixelCharacterFromData({
  data,
  cellSize    = CELL_SIZE.phone,
  fadeMs      = 150,
  accessories,
  effect,
}: PixelCharacterFromDataProps) {
  const ctrl = useCharacterFromData(data ?? null, { accessories, effect }, fadeMs);
  return <PixelGrid {...ctrl} cellSize={cellSize} />;
}

/* ════════════════════════════════════════════
   내부: 픽셀 셀 — memo로 리렌더 최소화
════════════════════════════════════════════ */

const PixelCell = memo(function PixelCell({
  color,
  style,
}: {
  color: string | null;
  style: ViewStyle;
}) {
  return <View style={[style, { backgroundColor: color ?? BG ?? 'transparent' }]} />;
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
  },
});
