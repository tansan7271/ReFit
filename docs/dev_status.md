# ReFit — 개발 현황 추적 (Dev Status)

> **대상 독자:** AI 코딩 에이전트. 이 파일은 현재 구현 상태를 빠르게 파악하고
> 중복 작업·충돌을 방지하기 위한 단일 진실 소스입니다.
> 새로운 기능을 구현하거나 완료하면 이 파일을 함께 업데이트하세요.
>
> **Last updated:** 2026-05-20

---

## 범례

| 기호 | 의미 |
|------|------|
| ✅ | 구현 완료 (DB 마이그레이션 포함) |
| 🔧 | 껍데기(stub) 존재, 내부 로직 미구현 |
| ❌ | 미구현 |
| ⚠️ | 구현됐으나 검토 필요 |

---

## 1. 백엔드 (FastAPI + MySQL)

### 1-1. 인프라 / 설정

| 항목 | 상태 | 파일 |
|------|------|------|
| Docker Compose (MySQL + API + cloudflared) | ✅ | `backend/docker-compose.yml` |
| 환경변수 관리 (pydantic-settings) | ✅ | `backend/app/core/config.py` |
| 비동기 DB 엔진 (aiomysql + SQLAlchemy) | ✅ | `backend/app/core/database.py` |
| Alembic 마이그레이션 (3개 적용 완료) | ✅ | `backend/alembic/versions/` |
| Dockerfile (non-root appuser) | ✅ | `backend/Dockerfile` |
| CORS 미들웨어 | ✅ | `backend/app/main.py` — `settings.CORS_ORIGINS` 기반, `.env`에서 설정 |
| Rate limiting (slowapi) | ✅ | `backend/app/core/rate_limit.py` — login/register에 `5/minute` 적용 |
| Swagger 문서 (`/docs`, `/redoc`, `/openapi.json`) | ✅ | `DEBUG=True`일 때만 노출, 프로덕션 비공개 |

### 1-2. DB 모델

| 모델 | 상태 | 파일 |
|------|------|------|
| User, UserInBody | ✅ | `backend/app/models/user.py` |
| WorkoutPlan, WorkoutSession, WorkoutSet, Exercise | ✅ | `backend/app/models/workout.py` |
| SleepRecord | ✅ | `backend/app/models/sleep.py` |
| Badge, UserBadge | ✅ | `backend/app/models/badge.py` |
| Notification, NotificationSetting, PushToken | ✅ | `backend/app/models/notification.py` |
| Community (Post, Like 등) | 🔧 | `backend/app/models/community.py` — MVP 이후 스코프 |

> **User 모델 추가 필드 (migration c2b3d4e5f6a7):**
> `sleep_goal_bedtime VARCHAR(5)`, `sleep_goal_wakeup VARCHAR(5)`, `sleep_goal_minutes INT`

### 1-3. API 라우터

**Base prefix: `/api/v1`**

### 1-5. 보안 현황 (2026-05-20 기준)

| 항목 | 상태 |
|------|------|
| IDOR (notifications) | ✅ 패치 완료 — 발신 대상 `current_user.id` 고정 |
| CORS wildcard | ✅ 제거 — `CORS_ORIGINS` env 기반 |
| Rate limiting | ✅ login/register `5/minute` 적용 |
| SECRET_KEY 기본값 방어 | ✅ `DEBUG=False`이면 startup 차단 |
| Swagger 문서 프로덕션 노출 | ✅ `DEBUG=True`일 때만 활성화 |
| JWT 무효화 (로그아웃) | ❌ 미구현 — refresh token 폐기 불가 |

### 3. 백엔드 API 라우터

#### Auth (`/auth`)
| 엔드포인트 | 상태 | 비고 |
|------------|------|------|
| `POST /auth/register` | ✅ | 회원가입 + NotificationSetting 자동 생성 |
| `POST /auth/login` | ✅ | JWT access + refresh 토큰 반환 |
| `POST /auth/refresh` | ✅ | refresh 토큰으로 재발급 |

#### Users (`/users`)
| 엔드포인트 | 상태 | 비고 |
|------------|------|------|
| `POST /users/me/onboard` | ✅ | 온보딩 완료 + FCM 웰컴 알림 |
| `GET /users/me` | ✅ | 내 프로필 조회 |
| `PATCH /users/me` | ✅ | 프로필 수정 |
| `GET /users/me/sleep-goal` | ✅ | 수면 목표 조회 |
| `PUT /users/me/sleep-goal` | ✅ | 수면 목표 수정 |
| `POST /users/me/inbody` | ✅ | 인바디 기록 추가 |
| `GET /users/me/inbody` | ✅ | 인바디 기록 목록 |
| `GET /users/{user_id}` | ✅ | 공개 프로필 (인증 필요) |

#### Workouts (`/workouts`)
| 엔드포인트 | 상태 | 비고 |
|------------|------|------|
| `GET /workouts/exercises` | ✅ | 운동 마스터 목록 (근육군 필터) |
| `GET /workouts/plans` | ✅ | 내 주간 플랜 조회 |
| `POST /workouts/plans` | ✅ | 플랜 생성 |
| `PATCH /workouts/plans/{id}` | ✅ | 플랜 수정 |
| `DELETE /workouts/plans/{id}` | ✅ | 플랜 삭제 |
| `POST /workouts/sessions/start` | ✅ | 운동 세션 시작 |
| `POST /workouts/sessions/{id}/complete` | ✅ | 세션 완료 + XP/레벨 계산 |
| `GET /workouts/sessions` | ✅ | 세션 히스토리 |
| `GET /workouts/sessions/{id}` | ✅ | 세션 상세 |

#### Sleep (`/sleep`)
| 엔드포인트 | 상태 | 비고 |
|------------|------|------|
| `POST /sleep` | ✅ | 수면 기록 단건 생성 |
| `POST /sleep/sync` | ✅ | HealthKit/Health Connect 벌크 동기화 (멱등) |
| `GET /sleep` | ✅ | 수면 기록 목록 (최근 14일) |
| `GET /sleep/stats` | ✅ | 수면 통계 (평균 시간, 평균 품질) |
| `DELETE /sleep/{id}` | ✅ | 수면 기록 삭제 |

#### Notifications (`/notifications`)
| 엔드포인트 | 상태 | 비고 |
|------------|------|------|
| `POST /notifications/push-token` | 🔧 | FCM 토큰 등록 (구현 확인 필요) |
| `GET /notifications/settings` | 🔧 | 알림 설정 조회 |
| `PATCH /notifications/settings` | 🔧 | 알림 설정 수정 |

#### Badges (`/badges`)
| 엔드포인트 | 상태 | 비고 |
|------------|------|------|
| `GET /badges` | 🔧 | 뱃지 목록 + 획득 여부 |
| `POST /badges/check` | ❌ | 조건 충족 시 자동 수여 로직 미구현 |

#### Community (`/community`)
| 상태 | 비고 |
|------|------|
| 🔧 | MVP 이후 스코프. 라우터 파일은 있음 |

### 1-4. 서비스 레이어

| 서비스 | 상태 | 파일 |
|--------|------|------|
| FCM 서비스 (푸시 알림 발송) | ✅ | `backend/app/services/fcm_service.py` |
| 뱃지 자동 수여 | 🔧 | `backend/app/services/badge_service.py` |
| **Gemini AI 서비스** | ❌ | **핵심 미구현 — 운동 전/후 메시지 생성** |
| **OpenWeather 서비스** | ❌ | **미구현 — 날씨 컨텍스트 수집** |
| **APScheduler (서버 크론)** | ❌ | 패키지만 있음, 스케줄러 미연결 |

---

## 2. 프론트엔드 (React Native + Expo)

### 2-1. 인프라 / 설정

| 항목 | 상태 | 파일 |
|------|------|------|
| expo-router 파일 기반 라우팅 | ✅ | `frontend/app/` |
| Zustand 인증 스토어 | ✅ | `frontend/store/authStore.ts` |
| Zustand 온보딩 스토어 | ✅ | `frontend/store/onboardingStore.ts` — `age`/`gender`/`goal`/`characterEmoji` 필드 포함 |
| SecureStore (iOS/Android) + localStorage (web) | ✅ | `frontend/services/storage.ts` — 단일 출처로 분리 |
| API 클라이언트 | ✅ | `frontend/services/api.ts` — 인터셉터, `AuthSession` 타입, 백엔드 필드명 매핑 완료 |
| Health 데이터 서비스 | 🔧 | `frontend/services/health.ts` — 기본 구조만 |
| 디자인 토큰 (컬러, 타이포, 라벨) | ✅ | `frontend/constants/` |

### 2-2. 화면 구현 상태

#### 인증
| 화면 | 상태 | 파일 |
|------|------|------|
| 로그인 | 🔧 | `frontend/app/(auth)/login.tsx` |
| 회원가입 | 🔧 | `frontend/app/(auth)/register.tsx` |

#### 온보딩 (5단계)
| 화면 | 상태 | 파일 |
|------|------|------|
| 운동 루틴 설정 | 🔧 | `frontend/app/(onboarding)/workout-routine.tsx` |
| 수면 목표 설정 | 🔧 | `frontend/app/(onboarding)/sleep-goal.tsx` |
| 신체 프로필 입력 | 🔧 | `frontend/app/(onboarding)/physical-profile.tsx` |
| 헬스 앱 연동 권한 | 🔧 | `frontend/app/(onboarding)/health-connect.tsx` |
| 캐릭터 인트로 | 🔧 | `frontend/app/(onboarding)/character-intro.tsx` |

#### 메인 탭
| 화면 | 상태 | 파일 |
|------|------|------|
| 홈 (캐릭터 + 오늘 일정) | 🔧 | `frontend/app/(main)/index.tsx` |
| 운동 | 🔧 | `frontend/app/(main)/workout.tsx` |
| 기록 (히스토리) | 🔧 | `frontend/app/(main)/history.tsx` |
| 마이페이지 | 🔧 | `frontend/app/(main)/profile.tsx` |

### 2-3. 공통 컴포넌트

| 컴포넌트 | 상태 | 파일 |
|----------|------|------|
| PrimaryButton | ✅ | `frontend/components/ui/PrimaryButton.tsx` |
| SecondaryButton | ✅ | `frontend/components/ui/SecondaryButton.tsx` |
| OnboardingScreen (레이아웃 래퍼) | ✅ | `frontend/components/ui/OnboardingScreen.tsx` |
| SelectCard (옵션 선택 카드) | ✅ | `frontend/components/ui/SelectCard.tsx` |
| Chip | ✅ | `frontend/components/ui/Chip.tsx` |
| StepDots (온보딩 진행 표시) | ✅ | `frontend/components/ui/StepDots.tsx` |
| TimeField (시간 입력) | ✅ | `frontend/components/ui/TimeField.tsx` |
| PlaceholderScreen | ✅ | `frontend/components/ui/PlaceholderScreen.tsx` |

### 2-4. 미구현 기능

| 기능 | 비고 |
|------|------|
| 백엔드 API 실제 연동 | 모든 화면이 로컬 상태만 사용 중 |
| HealthKit / Health Connect 실제 데이터 읽기 | `health.ts`에 인터페이스만 정의 |
| Gemini 알림 생성 (로컬 스케줄) | `expo-notifications`, `expo-background-fetch` 미연결 |
| Lottie 캐릭터 애니메이션 | 에셋 미확정 (지민 담당) |
| 운동 세션 인-앱 화면 (세트 카운터) | 미구현 |
| 운동 후 리포트 화면 | 미구현 |

---

## 3. 다음 우선순위 작업

> 로드맵 1주차 — 인증 + 온보딩 화면 실제 구현 단계

### 백엔드 (다은)
1. `GET /workouts/exercises` 용 시드 데이터 추가 (운동 마스터 데이터)
2. Gemini 서비스 레이어 구현 (`backend/app/services/gemini_service.py`)
3. OpenWeather 서비스 구현 (`backend/app/services/weather_service.py`)

### 프론트엔드 (수빈)
1. 로그인 / 회원가입 화면 실제 API 연동 (`api.ts`의 `login()`/`register()` → `AuthSession` 반환)
2. 온보딩 5단계 흐름 구현 + `/users/me/onboard` 호출 (`onboardingStore.buildPayload()` 사용)
   - **주의:** `age`, `gender`, `goal`, `character_emoji` 수집 화면 추가 필요 (store 필드는 있음)
3. 홈 화면 — `GET /users/me` 기반 캐릭터 상태 표시
4. Refresh token 갱신 로직 구현 (401 응답 시 자동 재발급)

### 공통 (도균)
1. `useHealthData` 훅 구현 (iOS HealthKit ↔ Android Health Connect 통합 인터페이스)
2. `expo-notifications` + `expo-background-fetch` + Gemini 연동 알림 파이프라인

---

## 4. 알려진 기술 부채

| 항목 | 위치 | 설명 |
|------|------|------|
| DB 커밋 누락 가능성 | 여러 라우터 | `await db.commit()` 없이 `flush()`만 사용 — `autocommit` 설정 확인 필요 |
| 커뮤니티 모델 | `backend/app/models/community.py` | MVP 이후 스코프이나 라우터에 등록돼 있음 |
| JWT 무효화 (로그아웃) | `backend/app/routers/auth.py` | refresh token 폐기 메커니즘 없음 — 60분 만료 후 강제 로그아웃 |
| Refresh token 갱신 프론트 미구현 | `frontend/services/api.ts` | 401 시 자동 재발급 로직 없음 |
| 온보딩 필수 필드 수집 화면 없음 | `frontend/store/onboardingStore.ts` | `age`, `gender`, `goal`, `character_emoji` store 필드는 있으나 입력 UI 미구현 |
| `.env`에 `CORS_ORIGINS` 미설정 | `backend/.env` | 기본값(localhost) 사용 중 — 프로덕션 배포 전 설정 필요 |
