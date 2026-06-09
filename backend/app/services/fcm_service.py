"""
푸시 알림 서비스 (Expo Push API 기반)

선정 이유:
  - 프론트엔드가 expo-notifications 의 getExpoPushTokenAsync() 로 토큰 발급
    → 토큰 형식: ExponentPushToken[xxxxx]
  - Expo Push API(https://exp.host/--/api/v2/push/send)가 ExponentPushToken 을
    직접 수락하며 iOS / Android 모두 단일 엔드포인트로 커버
  - 별도 SDK 불필요 — httpx 비동기 HTTP 클라이언트로 직접 POST
  - 무료, Expo 인프라가 내부적으로 FCM(Android) / APNs(iOS) 로 라우팅

호환성 주의:
  - 기존 firebase-admin SDK 의 messaging.send() 는 FCM 네이티브 토큰만 수락하여
    ExponentPushToken 과 호환되지 않았음 (알림 미발송). 이 모듈로 전환하여 해결.

대안 비교:
  | 서비스    | iOS  | Android | 비용        | 비고                        |
  |-----------|------|---------|-------------|-----------------------------|
  | Expo Push | O    | O       | 무료        | Expo 토큰 직접 수락, 현재 사용 |
  | FCM       | O    | O       | 무료        | 네이티브 FCM 토큰 필요        |
  | APNs      | O    | X       | 무료(애플)  | iOS 전용                     |
  | OneSignal | O    | O       | 무료/유료   | 대시보드 편리, SDK 필요       |

결론: Expo Push API 사용 (httpx)

API 페이로드 형식 (단건):
  {
    "to": "ExponentPushToken[...]",
    "title": "...",
    "body": "...",
    "sound": "default",
    "badge": 1,
    "priority": "high",
    "data": {}
  }

멀티캐스트: 동일 엔드포인트에 메시지 배열로 POST (최대 100건/요청, 초과 시 청크 처리).
"""
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_MAX_BATCH = 100
REQUEST_TIMEOUT = 10.0  # seconds


class FCMService:
    """Expo Push API 를 통한 푸시 알림 발송 서비스.

    클래스명은 하위 호환을 위해 FCMService 로 유지한다
    (다른 모듈이 `from app.services.fcm_service import fcm_service` 로 임포트).
    """

    @staticmethod
    def _is_expo_token(token: str) -> bool:
        """Expo push 토큰 형식 여부 확인."""
        return bool(token) and token.startswith(("ExponentPushToken[", "ExpoPushToken["))

    @staticmethod
    def _build_message(
        token: str,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Expo Push API 메시지 페이로드 생성."""
        return {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "badge": 1,
            "priority": "high",
            "channelId": "default",
            "data": data or {},
        }

    @staticmethod
    def _log_ticket_errors(tickets: list[dict[str, Any]], tokens: list[str]) -> int:
        """Expo 응답 티켓에서 status == "error" 를 감지해 로그를 남기고 성공 건수를 반환.

        티켓 배열은 전송한 메시지 배열과 동일한 순서로 반환된다.
        """
        success = 0
        for idx, ticket in enumerate(tickets):
            if ticket.get("status") == "error":
                token = tokens[idx] if idx < len(tokens) else "?"
                message = ticket.get("message", "")
                details = ticket.get("details", {})
                logger.error(
                    "Expo push error for token %s: %s (details=%s)",
                    token[:24],
                    message,
                    details,
                )
            else:
                success += 1
        return success

    async def send(
        self,
        token: str,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
        image_url: str | None = None,
    ) -> bool:
        """단건 푸시 발송. 실패 시 False 반환 (예외 미전파).

        image_url 은 Expo Push API 표준 페이로드에 직접 대응되는 필드가 없어
        값이 있으면 data 에 포함해 클라이언트가 활용할 수 있도록 한다.
        """
        if not self._is_expo_token(token):
            logger.info("[PUSH-DEV] → %s | %s: %s", (token or "")[:24], title, body)
            return True

        payload_data = dict(data or {})
        if image_url:
            payload_data.setdefault("imageUrl", image_url)

        message = self._build_message(token, title, body, payload_data)

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                resp = await client.post(
                    EXPO_PUSH_URL,
                    json=message,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                )
                resp.raise_for_status()
                payload = resp.json()
        except Exception as e:
            logger.error("Expo push request failed for token %s: %s", token[:24], e)
            return False

        ticket = payload.get("data")
        # 단건 요청에서도 Expo 는 data 를 객체 또는 단일 원소 배열로 반환할 수 있다.
        if isinstance(ticket, list):
            ticket = ticket[0] if ticket else {}
        if not isinstance(ticket, dict):
            # data 가 None 이거나 dict/list 가 아닌 예상치 못한 형태인 경우.
            # 외부 인프라 이슈를 앱 장애로 전파하지 않도록 True 를 유지하되,
            # 응답 형태를 경고 로그로 남겨 추적 가능하게 한다.
            logger.warning(
                "Unexpected Expo response shape for token %s: %s",
                token[:24],
                payload,
            )
            return True
        if ticket.get("status") == "error":
            logger.error(
                "Expo push error for token %s: %s (details=%s)",
                token[:24],
                ticket.get("message", ""),
                ticket.get("details", {}),
            )
            return False
        return True

    async def send_multicast(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> int:
        """멀티캐스트 발송. 성공 건수 반환.

        Expo Push API 는 1회 요청당 최대 100건의 메시지 배열을 받으므로
        100건 단위로 청크 분할해 발송한다.
        """
        expo_tokens = [t for t in tokens if self._is_expo_token(t)]
        invalid_count = len(tokens) - len(expo_tokens)

        if not expo_tokens:
            # 유효한 Expo 토큰이 하나도 없으면 dev 모드로 간주 (전체 건수 반환)
            logger.info(
                "[PUSH-DEV] multicast %d tokens | %s: %s", len(tokens), title, body
            )
            return len(tokens)

        if invalid_count:
            logger.info("Skipping %d non-Expo tokens in multicast", invalid_count)

        success_count = 0
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                for start in range(0, len(expo_tokens), EXPO_MAX_BATCH):
                    chunk = expo_tokens[start : start + EXPO_MAX_BATCH]
                    messages = [
                        self._build_message(t, title, body, data) for t in chunk
                    ]
                    try:
                        resp = await client.post(
                            EXPO_PUSH_URL,
                            json=messages,
                            headers={
                                "Content-Type": "application/json",
                                "Accept": "application/json",
                            },
                        )
                        resp.raise_for_status()
                        payload = resp.json()
                    except Exception as e:
                        logger.error("Expo push chunk request failed: %s", e)
                        continue

                    tickets = payload.get("data")
                    if isinstance(tickets, list):
                        success_count += self._log_ticket_errors(tickets, chunk)
                    else:
                        logger.error("Unexpected Expo response shape: %s", payload)
        except Exception as e:
            logger.error("Expo multicast failed: %s", e)
            return success_count

        return success_count


fcm_service = FCMService()
