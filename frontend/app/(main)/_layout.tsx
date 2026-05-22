import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

export default function MainTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text3,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: '운동',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '기록',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
      {/* 탭 바에 표시하지 않는 운동 플로우 화면 */}
      <Tabs.Screen
        name="pre-workout"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="session"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="post-workout"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      {/* 뱃지: 마이페이지 서브 화면 (MVP 이후 독립 탭 예정) */}
      <Tabs.Screen name="badges" options={{ href: null }} />
      {/* 커뮤니티: MVP 이후 스코프 */}
      <Tabs.Screen name="community" options={{ href: null }} />
    </Tabs>
  );
}
