# ReFit — 최종 기능 리스트

> **포지셔닝:** "많은 앱이 운동을 기록한다. ReFit은 AI로 운동 전을 준비하고, 운동 후를 회복시킨다."
> **원칙:** 운동 중 수동 기록 없음. 운동 데이터는 Apple Health / Health Connect 자동 동기화.
> **확정일:** 2026-06-11

---

## 범례

| 기호 | 의미 |
|------|------|
| ✅ | 백엔드 + 프론트 완성 |
| 🚧 | 부분 구현 |
| ❌ | 미구현 / 설계 제외 |
| ⭐ | 기존 feature_master.md 대비 신규 추가 |

---

## 앱 플로우

```
로그인 / 회원가입
       │
       ▼
   온보딩 (최초 1회, 5단계)
   루틴 → 수면 목표 → 신체 정보 → 헬스 연동 → 캐릭터
       │
       ▼
  ┌─────────────────────────────────────────┐
  │               메인 탭                    │
  │  홈  ·  운동  ·  커뮤니티  ·  프로필    │
  └─────────────────────────────────────────┘
           │
           ▼ (운동 탭 → 운동 전 체크 버튼)
  운동 전 모달 → (세션 자동 진행) → 운동 후 모달
```

---

## 1. 인증

| 기능 | 엔드포인트 | 상태 |
|------|-----------|------|
| 이메일/비밀번호 로그인 | `POST /auth/login` | ✅ |
| 회원가입 (닉네임·이메일·비밀번호) | `POST /auth/register` | ✅ |
| JWT 자동 갱신 (401 인터셉터) | `POST /auth/refresh` | ✅ |

---

## 2. 온보딩 (5단계)

| 단계 | 기능 | 엔드포인트 | 상태 |
|------|------|-----------|------|
| 1/5 | 운동 루틴 — 요일별 타깃 부위, 휴식일, 운동 예정 시간 | `POST /users/me/onboard` | ✅ |
| 2/5 | 수면 목표 — 취침·기상 시각 | `POST /users/me/onboard` | ✅ |
| 3/5 | 신체 정보 — 키·몸무게·숙련도·운동 목표 | `POST /users/me/onboard` | ✅ |
| 4/5 | 헬스 앱 연동 권한 요청 (iOS/Android 분기) | 프론트 전용 | ✅ |
| 5/5 | 캐릭터 배정 & 전체 데이터 제출 | `POST /users/me/onboard` | ✅ |

---

## 3. 홈 탭

| 기능 | 엔드포인트 | 상태 |
|------|-----------|------|
| 픽셀 캐릭터 렌더링 (상태별 애니메이션) ⭐ | `GET /character` | ✅ |
| 레벨 / XP 바 | `GET /users/me` | ✅ |
| 오늘 날짜·요일 + 닉네임 인사말 | — (클라이언트) | ✅ |
| 컨디션 스냅샷 (수면 + 날씨 한 줄) | `GET /workouts/pre-message`, `GET /sleep/stats?days=1` | ✅ |
| 장착 배지 표시 ⭐ | `GET /character` | ✅ |
| "운동 전 체크하기" 버튼 | — | ✅ |

---

## 4. 운동 탭

| 기능 | 엔드포인트 | 상태 |
|------|-----------|------|
| 오늘 운동 플랜 (타깃 부위 칩) | `GET /workouts/plans` | ✅ |
| 휴식일 표시 | `GET /workouts/plans` (`is_rest_day`) | ✅ |
| 이번 주 완료 세션 수 / 총 XP / 총 볼륨 요약 | `GET /workouts/sessions` | ✅ |
| 최근 운동 기록 목록 (7일) | `GET /workouts/sessions` | ✅ |
| "운동 전 체크하기" 버튼 | — | ✅ |

---

## 5. 운동 핵심 플로우

### 5-1. 운동 전 모달 (Pre-Workout)

| 기능 | 엔드포인트 | 상태 |
|------|-----------|------|
| 어젯밤 수면 시간 + 양호/부족 판정 | `GET /sleep/stats?days=1` | ✅ |
| 오늘 날씨 (온도·체감·습도·야외 적합 여부) | `GET /workouts/pre-message` | ✅ |
| 걸음수·안정 심박수 (헬스 앱 동기화) | `POST /health/sync` → 캐시 | ✅ |
| AI 운동 전 케어 팁 (Gemini) | `GET /workouts/care-message` | ✅ |
| "운동 시작!" → 세션 생성 | `POST /workouts/sessions/start` | ✅ |

### 5-2. 운동 중 (In-Workout)

| 기능 | 엔드포인트 | 상태 |
|------|-----------|------|
| 세션 자동 시작 (별도 화면 없음) | `POST /workouts/sessions/start` | ✅ |
| 헬스 데이터 백그라운드 수집 | HealthKit / Health Connect | ✅ |
| ~~운동 중 타이머 화면~~ | — | ❌ 의도적 제외 |

> **설계 원칙:** 운동 중 별도 UI 없음. 헬스 앱이 자동으로 데이터를 수집하며, 세션은 백그라운드에서 진행됨.

### 5-3. 운동 후 모달 (Post-Workout)

| 기능 | 엔드포인트 | 상태 |
|------|-----------|------|
| 세션 요약 카드 (시간·칼로리·XP·볼륨) | `POST /workouts/sessions/{id}/complete` 응답 | ✅ |
| 레벨/XP 갱신 (홈 XP 바 자동 반영) | `xp_earned` → `GET /users/me` 재조회 | ✅ |
| AI 운동 후 회복 팁 (Gemini, 완료 즉시) | `ai_feedback` 필드 | ✅ |
| 완료 부위 수정 → XP 재계산 | `PATCH /workouts/sessions/{id}/parts` | ✅ |

> **참고:** 운동 후 Gemini 회복 팁은 완료 응답의 `ai_feedback`에 **즉시** 담겨 반환됨. 별도 지연 알림(예: N시간 후)은 없음. 전용 `level_up` 플래그는 백엔드 응답에 없으며, XP 누적분으로 레벨이 재계산되어 홈 XP 바에 반영됨.

### 5-4. XP · 레벨 시스템

| 항목 | 규칙 |
|------|------|
| 최초 완료 XP | 기본 50 + 완료 부위 수 × 10 |
| 완료 부위 수정 시 | 추가 부위 × +10 / 제거 부위 × −10 (기본 XP 변동 없음) |
| 레벨 공식 | `character_level = 1 + character_xp // 500` (레벨당 500 XP 고정) |
| 누적 위치 | `WorkoutSession.xp_earned`(세션별), `User.character_xp`(전체 누적) |

---

## 6. 프로필 (마이페이지)

| 기능 | 엔드포인트 | 상태 |
|------|-----------|------|
| 캐릭터·닉네임·레벨·XP 표시 | `GET /users/me`, `GET /character` | ✅ |
| 프로필 수정 (닉네임) | `PATCH /users/me` | ✅ |
| 인바디 최신 수치 표시 | `GET /users/me/inbody?limit=1` | ✅ |
| 인바디 수치 직접 입력 | `POST /users/me/inbody` | ✅ |
| 운동 숙련도 표시 | `GET /users/me` | ✅ |
| 수면 목표 표시 / 수정 | `GET /users/me/sleep-goal`, `PUT /users/me/sleep-goal` | ✅ |
| 운동 루틴 수정 | `PATCH /workouts/plans/{id}`, `DELETE /workouts/plans/{id}` | ✅ |
| 배지 그리드 (획득/미획득 + 장착) | `GET /badges`, `GET /badges/me`, `POST /badges/me/equip` | ✅ |
| 알림 설정 | `GET /notifications/settings`, `PATCH /notifications/settings` | ✅ |
| 헬스 데이터 수동 동기화 버튼 ⭐ | `POST /sleep/sync`, `POST /health/sync` | ✅ |
| 로그아웃 | 프론트 전용 | ✅ |
| 디버그 패널 (Gemini 알림 즉시 트리거) ⭐ | `POST /debug/notifications/trigger` | ✅ |

---

## 7. 배지

| 기능 | 엔드포인트 | 상태 |
|------|-----------|------|
| 전체 배지 그리드 (획득/미획득 구분) | `GET /badges`, `GET /badges/me` | ✅ |
| 배지 장착 (홈에 표시) | `POST /badges/me/equip` | ✅ |
| 미획득 배지 달성 조건 표시 | `GET /badges` (`condition_value`) | ✅ |
| 배지 자동 지급 (운동 완료 시 판별) ⭐ | `POST /badges/check` | ✅ |

---

## 8. 커뮤니티

| 기능 | 엔드포인트 | 상태 |
|------|-----------|------|
| 친구 목록 조회 (캐릭터·레벨·배지 포함) | `GET /community/friends` | ✅ |
| 친구 요청 (닉네임 검색) ⭐ | `GET /users/search`, `POST /community/friends/request` | ✅ |
| 친구 요청 수락 | `POST /community/friends/{id}/accept` | ✅ |
| 친구 삭제 | `DELETE /community/friends/{id}` | ✅ |
| 콕 찌르기 (일일 1회 제한) | `POST /community/pokes` | ✅ |
| 받은 응원 목록 | `GET /community/pokes/received` | ✅ |
| 친구 활동 요약 (오늘 운동 여부·주간 횟수) ⭐ | `GET /community/friends/{id}/activity` | ✅ |
| Co-op 축하 알림 (둘 다 완료 시 FCM) ⭐ | `POST /community/coop/celebrate/{id}` | ✅ |
| ~~Co-op 배지~~ | — | ❌ 백엔드 미구현 |

---

## 9. 헬스 데이터 연동

### iOS (HealthKit)

| 데이터 | 동기화 주기 | 기간 |
|--------|-----------|------|
| 수면 (취침~기상, 단계별 분) | 포그라운드 진입 시 1회 / 백그라운드 15분 | 30일 |
| 걸음수 / 활동 칼로리 | pre-workout 진입 시 | 7일 |
| 안정 심박수 / 평균 심박수 | pre-workout 진입 시 | 7일 |

### Android (Health Connect)

| 데이터 | 동기화 주기 | 기간 |
|--------|-----------|------|
| 수면 (취침~기상, 단계별 분) | 포그라운드 진입 시 1회 / 백그라운드 15분 | 30일 |
| 걸음수 / 활동 칼로리 | pre-workout 진입 시 | 7일 |
| 안정 심박수 / 평균 심박수 | pre-workout 진입 시 | 7일 |

---

## 10. 푸시 알림

### 스케줄러 자동 발송 (APScheduler, Asia/Seoul)

| 알림 종류 | 트리거 조건 | Gemini | 데이터 타입 |
|----------|-----------|--------|------------|
| 아침 케어 | 기상 시각 + 30분 (매분 체크) | ✅ | `morning_care` |
| 운동 전 케어 | 플랜 예정 시각 - 30분 (매분 체크) | ✅ | `preworkout_care` |
| 고강도 후 회복 권장 ⭐ | 전날 고강도(피로 점수 ≥ 5.0) + 운동 예정 시각 | ❌ 고정 문자 | `preworkout_care` |
| 수면 리마인더 | 수면 목표 취침 시각 (매분 체크) | ❌ 고정 문자 | `sleep_reminder` |
| 비활동 동기부여 | 매일 09:00 KST, 3일 이상 미운동 | ❌ 고정 문자 | `inactivity_reminder` |

> 등록된 스케줄러 job은 위 4개(`morning_care` / `preworkout_care` / `sleep_reminder` / `inactivity_reminder`)이며, "고강도 후 회복 권장"은 별도 job이 아니라 `preworkout_care` 내부 분기다. 운동 후 회복 팁은 스케줄 알림이 아니라 완료 응답에 즉시 포함된다(섹션 5-3 참고).

### FCM 인프라

- **발송 경로:** Expo Push API (`exp.host`) → FCM (Android) / APNs (iOS)
- **토큰 관리:** 플랫폼별 저장 (`POST /notifications/token`)
- **iOS:** APNs 무료 계정 미지원으로 실기기 발송 불가 (개발자 계정 필요)
- **Android:** FCM + Expo 서비스 계정 등록으로 에뮬레이터·실기기 모두 정상 작동

---

## 11. Gemini AI 메시지 종류

| 메서드 | 호출 위치 | 입력값 요약 |
|--------|---------|-----------|
| `pre_workout_message()` | 스케줄러 + on-demand API | 숙련도, 수면, 걸음수, 심박수, 체지방, 근육량, 날씨, 루틴, 휴식일 여부 |
| `post_workout_message()` | 운동 완료 API | 운동 시간, 총볼륨, XP, 완료 부위, 근육량 |
| `morning_care_message()` | 스케줄러(아침) | 닉네임, 캐릭터, 수면 시간 |
| `sleep_analysis_message()` | `GET /sleep/analysis` | 닉네임, 평균 수면 시간, 평균 품질, 목표 시간 |

> **Fallback:** API 키 없거나 타임아웃 시 사전 정의 문자열 반환 — 서비스 중단 없음.

---

## 기존 계획 대비 변경 사항 요약

### 추가된 기능 ⭐

| 기능 | 설명 |
|------|------|
| 픽셀 캐릭터 9가지 상태 애니메이션 | neutral / happy / tired / sleeping / workout / flex / sedentary / overfed / derailed |
| 캐릭터 상태 API | `GET /character` — 레벨/XP/상태/피로도/장착 배지 |
| 고강도 운동 판별 알림 | 전날 피로 점수 ≥ 5.0이면 운동 전 케어 대신 회복 권장 |
| 케어 메시지 캐시 | FCM 수신 시 자동 저장, 날짜 기반 초기화 |
| 백그라운드 헬스 동기화 | Expo Background Fetch (15분 간격) |
| 디버그 알림 트리거 | 스케줄러 없이 Gemini 알림 즉시 생성 + 컨텍스트 확인 |
| 친구 요청/수락 | feature_master.md에서는 "백엔드 미구현 → 시연 제외"였으나 완전 구현 |
| Co-op 축하 FCM | 둘 다 오늘 운동 완료 시 양쪽에 알림 발송 |
| 배지 자동 지급 | 운동 완료 시 조건 판별 후 FCM까지 발송 |
| 인바디 기록 이력 | 날짜별 여러 건 저장 가능, 최신 1건 표시 |

### 사라진 기능

| 기능 | 사유 |
|------|------|
| 운동 중 타이머 화면 | 포지셔닝 원칙: 운동 중 수동 개입 없음 |
| 식단 기록 | 백엔드 모델(`models/diet.py`)만 존재, 라우터/프론트 미구현 (시연 범위 초과) |
| Co-op **배지** | 배지 자동 지급은 미구현. 단, Co-op **축하 알림**(`/community/coop/celebrate`)은 구현됨 (섹션 8 참고) |
| 워치 실시간 연동 | 구현 복잡도 과다 |
| AI 알림 로컬 스케줄 | 서버 스케줄러(APScheduler)로 대체 |
