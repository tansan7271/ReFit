"""
OpenWeather 현재 날씨 서비스

- 도시명 또는 위·경도로 현재 날씨 조회
- 1시간 인메모리 캐싱으로 API 호출 절감
- OPENWEATHER_API_KEY가 없으면 None 반환 (서버 정상 동작)
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
_CACHE_TTL = 3600  # 1시간


@dataclass
class WeatherInfo:
    city: str
    temp_c: float           # 섭씨 기온
    feels_like_c: float     # 체감 온도
    humidity: int           # 습도 (%)
    description: str        # 날씨 설명 (한국어)
    icon: str               # 날씨 아이콘 코드 (예: "01d")
    wind_speed: float       # 풍속 (m/s)
    is_outdoor_ok: bool     # 야외 운동 적합 여부


@dataclass
class _CacheEntry:
    data: WeatherInfo
    expires_at: float = field(default_factory=lambda: time.monotonic() + _CACHE_TTL)

    def is_valid(self) -> bool:
        return time.monotonic() < self.expires_at


class WeatherService:
    def __init__(self) -> None:
        self._enabled = bool(settings.OPENWEATHER_API_KEY)
        self._cache: dict[str, _CacheEntry] = {}

    def _cache_key(self, city: str | None, lat: float | None, lon: float | None) -> str:
        if lat is not None and lon is not None:
            return f"{lat:.2f},{lon:.2f}"
        return (city or "").lower()

    def _parse(self, data: dict[str, Any]) -> WeatherInfo | None:
        """OpenWeather 응답을 WeatherInfo로 변환.

        응답 스키마가 예상과 다르거나 필수 키가 누락된 경우
        예외를 던지지 않고 None을 반환한다. 호출부는 None을
        '날씨 정보 없음'으로 graceful하게 처리해야 한다.
        """
        try:
            main = data["main"]
            weather_list = data.get("weather") or []
            if not weather_list:
                logger.warning("OpenWeather 응답에 weather 항목이 없습니다")
                return None
            weather = weather_list[0]
            wind = data.get("wind", {})

            temp = main["temp"] - 273.15
            feels = main["feels_like"] - 273.15
            wind_speed = wind.get("speed", 0.0)

            # 야외 운동 적합 여부: 기온 5~33도, 풍속 10m/s 이하, 비/눈 아님
            bad_weather_ids = {2, 3, 5, 6}  # 뇌우, 이슬비, 비, 눈 (첫 자리)
            weather_main_id = weather.get("id", 0) // 100
            is_outdoor_ok = (
                5 <= temp <= 33
                and wind_speed <= 10
                and weather_main_id not in bad_weather_ids
            )

            return WeatherInfo(
                city=data.get("name", ""),
                temp_c=round(temp, 1),
                feels_like_c=round(feels, 1),
                humidity=main["humidity"],
                description=weather.get("description", ""),
                icon=weather.get("icon", ""),
                wind_speed=wind_speed,
                is_outdoor_ok=is_outdoor_ok,
            )
        except (KeyError, TypeError, ValueError) as exc:
            logger.warning("OpenWeather 응답 파싱 실패: %s", exc)
            return None

    async def get_weather(
        self,
        *,
        city: str | None = None,
        lat: float | None = None,
        lon: float | None = None,
        lang: str = "kr",
    ) -> WeatherInfo | None:
        """현재 날씨 조회. 캐시 히트 시 API 호출 없이 반환."""
        if not self._enabled:
            logger.debug("OPENWEATHER_API_KEY 미설정 — 날씨 조회 건너뜀")
            return None

        cache_key = self._cache_key(city, lat, lon)
        entry = self._cache.get(cache_key)
        if entry and entry.is_valid():
            return entry.data

        params: dict[str, Any] = {
            "appid": settings.OPENWEATHER_API_KEY,
            "lang": lang,
        }
        if lat is not None and lon is not None:
            params["lat"] = lat
            params["lon"] = lon
        elif city:
            params["q"] = city
        else:
            logger.warning("도시명 또는 위·경도 중 하나가 필요합니다")
            return None

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(_BASE_URL, params=params)
                resp.raise_for_status()
                info = self._parse(resp.json())
                if info is None:
                    # 파싱 실패 — None을 캐싱하지 않고 그대로 반환
                    return None
                self._cache[cache_key] = _CacheEntry(data=info)
                return info
        except httpx.HTTPStatusError as exc:
            logger.warning("OpenWeather HTTP 오류 %s: %s", exc.response.status_code, exc)
        except Exception as exc:
            logger.warning("OpenWeather 호출 실패: %s", exc)
        return None

    def describe(self, info: WeatherInfo) -> str:
        """날씨 정보를 자연어로 요약 (Gemini 프롬프트에 주입용)."""
        outdoor = "야외 운동 적합" if info.is_outdoor_ok else "야외 운동 비추천"
        return (
            f"{info.city} {info.temp_c}°C (체감 {info.feels_like_c}°C), "
            f"{info.description}, 습도 {info.humidity}%, {outdoor}"
        )


weather_service = WeatherService()
