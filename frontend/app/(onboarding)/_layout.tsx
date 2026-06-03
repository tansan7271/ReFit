/**
 * 온보딩 그룹 레이아웃.
 * 6개 화면을 순서대로 push 하는 스택. 헤더는 각 화면이 자체 렌더.
 */
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // 온보딩 중 뒤로 스와이프 방지
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="workout-routine" />
      <Stack.Screen name="sleep-goal" />
      <Stack.Screen name="physical-profile" />
      <Stack.Screen name="personal-info" />
      <Stack.Screen name="health-connect" />
      <Stack.Screen name="character-intro" />
    </Stack>
  );
}
