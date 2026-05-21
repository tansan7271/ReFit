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
    _SDK_AVAILABLE = True
except ImportError:
    _SDK_AVAILABLE = False
    logger.warning("google-generativeai 패키지가 없습니다. fallback 메시지를 사용합니다.")


class GeminiService:
    _MODEL = "gemini-1.5-flash"

    def __init__(self) -> None:
        self._enabled = bool(settings.GEMINI_API_KEY) and _SDK_AVAILABLE
        if self._enabled:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._model = genai.GenerativeModel(self._MODEL)
        else:
            self._model = None

    # ── 내부 헬퍼 ────────────────────────────────────────────────────────────

    async def _generate(self, prompt: str, fallback: str) -> str:
        if not self._enabled or self._model is None:
            return fallback
        try:
            response = await self._model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as exc:
            logger.warning("Gemini API 호출 실패: %s", exc)
            return fallback

    # ── 퍼블릭 API ───────────────────────────────────────────────────────────

    async def pre_workout_message(
        self,
        *,
        nickname: str,
        character_emoji: str,
        fitness_level: str,
        plan_name: str | None = None,
        weather_desc: str | None = None,
    ) -> str:
        """운동 시작 전 동기 부여 메시지 (2~3문장)."""
        plan_info = f"오늘 루틴: {plan_name}" if plan_name else "자유 운동"
        weather_info = f"현재 날씨: {weather_desc}" if weather_desc else ""

        prompt = (
            f"너는 피트니스 앱의 친근한 AI 트레이너야. "
            f"사용자 닉네임: {nickname}, 캐릭터: {character_emoji}, 운동 수준: {fitness_level}. "
            f"{plan_info}. {weather_info} "
            f"운동을 막 시작하려는 사용자에게 짧고 활기찬 한국어 응원 메시지를 2~3문장으로 써줘. "
            f"이모지 1~2개 포함, 존댓말 사용."
        )
        fallback = f"{character_emoji} {nickname}님, 오늘도 파이팅! 할 수 있어요 💪"
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
    ) -> str:
        """운동 완료 후 피드백 메시지 (2~3문장)."""
        volume_info = f"총 볼륨 {total_volume_kg:.1f}kg" if total_volume_kg else ""

        prompt = (
            f"너는 피트니스 앱의 친근한 AI 트레이너야. "
            f"사용자 닉네임: {nickname}, 캐릭터: {character_emoji}. "
            f"방금 운동을 완료했어: 운동 시간 {duration_min}분, {volume_info}, "
            f"완료 세트 {completed_sets}개, 획득 XP {xp_earned}. "
            f"수고했다는 칭찬과 함께 짧은 한국어 피드백을 2~3문장으로 써줘. "
            f"이모지 1~2개 포함, 존댓말 사용."
        )
        fallback = (
            f"{character_emoji} {nickname}님, {duration_min}분 운동 완료! "
            f"XP {xp_earned}을 획득했어요. 정말 대단해요! 🎉"
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
