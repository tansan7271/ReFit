/**
 * 케어 팁 메시지 인메모리 캐시 (날짜 기준 자동 초기화)
 *
 * FCM으로 받은 morning_care / preworkout_care 알림의 body를 저장해두고
 * workout.tsx에서 읽어 표시한다. 날짜가 바뀌면 자동으로 초기화된다.
 */

let _date = '';
let _preMsg: string | null = null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function setPreCareMessage(msg: string): void {
  _date = today();
  _preMsg = msg;
}

export function getPreCareMessage(): string | null {
  if (_date !== today()) return null;
  return _preMsg;
}
