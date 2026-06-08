/**
 * 로컬 시각 ↔ UTC 변환 유틸
 *
 * 백엔드는 HH:MM을 UTC로 저장한다.
 * 드럼 피커는 사용자의 로컬 시각을 표시한다.
 */

/** "HH:MM" (로컬) → "HH:MM" (UTC) */
export function localTimeToUTC(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return (
    String(d.getUTCHours()).padStart(2, '0') +
    ':' +
    String(d.getUTCMinutes()).padStart(2, '0')
  );
}

/** "HH:MM" (UTC) → "HH:MM" (로컬) */
export function utcTimeToLocal(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}
