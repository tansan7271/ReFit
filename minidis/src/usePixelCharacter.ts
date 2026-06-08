/**
 * 픽셀 캐릭터 애니메이션 훅
 * mocum 통합 시 frontend/hooks/usePixelCharacter.ts 로 이동
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';

import { buildFrame, STATE_CONFIGS } from './pixelEngine';
import {
  resolveCharacterState,
  resolveEnergyLevel,
  resolveGrowthLevel,
} from './types';
import type {
  CharacterState, PixelFrame, RenderOptions,
  CharacterData, AccessoryType, EffectType, EnergyLevel, GrowthLevel, WorkoutPart,
} from './types';

/* ════════════════════════════════════════════
   공통 반환 타입
   PixelGrid가 이 shape를 props로 받음
════════════════════════════════════════════ */

export interface PixelCharacterController {
  frameData:    PixelFrame;
  opacity:      Animated.Value;
  currentState: CharacterState;
}

export interface UsePixelCharacterResult extends PixelCharacterController {
  /** 상태 전환 함수 — fade out → swap → fade in */
  setState: (next: CharacterState) => void;
}

/* ════════════════════════════════════════════
   usePixelCharacter — 상태 직접 제어용
════════════════════════════════════════════ */

/**
 * @param initialState  초기 캐릭터 상태 (기본 'neutral')
 * @param options       렌더 옵션. ref로 관리되므로 객체 참조가 바뀌어도 최신값 즉시 반영
 * @param FADE_MS       상태 전환 fade 시간 ms (기본 150)
 */
export function usePixelCharacter(
  initialState: CharacterState = 'neutral',
  options: RenderOptions = {},
  FADE_MS = 150,
): UsePixelCharacterResult {
  const [currentState, setCurrentState] = useState<CharacterState>(initialState);
  const [frameData, setFrameData]       = useState<PixelFrame>(() =>
    buildFrame(initialState, 0, options)
  );

  const opacity       = useRef(new Animated.Value(1)).current;
  const frameIndexRef = useRef(0);
  const inTransition  = useRef(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // options를 ref로 저장 — startLoop 클로저가 항상 최신 옵션을 읽음
  const optionsRef = useRef<RenderOptions>(options);
  useEffect(() => { optionsRef.current = options; }); // 매 렌더마다 동기화

  const startLoop = useCallback((state: CharacterState) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const cfg = STATE_CONFIGS[state];
    const ms  = Math.round(1000 / cfg.fps);
    intervalRef.current = setInterval(() => {
      frameIndexRef.current = (frameIndexRef.current + 1) % cfg.frameCount;
      setFrameData(buildFrame(state, frameIndexRef.current, optionsRef.current));
    }, ms);
  }, []);

  useEffect(() => {
    startLoop(initialState);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setState = useCallback((next: CharacterState) => {
    if (inTransition.current || next === currentState) return;
    inTransition.current = true;
    Animated.timing(opacity, {
      toValue: 0, duration: FADE_MS, useNativeDriver: true,
    }).start(() => {
      frameIndexRef.current = 0;
      setCurrentState(next);
      setFrameData(buildFrame(next, 0, optionsRef.current));
      startLoop(next);
      Animated.timing(opacity, {
        toValue: 1, duration: FADE_MS, useNativeDriver: true,
      }).start(() => { inTransition.current = false; });
    });
  }, [currentState, opacity, FADE_MS, startLoop]);

  return { frameData, opacity, setState, currentState };
}

/* ════════════════════════════════════════════
   extras 타입
════════════════════════════════════════════ */

export interface CharacterDataExtras {
  /** 장착할 액세서리 목록 */
  accessories?: AccessoryType[];
  /** 활성화할 이펙트 */
  effect?:      EffectType;
  /** 지정 시 resolveEnergyLevel 자동 계산을 덮어씀 */
  energyLevel?: EnergyLevel;
  /** 지정 시 resolveGrowthLevel 자동 계산을 덮어씀 */
  growthLevel?: GrowthLevel;
  /** 지정 시 data.workout_part 를 덮어씀 */
  workoutPart?: WorkoutPart;
}

/* ════════════════════════════════════════════
   useCharacterFromData — 백엔드 데이터 자동 변환
════════════════════════════════════════════ */

/**
 * 백엔드 CharacterData를 직접 받아 상태·에너지·성장 레벨을 자동 계산.
 * data가 바뀌면 자동으로 fade 전환.
 *
 * 반환값을 여러 <PixelGrid>에 spread해 다중 화면 동기화:
 * ```tsx
 * const ctrl = useCharacterFromData(data, { accessories: ['headband'] });
 * <PixelGrid {...ctrl} cellSize={CELL_SIZE.watch} />
 * <PixelGrid {...ctrl} cellSize={CELL_SIZE.phone} />
 * ```
 *
 * @param data     GET /character 응답. null/undefined면 'neutral' 유지
 * @param extras   액세서리·이펙트 등 UI 레이어 옵션
 * @param FADE_MS  상태 전환 fade 시간 ms (기본 150)
 */
export function useCharacterFromData(
  data:    CharacterData | null | undefined,
  extras:  CharacterDataExtras = {},
  FADE_MS = 150,
): PixelCharacterController {
  const buildOptions = (d: CharacterData | null | undefined): RenderOptions => ({
    accessories: extras.accessories,
    effect:      extras.effect,
    energyLevel: extras.energyLevel ?? (d ? resolveEnergyLevel(d) : 3),
    growthLevel: extras.growthLevel ?? (d ? resolveGrowthLevel(d) : 5),
    workoutPart: extras.workoutPart ?? d?.workout_part,
  });

  const initialState   = data ? resolveCharacterState(data) : 'neutral';
  const initialOptions = buildOptions(data);

  const [currentState, setCurrentState] = useState<CharacterState>(initialState);
  const [frameData, setFrameData]       = useState<PixelFrame>(() =>
    buildFrame(initialState, 0, initialOptions)
  );

  const opacity       = useRef(new Animated.Value(1)).current;
  const frameIndexRef = useRef(0);
  const inTransition  = useRef(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const optionsRef    = useRef<RenderOptions>(initialOptions);
  // 전환 완료 후 처리할 pending 상태
  const pendingState  = useRef<CharacterState | null>(null);

  const startLoop = useCallback((state: CharacterState) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const cfg = STATE_CONFIGS[state];
    intervalRef.current = setInterval(() => {
      frameIndexRef.current = (frameIndexRef.current + 1) % cfg.frameCount;
      setFrameData(buildFrame(state, frameIndexRef.current, optionsRef.current));
    }, Math.round(1000 / cfg.fps));
  }, []);

  useEffect(() => {
    startLoop(initialState);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // data 변경 → 상태·옵션 재계산 → 필요 시 fade 전환
  useEffect(() => {
    const nextState   = data ? resolveCharacterState(data) : 'neutral';
    const nextOptions = buildOptions(data);

    // 옵션은 상태 변경과 무관하게 항상 최신값 유지
    optionsRef.current = nextOptions;

    if (nextState === currentState) return; // 옵션만 바뀐 경우 — 다음 tick에 자동 반영

    if (inTransition.current) {
      pendingState.current = nextState; // 전환 완료 후 처리
      return;
    }

    const doTransition = (target: CharacterState) => {
      inTransition.current = true;
      Animated.timing(opacity, {
        toValue: 0, duration: FADE_MS, useNativeDriver: true,
      }).start(() => {
        frameIndexRef.current = 0;
        setCurrentState(target);
        setFrameData(buildFrame(target, 0, optionsRef.current));
        startLoop(target);
        Animated.timing(opacity, {
          toValue: 1, duration: FADE_MS, useNativeDriver: true,
        }).start(() => {
          inTransition.current = false;
          // 전환 중 쌓인 pending 처리
          if (pendingState.current && pendingState.current !== target) {
            const pending = pendingState.current;
            pendingState.current = null;
            doTransition(pending);
          } else {
            pendingState.current = null;
          }
        });
      });
    };

    doTransition(nextState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, extras.accessories, extras.effect, extras.energyLevel, extras.growthLevel, extras.workoutPart]);

  return { frameData, opacity, currentState };
}
