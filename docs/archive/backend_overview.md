# Refit 백엔드 개요

> FE팀·기획팀이 백엔드 구조를 파악하고 협업할 수 있도록 작성한 문서입니다.  
> 실제 API 테스트는 서버 실행 후 **http://localhost:8000/docs** (Swagger UI) 를 이용하세요.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [폴더 구조](#2-폴더-구조)
3. [환경 설정](#3-환경-설정)
4. [로컬 실행 방법](#4-로컬-실행-방법)
5. [DB 스키마](#5-db-스키마)
6. [API 엔드포인트 전체 목록](#6-api-엔드포인트-전체-목록)
7. [인증 방식](#7-인증-방식)
8. [핵심 플로우](#8-핵심-플로우)
9. [게임화 시스템 (XP · 레벨 · 뱃지)](#9-게임화-시스템-xp--레벨--뱃지)
10. [푸시 알림 (FCM)](#10-푸시-알림-fcm)

---

## 1. 기술 스택

| 분류 | 기술 | 버전 | 역할 |
|---|---|---|---|
| 웹 프레임워크 | **FastAPI** | 0.115.5 | REST API 서버, 자동 Swagger 문서화 |
| DB | **MySQL** | 8.0 | 메인 데이터베이스 |
| ORM | **SQLAlchemy** | ≥ 2.0.40 | 비동기 DB 쿼리 |
| DB 드라이버 | **aiomysql** | 0.2.0 | 비동기 MySQL 연결 |
| 마이그레이션 | **Alembic** | 1.14.0 | DB 스키마 버전 관리 |
| 인증 | **python-jose** + **passlib** | - | JWT 발급/검증, bcrypt 비밀번호 해싱 |
| 스키마 검증 | **Pydantic v2** | ≥ 2.10.0 | 요청/응답 데이터 검증 |
| 푸시 알림 | **firebase-admin** | 6.6.0 | FCM 푸시 알림 |
| 컨테이너 | **Docker Compose** | - | 로컬 MySQL 환경 구성 |

---

## 2. 폴더 구조

```
backend/
├── .env                        ← 환경변수 (git 제외, .env.example 참고)
├── .env.example                ← 환경변수 템플릿
├── requirements.txt            ← Python 패키지 목록
├── Dockerfile                  ← 서버 컨테이너 빌드
├── docker-compose.yml          ← MySQL + 서버 통합 실행
├── alembic.ini                 ← Alembic 설정 (backend/ 루트에 위치)
├── seed_exercises.py           ← 운동 마스터 데이터 삽입 스크립트 (멱등)
│
├── alembic/
│   ├── env.py                  ← 비동기 마이그레이션 설정
│   └── versions/
│       ├── 4a5004ce120d_init.py              ← 전체 스키마 생성 (14 테이블)
│       ├── b1a2c3d4e5f6_add_onboarding_complete.py  ← is_onboarding_complete 컬럼 추가
│       └── c2b3d4e5f6a7_add_sleep_goal_to_users.py  ← sleep_goal_* 3개 컬럼 추가
│
└── app/
    ├── main.py                 ← FastAPI 앱 진입점, CORS 설정, 라우터 등록
    ├── dependencies.py         ← JWT Bearer 인증 의존성 (get_current_user)
    │
    ├── core/
    │   ├── config.py           ← 환경변수 → Settings 객체 (pydantic-settings)
    │   ├── database.py         ← 비동기 엔진/세션, get_db() 의존성
    │   ├── rate_limit.py       ← slowapi Limiter 공유 인스턴스
    │   └── security.py         ← 비밀번호 해싱, JWT 발급/검증 함수
    │
    ├── models/                 ← DB 테이블 정의 (SQLAlchemy ORM)
    │   ├── user.py             ← users (sleep_goal 필드 포함), user_inbody
    │   ├── workout.py          ← exercises, workout_plans, workout_plan_exercises,
    │   │                          workout_sessions, workout_sets
    │   ├── sleep.py            ← sleep_records
    │   ├── badge.py            ← badges, user_badges
    │   ├── community.py        ← friendships, pokes
    │   └── notification.py     ← push_tokens, notification_settings
    │
    ├── schemas/                ← Pydantic 요청/응답 스키마 (모델과 1:1 대응)
    │   ├── user.py             ← UserResponse에 sleep_goal 필드 포함
    │   ├── workout.py
    │   ├── sleep.py
    │   ├── badge.py
    │   ├── community.py
    │   └── notification.py
    │
    ├── routers/                ← 엔드포인트 핸들러 (도메인별로 분리)
    │   ├── auth.py             ← 회원가입, 로그인, 토큰 갱신 (rate limit 적용)
    │   ├── users.py            ← 프로필, 온보딩, 수면목표, 인바디
    │   ├── workouts.py         ← 운동 종목, 루틴 계획, 세션 기록
    │   ├── sleep.py            ← 수면 기록 (단건/벌크 동기화/통계)
    │   ├── badges.py           ← 뱃지 목록, 내 뱃지, 장착
    │   ├── community.py        ← 친구 요청/수락, 콕찌르기
    │   └── notifications.py    ← FCM 토큰 등록/해제, 알림 설정, 알림 발송
    │
    └── services/               ← 비즈니스 로직 (라우터에서 분리)
        ├── fcm_service.py      ← FCM 푸시 알림 전송 (단건/멀티캐스트)
        ├── badge_service.py    ← 뱃지 자동 지급 로직
        ├── gemini_service.py   ← Gemini AI 메시지 생성 (운동 전/후, 수면 분석)
        └── weather_service.py  ← OpenWeather 현재 날씨 조회 (1시간 캐싱)
```

---

## 3. 환경 설정

`.env.example`을 복사해서 `.env`를 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

| 변수명 | 예시값 | 설명 |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL 호스트 |
| `DB_PORT` | `3306` | MySQL 포트 |
| `DB_USER` | `persona_fit_user` | DB 유저 |
| `DB_PASSWORD` | `fit1234` | DB 비밀번호 |
| `DB_NAME` | `persona_fit` | DB 이름 |
| `SECRET_KEY` | `your-secret-key-32chars` | JWT 서명 키 (32자 이상 권장) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | 액세스 토큰 유효시간 (분) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | 리프레시 토큰 유효시간 (일) |
| `FIREBASE_CREDENTIALS_PATH` | `firebase-credentials.json` | FCM 인증 파일 경로 |
| `FIREBASE_PROJECT_ID` | `your-project-id` | Firebase 프로젝트 ID |
| `GEMINI_API_KEY` | *(선택)* | AI 코칭용 Gemini API 키 |
| `OPENWEATHER_API_KEY` | *(선택)* | 날씨 연동용 키 |

> **FCM 없이도 서버 실행 가능** — `firebase-credentials.json`이 없으면 자동으로 dev 모드로 동작하며, 알림 전송 대신 로그만 출력합니다.

---

## 4. 로컬 실행 방법

### 4-1. MySQL 실행 (Docker)

```bash
cd backend
docker-compose up -d
```

### 4-2. Python 가상환경 + 패키지 설치

```bash
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4-3. DB 마이그레이션

```bash
# backend/ 폴더 안에서 실행
alembic upgrade head
```

### 4-4. 초기 데이터 삽입 (운동 종목 23개, 뱃지 9개)

```bash
python seed_exercises.py
```

### 4-5. 서버 실행

```bash
uvicorn app.main:app --reload --port 8000
```

서버 실행 후 **http://localhost:8000/docs** 에서 Swagger UI로 모든 API를 테스트할 수 있습니다.

---

## 5. DB 스키마

총 **14개 테이블**, 2개의 마이그레이션 파일로 관리됩니다.

### 유저 도메인

#### `users` — 계정 + 프로필 + 캐릭터

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | INT PK | 유저 ID |
| `email` | VARCHAR(255) UNIQUE | 로그인 이메일 |
| `password_hash` | VARCHAR(255) | bcrypt 해시된 비밀번호 |
| `nickname` | VARCHAR(50) | 닉네임 |
| `age` | INT | 나이 |
| `gender` | ENUM | `male` / `female` / `other` |
| `height_cm` | FLOAT | 키 (cm) |
| `weight_kg` | FLOAT | 체중 (kg) |
| `fitness_level` | ENUM | `beginner` / `intermediate` / `advanced` / `athlete` |
| `goal` | VARCHAR(100) | 목표 (체중감량, 근육증가 등 자유 입력) |
| `character_emoji` | VARCHAR(10) | 캐릭터 이모지 (기본값: 🐣) |
| `character_level` | INT | 캐릭터 레벨 (기본값: 1) |
| `character_xp` | INT | 누적 XP (기본값: 0) |
| `is_onboarding_complete` | BOOL | 온보딩 완료 여부 |
| `is_active` | BOOL | 계정 활성 여부 |
| `created_at` / `updated_at` | DATETIME | 생성/수정 시각 |

#### `user_inbody` — 체성분 이력 (인바디)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | INT FK | users.id |
| `weight_kg` | FLOAT | 체중 |
| `body_fat_percent` | FLOAT | 체지방률 |
| `muscle_mass_kg` | FLOAT | 골격근량 |
| `body_water_percent` | FLOAT | 체수분율 |
| `bmi` | FLOAT | BMI |
| `visceral_fat_level` | INT | 내장지방 레벨 |
| `measured_at` | DATETIME | 측정 일시 |

> 날짜별 스냅샷으로 저장 → 시간에 따른 체성분 추이 확인 가능

---

### 운동 도메인

#### `exercises` — 운동 종목 마스터 (23종 제공)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `name` | VARCHAR(100) | 운동명 (한국어) |
| `name_en` | VARCHAR(100) | 운동명 (영어) |
| `muscle_group` | ENUM | `CHEST` / `BACK` / `SHOULDERS` / `BICEPS` / `TRICEPS` / `CORE` / `GLUTES` / `QUADS` / `HAMSTRINGS` / `CALVES` / `FULL_BODY` |
| `category` | ENUM | `WEIGHT` / `CARDIO` / `STRETCHING` / `BODYWEIGHT` |
| `emoji` | VARCHAR(10) | 운동 이모지 |

#### `workout_plans` — 요일별 루틴 계획

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | INT FK | 플랜 소유 유저 |
| `day_of_week` | SMALLINT | 0=월 ~ 6=일 |
| `name` | VARCHAR(100) | 플랜 이름 (예: "가슴·어깨 데이") |
| `is_rest_day` | BOOL | 휴식일 여부 |

#### `workout_plan_exercises` — 루틴에 포함된 종목

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `plan_id` | INT FK | workout_plans.id |
| `exercise_id` | INT FK | exercises.id |
| `order` | SMALLINT | 운동 순서 |
| `target_sets` | SMALLINT | 목표 세트 수 |
| `target_reps` | SMALLINT | 목표 반복 수 |
| `target_weight_kg` | FLOAT | 목표 무게 |

#### `workout_sessions` — 실제 운동 세션 기록

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | INT FK | 세션 수행 유저 |
| `plan_id` | INT FK (nullable) | 참조한 루틴 (자유 운동이면 null) |
| `status` | ENUM | `IN_PROGRESS` / `COMPLETED` / `CANCELLED` |
| `started_at` / `ended_at` | DATETIME | 시작/종료 시각 |
| `total_volume_kg` | FLOAT | 총 볼륨 (무게 × 반복 합산) |
| `xp_earned` | INT | 이번 세션에서 획득한 XP |

#### `workout_sets` — 세션 내 세트별 기록

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `session_id` | INT FK | workout_sessions.id |
| `exercise_id` | INT FK | exercises.id |
| `set_number` | SMALLINT | 세트 번호 |
| `reps` | SMALLINT | 실제 반복 수 |
| `weight_kg` | FLOAT | 실제 무게 |
| `is_completed` | BOOL | 세트 완료 여부 |

---

### 수면 도메인

#### `sleep_records`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | INT FK | 수면 기록 유저 |
| `sleep_start` / `sleep_end` | DATETIME | 취침/기상 시각 |
| `duration_minutes` | INT | 총 수면 시간 (분) |
| `quality` | ENUM | `VERY_BAD` / `BAD` / `NORMAL` / `GOOD` / `VERY_GOOD` |
| `deep_sleep_minutes` | INT | 깊은 수면 (분) |
| `rem_sleep_minutes` | INT | REM 수면 (분) |
| `light_sleep_minutes` | INT | 얕은 수면 (분) |
| `hrv_ms` | FLOAT | 심박 변이도 (ms) |
| `source` | SMALLINT | `1`=수동 / `2`=Apple Health / `3`=Galaxy Health |

---

### 게임화 도메인

#### `badges` — 뱃지 마스터 (9개 제공)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `name` | VARCHAR(100) | 뱃지 이름 |
| `emoji` | VARCHAR(10) | 뱃지 이모지 |
| `category` | ENUM | `WORKOUT` / `SLEEP` / `STREAK` / `SOCIAL` / `SPECIAL` |
| `condition_type` | ENUM | 달성 조건 종류 |
| `condition_value` | INT | 달성 조건 값 (예: 운동 10회) |
| `xp_reward` | INT | 뱃지 획득 시 XP 보상 |

#### `user_badges` — 유저가 획득한 뱃지

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` / `badge_id` | INT FK | 유저 + 뱃지 |
| `is_equipped` | BOOL | 프로필에 장착 여부 |
| `earned_at` | DATETIME | 획득 일시 |

---

### 커뮤니티 도메인

#### `friendships` — 친구 관계

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `requester_id` / `addressee_id` | INT FK | 요청자 / 수신자 |
| `status` | ENUM | `PENDING` / `ACCEPTED` / `BLOCKED` |

#### `pokes` — 콕찌르기

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `sender_id` / `receiver_id` | INT FK | 발신자 / 수신자 |
| `message` | VARCHAR(200) | 메시지 (선택) |

---

### 알림 도메인

#### `push_tokens` — FCM 디바이스 토큰

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | INT FK | 토큰 소유 유저 |
| `token` | VARCHAR(512) UNIQUE | FCM 디바이스 토큰 |
| `platform` | ENUM | `IOS` / `ANDROID` |
| `is_active` | BOOL | 활성 여부 |

#### `notification_settings` — 유저별 알림 설정

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | INT FK UNIQUE | 유저당 1행 |
| `workout_reminder` | BOOL | 운동 알림 켜기/끄기 |
| `workout_reminder_time` | VARCHAR(5) | 알림 시각 (예: "08:00") |
| `sleep_reminder` | BOOL | 수면 알림 |
| `friend_poke` | BOOL | 콕찌르기 알림 |
| `achievement` | BOOL | 뱃지 달성 알림 |
| `ai_coaching` | BOOL | AI 코칭 알림 |

---

## 6. API 엔드포인트 전체 목록

모든 엔드포인트 prefix: `/api/v1`  
🔒 = JWT Bearer 토큰 필요

### Auth

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/auth/register` | 회원가입 → 토큰 + 유저 정보 반환 |
| POST | `/auth/login` | 로그인 → 토큰 + 유저 정보 반환 |
| POST | `/auth/refresh` | 리프레시 토큰으로 액세스 토큰 갱신 |

### Users

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | 🔒 `/users/me/onboard` | 온보딩 — 신체정보 + 캐릭터 선택, XP 100 지급 |
| GET | 🔒 `/users/me` | 내 프로필 조회 |
| PATCH | 🔒 `/users/me` | 내 프로필 수정 (닉네임, 키, 체중 등) |
| POST | 🔒 `/users/me/inbody` | 체성분 기록 추가 |
| GET | 🔒 `/users/me/inbody` | 체성분 이력 조회 (최신순) |
| GET | 🔒 `/users/{user_id}` | 특정 유저 공개 프로필 조회 |

### Workouts

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | 🔒 `/workouts/exercises` | 운동 종목 목록 (`?muscle_group=CHEST` 필터 가능) |
| GET | 🔒 `/workouts/plans` | 내 요일별 루틴 계획 전체 조회 |
| POST | 🔒 `/workouts/plans` | 루틴 계획 생성 |
| PATCH | 🔒 `/workouts/plans/{plan_id}` | 루틴 계획 수정 |
| DELETE | 🔒 `/workouts/plans/{plan_id}` | 루틴 계획 삭제 |
| POST | 🔒 `/workouts/sessions/start` | 운동 세션 시작 |
| POST | 🔒 `/workouts/sessions/{session_id}/complete` | 운동 세션 완료 → XP 자동 계산 |
| GET | 🔒 `/workouts/sessions` | 내 운동 기록 목록 |
| GET | 🔒 `/workouts/sessions/{session_id}` | 특정 세션 상세 조회 |

### Sleep

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | 🔒 `/sleep` | 수면 기록 추가 |
| GET | 🔒 `/sleep` | 수면 기록 목록 조회 |
| GET | 🔒 `/sleep/stats` | 수면 통계 (평균 시간, 품질 분포) |
| DELETE | 🔒 `/sleep/{record_id}` | 수면 기록 삭제 |

### Badges

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | 🔒 `/badges` | 전체 뱃지 목록 |
| GET | 🔒 `/badges/me` | 내가 획득한 뱃지 목록 |
| POST | 🔒 `/badges/me/equip` | 뱃지 장착/해제 |

### Community

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | 🔒 `/community/friends/request` | 친구 요청 보내기 |
| POST | 🔒 `/community/friends/{friendship_id}/accept` | 친구 요청 수락 |
| GET | 🔒 `/community/friends` | 내 친구 목록 |
| DELETE | 🔒 `/community/friends/{friendship_id}` | 친구 삭제 |
| POST | 🔒 `/community/pokes` | 콕찌르기 보내기 |
| GET | 🔒 `/community/pokes/received` | 받은 콕찌르기 목록 |

### Notifications

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | 🔒 `/notifications/token` | FCM 디바이스 토큰 등록 |
| DELETE | 🔒 `/notifications/token/{token}` | FCM 토큰 비활성화 |
| GET | 🔒 `/notifications/settings` | 알림 설정 조회 |
| PATCH | 🔒 `/notifications/settings` | 알림 설정 변경 |
| POST | 🔒 `/notifications/send/workout-reminder` | 운동 알림 즉시 발송 |

**총 35개 엔드포인트**

---

## 7. 인증 방식

JWT Bearer Token 방식을 사용합니다.

```
Authorization: Bearer <access_token>
```

### 토큰 종류

| 종류 | 유효기간 | 용도 |
|---|---|---|
| Access Token | 60분 | API 요청 시 매번 헤더에 포함 |
| Refresh Token | 30일 | Access Token 만료 시 갱신 (`POST /auth/refresh`) |

### 토큰 발급 흐름

```
POST /auth/register  또는  POST /auth/login
→ { access_token, refresh_token, token_type: "bearer", user: { ... } }
```

응답의 `user` 객체에 `is_onboarding_complete` 필드가 포함되어 있어, **FE에서 로그인 직후 온보딩 화면으로 분기**할 수 있습니다.

---

## 8. 핵심 플로우

### 가입 → 온보딩 → 캐릭터 지급

```
1. POST /auth/register
   Body: { email, password, nickname }
   → 토큰 + user (is_onboarding_complete: false) 반환

2. POST /users/me/onboard   (Authorization 필요)
   Body: {
     age, gender, height_cm, weight_kg,
     fitness_level, goal,
     character_emoji  ← 여기서 캐릭터 선택
   }
   → character_xp: 100 (웰컴 보너스), is_onboarding_complete: true
   → FCM 웰컴 알림 자동 발송 (토큰이 등록된 경우)

3. 이후 로그인 시
   POST /auth/login
   → user.is_onboarding_complete: true  ← 메인 화면으로 바로 진입
```

### 운동 세션 흐름

```
1. POST /workouts/sessions/start
   → session_id 반환, status: "IN_PROGRESS"

2. (운동하면서 세트 기록은 complete 요청 시 함께 전송)

3. POST /workouts/sessions/{session_id}/complete
   Body: { sets: [ { exercise_id, set_number, reps, weight_kg, is_completed } ] }
   → XP 자동 계산: 50 + (완료 세트 수 × 10)
   → character_xp 누적, character_level 자동 갱신 (500 XP 당 1레벨)
   → 뱃지 자동 지급 체크 (badge_service)
```

---

## 9. 게임화 시스템 (XP · 레벨 · 뱃지)

### XP 획득 방법

| 이벤트 | 획득 XP |
|---|---|
| 온보딩 완료 (최초 1회) | +100 |
| 운동 세션 완료 | +50 + (완료 세트 수 × 10) |
| 뱃지 획득 | 뱃지별 상이 (30 ~ 200 XP) |

### 캐릭터 레벨 계산

```
character_level = 1 + character_xp // 500
```

예: XP 1,200 → 레벨 3

### 기본 제공 뱃지 (9개)

| 뱃지 | 조건 | XP |
|---|---|---|
| 🏋️ 첫 운동 | 운동 세션 1회 | 50 |
| 💪 운동 중독자 | 운동 세션 10회 | 100 |
| 🔥 운동 마스터 | 운동 세션 50회 | 200 |
| 🏅 볼륨 킹 | 총 볼륨 10,000 kg | 150 |
| 😴 수면 관리자 | 수면 기록 7일 | 50 |
| 🌙 수면 마스터 | 수면 기록 30일 | 100 |
| 🤝 첫 친구 | 친구 1명 | 30 |
| 👥 소셜 버터플라이 | 친구 5명 | 80 |
| 👉 콕찌르기 왕 | 콕찌르기 10회 발송 | 50 |

---

## 10. 푸시 알림 (FCM)

Firebase Cloud Messaging을 사용합니다.

### React Native 연동

```javascript
// 앱 로그인 후 FCM 토큰 획득 → 서버에 등록
const token = await messaging().getToken();
await api.post('/notifications/token', {
  token,
  platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
});
```

### 자동 발송 타이밍

| 이벤트 | 알림 내용 |
|---|---|
| 온보딩 완료 | "🎉 캐릭터가 탄생했어요! XP 100 지급" |
| 운동 알림 설정 시 | "💪 운동할 시간이에요!" |

### dev 모드 동작

`firebase-credentials.json`이 없으면 실제 알림 대신 서버 콘솔에 로그를 출력합니다. **로컬 개발 중 Firebase 세팅 없이도 서버가 정상 실행됩니다.**

---

*최종 수정: 2026-05-18 | 작성: BE팀장 김다은*
