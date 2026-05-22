import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * 두 값 사이를 무한 반복하는 Animated.Value를 반환합니다.
 * @param toValue   목표 값 (translateY: -12, scale: 1.08 등)
 * @param duration  한 방향 이동 시간 (ms)
 * @param fromValue 시작 값 (기본 0, scale용이면 1)
 */
export function useLoopAnimation(
  toValue: number,
  duration: number,
  fromValue = 0
): Animated.Value {
  const anim = useRef(new Animated.Value(fromValue)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: fromValue, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return anim;
}
