/**
 * 시각 변환 유틸 (KST 단일 기준)
 *
 * 서버가 TZ=Asia/Seoul로 동작하며 모든 HH:MM 시각을 KST로 저장한다.
 * 앱도 KST 기준으로 표시하므로 더 이상 UTC 변환이 필요 없다.
 * 호출부 호환을 위해 함수 시그니처는 유지하고 항등 변환만 수행한다.
 */

/** "HH:MM" → "HH:MM" (항등 — 이제 KST로 저장하므로 변환 불필요) */
export function localTimeToUTC(hhmm: string): string {
  return hhmm;
}

/** "HH:MM" → "HH:MM" (항등 — KST로 저장하므로 변환 불필요) */
export function utcTimeToLocal(hhmm: string): string {
  return hhmm;
}
