/**
 * 토큰/민감 데이터 저장 헬퍼.
 * expo-secure-store 는 iOS/Android 만 지원하고 웹(브라우저)은 미지원이므로,
 * 웹에서는 localStorage 로 대체한다.
 *
 * authStore 와 api 인터셉터가 동일한 키/경로로 토큰을 읽고 쓰도록
 * 저장 로직을 이 파일에 단일 출처로 둔다.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** JWT 액세스 토큰 저장 키 — authStore 와 api 인터셉터가 공유 */
export const ACCESS_TOKEN_KEY = 'refit.jwt';

/** JWT 리프레시 토큰 저장 키 */
export const REFRESH_TOKEN_KEY = 'refit.refresh';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
