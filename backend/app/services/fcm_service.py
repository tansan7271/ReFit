"""
FCM (Firebase Cloud Messaging) 푸시 알림 서비스

선정 이유:
  - iOS / Android 양쪽을 단일 서버 API로 커버 (React Native Expo, react-native-firebase 등과 연동)
  - 무료 티어로 충분 (월 수백만 건 무료)
  - 구글 공식 지원, 안정성 검증
  - firebase-admin Python SDK로 서버 측 발송 간단

대안 비교:
  | 서비스    | iOS  | Android | 비용        | 비고                      |
  |-----------|------|---------|-------------|---------------------------|
  | FCM       | O    | O       | 무료        | 가장 범용, 권장            |
  | APNs      | O    | X       | 무료(애플)  | iOS 전용, FCM이 내부 사용  |
  | OneSignal | O    | O       | 무료/유료   | 대시보드 편리, SDK 필요    |
  | Expo Push | O    | O       | 무료        | Expo 프로젝트 전용          |

결론: FCM 사용 (firebase-admin SDK)
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)


class FCMService:
    def __init__(self):
        self._app = None

    def _get_app(self):
        """지연 초기화 — .env에 FIREBASE_CREDENTIALS_PATH 가 없으면 dev 모드로 동작"""
        if self._app is not None:
            return self._app

        try:
            import firebase_admin
            from firebase_admin import credentials
            from app.core.config import settings

            if not firebase_admin._apps:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                self._app = firebase_admin.initialize_app(cred)
            else:
                self._app = firebase_admin.get_app()
        except Exception as e:
            logger.warning("Firebase not initialized (dev mode): %s", e)
            self._app = "dev"

        return self._app

    async def send(
        self,
        token: str,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
        image_url: str | None = None,
    ) -> bool:
        """단건 FCM 발송. 실패 시 False 반환 (예외 미전파)."""
        app = self._get_app()
        if app == "dev":
            logger.info("[FCM-DEV] → %s | %s: %s", token[:20], title, body)
            return True

        try:
            from firebase_admin import messaging

            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body, image=image_url),
                data={str(k): str(v) for k, v in (data or {}).items()},
                token=token,
                android=messaging.AndroidConfig(priority="high"),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(sound="default", badge=1)
                    )
                ),
            )
            messaging.send(message)
            return True
        except Exception as e:
            logger.error("FCM send failed for token %s: %s", token[:20], e)
            return False

    async def send_multicast(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> int:
        """멀티캐스트 발송. 성공 건수 반환."""
        app = self._get_app()
        if app == "dev":
            logger.info("[FCM-DEV] multicast %d tokens | %s: %s", len(tokens), title, body)
            return len(tokens)

        try:
            from firebase_admin import messaging

            message = messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                data={str(k): str(v) for k, v in (data or {}).items()},
                tokens=tokens,
                android=messaging.AndroidConfig(priority="high"),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(sound="default", badge=1)
                    )
                ),
            )
            response = messaging.send_each_for_multicast(message)
            return response.success_count
        except Exception as e:
            logger.error("FCM multicast failed: %s", e)
            return 0


fcm_service = FCMService()
