"""
Google Gemini AI 서비스

용도:
  - 운동 전 동기 메시지 생성
  - 운동 후 피드백 메시지 생성
  - 수면 분석 메시지 생성

GEMINI_API_KEY가 없으면 fallback 메시지를 반환하므로
키가 없는 환경에서도 서버가 정상 동작합니다.
"""
from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# SDK import — 키가 없는 환경에서도 import 실패 방지
try:
    import google.generativeai as genai
    from google.api_core import exceptions as _api_exceptions
    _SDK_AVAILABLE = True
except ImportError:
    _api_exceptions = None  # type: ignore[assignment]
    _SDK_AVAILABLE = False
    logger.warning("google-generativeai 패키지가 없습니다. fallback 메시지를 사용합니다.")


class GeminiService:
    _MODEL = "gemini-3.1-flash-lite"

    def __init__(self) -> None:
        self._enabled = bool(settings.GEMINI_API_KEY) and _SDK_AVAILABLE
        if self._enabled:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._model = genai.GenerativeModel(self._MODEL)
        else:
            self._model = None

    # ── 내부 헬퍼 ────────────────────────────────────────────────────────────

    # API 호출 타임아웃 (초). gemini-3.1-flash-lite 콜드스타트 고려해 여유있게 설정.
    _REQUEST_TIMEOUT = 25

    async def _generate(self, prompt: str, fallback: str) -> str:
        if not self._enabled or self._model is None:
            return fallback
        try:
            response = await self._model.generate_content_async(
                prompt,
                request_options={"timeout": self._REQUEST_TIMEOUT},
            )
            return response.text.strip()
        except Exception as exc:
            if _api_exceptions and isinstance(exc, _api_exceptions.RetryError):
                logger.warning(
                    "Gemini API 호출 타임아웃(%ss): %s", self._REQUEST_TIMEOUT, exc
                )
            else:
                logger.warning("Gemini API 호출 실패: %s", exc)
            return fallback

    # ── 퍼블릭 API ───────────────────────────────────────────────────────────

    async def pre_workout_message(
        self,
        *,
        nickname: str,
        character_emoji: str,
        fitness_level: str,
        is_rest_day: bool = False,
        plan_name: str | None = None,
        weather_desc: str | None = None,
        sleep_hours: float | None = None,
        steps: int | None = None,
        resting_hr: float | None = None,
        body_fat_percent: float | None = None,
        muscle_mass_kg: float | None = None,
    ) -> str:
        """운동 시작 전 동기 부여 메시지 (2~3문장).

        수면 시간, 걸음수, 안정 심박수, 체성분 데이터가 있으면 컨디션을 반영한 메시지를 생성한다.
        휴식일이면 회복 중심 메시지를 생성한다.
        """
        condition_parts: list[str] = []
        if sleep_hours is not None:
            condition_parts.append(f"어젯밤 수면 {sleep_hours:.1f}시간")
        if steps is not None:
            condition_parts.append(f"오늘 걸음수 {steps:,}보")
        if resting_hr is not None:
            condition_parts.append(f"안정 심박수 {resting_hr:.0f}bpm")
        condition_info = f"컨디션 정보: {', '.join(condition_parts)}." if condition_parts else ""

        if is_rest_day:
            prompt = (
                f"너는 피트니스 앱의 친근한 AI 트레이너야. "
                f"사용자 닉네임: {nickname}, 캐릭터: {character_emoji}, 운동 수준: {fitness_level}. "
                f"오늘은 루틴상 쉬는 날이야. {condition_info} "
                f"쉬는 날의 의미와 회복의 중요성을 짧게 짚어주고, "
                f"가벼운 스트레칭·산책·수분 보충 등 액티브 리커버리 팁을 1가지 자연스럽게 넣어줘. "
                f"운동을 권유하거나 동기 부여하는 내용은 절대 넣지 마. "
                f"2~3문장 한국어, 이모지 1개, 존댓말."
            )
            fallback = f"{character_emoji} {nickname}님, 오늘은 푹 쉬는 날이에요! 몸이 회복되는 동안 가벼운 스트레칭으로 근육을 풀어줘 보세요 🌿"
        elif plan_name:
            weather_info = f"현재 날씨: {weather_desc}." if weather_desc else ""

            body_comp_parts: list[str] = []
            if body_fat_percent is not None:
                body_comp_parts.append(f"체지방률 {body_fat_percent:.1f}%")
            if muscle_mass_kg is not None:
                body_comp_parts.append(f"근육량 {muscle_mass_kg:.1f}kg")
            body_comp_info = f"체성분: {', '.join(body_comp_parts)}." if body_comp_parts else ""

            prompt = (
                f"너는 피트니스 앱의 친근한 AI 트레이너야. "
                f"사용자 닉네임: {nickname}, 캐릭터: {character_emoji}, 운동 수준: {fitness_level}. "
                f"오늘 루틴: {plan_name}. {weather_info} {condition_info} {body_comp_info} "
                f"운동을 막 시작하려는 사용자에게 짧고 활기찬 한국어 응원 메시지를 2~3문장으로 써줘. "
                f"체성분 정보가 있으면 목표(체지방 감량 또는 근육 증가)에 맞는 오늘 운동 포인트를 자연스럽게 녹여줘. "
                f"이모지 1~2개 포함, 존댓말 사용."
            )
            fallback = f"{character_emoji} {nickname}님, 오늘도 파이팅! 할 수 있어요 💪"
        else:
            # 오늘 등록된 루틴 없음 — 일반 컨디션 메시지
            prompt = (
                f"너는 건강 앱의 친근한 AI 코치야. "
                f"사용자 닉네임: {nickname}, 캐릭터: {character_emoji}. "
                f"오늘은 별도로 등록된 운동 루틴이 없는 날이야. {condition_info} "
                f"운동을 강요하지 말고, 오늘 컨디션을 바탕으로 몸과 마음을 챙기는 가벼운 한마디를 2문장으로 해줘. "
                f"이모지 1개, 존댓말."
            )
            fallback = f"{character_emoji} {nickname}님, 오늘도 건강한 하루 보내세요!"

        return await self._generate(prompt, fallback)

    async def morning_care_message(
        self,
        *,
        nickname: str,
        character_emoji: str,
        sleep_hours: float | None = None,
        weather_desc: str | None = None,
    ) -> str:
        """기상 30분 후 아침 컨디션 케어 메시지 (2~3문장).

        수면 데이터와 날씨 위주로, 가볍게 오늘 컨디션을 체크해 주는 메시지.
        """
        sleep_info = f"어젯밤 수면 시간: {sleep_hours:.1f}시간" if sleep_hours else "수면 데이터 없음"
        weather_info = f"현재 날씨: {weather_desc}" if weather_desc else ""

        prompt = (
            f"너는 건강 앱의 친근한 AI 코치야. "
            f"사용자 닉네임: {nickname}, 캐릭터: {character_emoji}. "
            f"막 기상한 사용자에게 아침 컨디션 메시지를 전달해줘. "
            f"{sleep_info}. {weather_info} "
            f"수면 상태를 간단히 평가하고 오늘 하루 컨디션 관리 팁을 1가지 포함해서 "
            f"2~3문장 한국어로 써줘. 이모지 1개, 존댓말."
        )
        fallback = f"🌅 {nickname}님, 좋은 아침이에요! 오늘도 건강한 하루 시작해봐요."
        return await self._generate(prompt, fallback)

    async def post_workout_message(
        self,
        *,
        nickname: str,
        character_emoji: str,
        duration_min: int,
        total_volume_kg: float | None,
        xp_earned: int,
        completed_sets: int,
        completed_parts: list[str] | None = None,
        muscle_mass_kg: float | None = None,
    ) -> str:
        """운동 완료 후 수고 칭찬 + 완료 부위별 리커버리 조언 (2~3문장)."""
        volume_info = f"총 볼륨 {total_volume_kg:.1f}kg" if total_volume_kg else ""

        PART_KO = {
            "chest": "가슴", "back": "등", "shoulder": "어깨",
            "arm": "팔", "leg": "하체", "core": "코어", "cardio": "유산소",
        }
        parts_info = ""
        if completed_parts:
            ko_parts = [PART_KO.get(p, p) for p in completed_parts]
            parts_info = f"오늘 운동한 부위: {', '.join(ko_parts)}."

        muscle_info = f"현재 근육량 {muscle_mass_kg:.1f}kg." if muscle_mass_kg is not None else ""

        prompt = (
            f"너는 피트니스 앱의 친근한 AI 트레이너야. "
            f"사용자 닉네임: {nickname}, 캐릭터: {character_emoji}. "
            f"방금 운동 완료: {volume_info} XP {xp_earned} 획득. {parts_info} {muscle_info} "
            f"수고했다는 칭찬 1문장 + 오늘 운동한 부위에 맞는 리커버리 팁 1~2문장을 "
            f"근육 성장 관점에서 한국어로 써줘. 이모지 1~2개, 존댓말."
        )
        fallback = (
            f"{character_emoji} {nickname}님, 오늘 운동 완료! "
            f"XP {xp_earned}을 획득했어요. 충분한 수분 보충과 스트레칭으로 마무리해요 💪"
        )
        return await self._generate(prompt, fallback)

    async def sleep_analysis_message(
        self,
        *,
        nickname: str,
        avg_duration_hours: float,
        avg_quality_score: float | None,
        goal_hours: float | None,
    ) -> str:
        """수면 통계 기반 분석 메시지 (2~3문장)."""
        goal_info = f"목표 수면 시간: {goal_hours:.1f}시간" if goal_hours else "목표 미설정"
        quality_info = f"평균 수면 품질 점수: {avg_quality_score:.0f}/100" if avg_quality_score else ""

        prompt = (
            f"너는 건강 앱의 친근한 AI 코치야. "
            f"사용자 닉네임: {nickname}. "
            f"최근 평균 수면 시간: {avg_duration_hours:.1f}시간. {quality_info}. {goal_info}. "
            f"수면 상태를 간략히 평가하고 개선 팁을 1가지 포함한 한국어 메시지를 2~3문장으로 써줘. "
            f"이모지 1개 포함, 존댓말 사용."
        )
        fallback = (
            f"😴 {nickname}님의 최근 평균 수면은 {avg_duration_hours:.1f}시간이에요. "
            f"규칙적인 취침 시간을 지키면 수면의 질이 높아져요!"
        )
        return await self._generate(prompt, fallback)


gemini_service = GeminiService()
