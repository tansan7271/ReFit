/**
 * 케어 팁 메시지 캐시 (날짜 기준 자동 초기화)
 *
 * FCM 알림 수신 시 또는 on-demand 생성 시 저장하고, 각 화면에서 읽어 표시한다.
 * 날짜가 바뀌면 자동으로 초기화된다. SecureStore 영속화로 앱 재시작 후에도 당일 캐시 유지.
 */
import { storage } from '@/services/storage';

const PRE_KEY = 'refit.care.pre';
const POST_KEY = 'refit.care.post';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function setCache(key: string, msg: string): Promise<void> {
  await storage.setItem(key, JSON.stringify({ date: today(), msg }));
}

async function getCache(key: string): Promise<string | null> {
  try {
    const raw = await storage.getItem(key);
    if (!raw) return null;
    const { date, msg } = JSON.parse(raw) as { date: string; msg: string };
    return date === today() ? msg : null;
  } catch {
    return null;
  }
}

export async function setPreCareMessage(msg: string): Promise<void> {
  await setCache(PRE_KEY, msg);
}
export async function getPreCareMessage(): Promise<string | null> {
  return getCache(PRE_KEY);
}

export async function setPostCareMessage(msg: string): Promise<void> {
  await setCache(POST_KEY, msg);
}
export async function getPostCareMessage(): Promise<string | null> {
  return getCache(POST_KEY);
}

export async function clearCareCache(): Promise<void> {
  await Promise.all([
    storage.deleteItem(PRE_KEY),
    storage.deleteItem(POST_KEY),
  ]);
}
