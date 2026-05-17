# Persona Fit — Backend (FastAPI + MySQL)

## 구조

```
backend/
├── app/
│   ├── main.py                  # FastAPI 앱 진입점
│   ├── dependencies.py          # JWT 인증 의존성
│   ├── core/
│   │   ├── config.py            # 환경변수 설정 (pydantic-settings)
│   │   ├── database.py          # 비동기 SQLAlchemy 엔진/세션
│   │   └── security.py          # 비밀번호 해시, JWT 발급/검증
│   ├── models/                  # SQLAlchemy ORM 모델 (DB 스키마)
│   │   ├── user.py              # users, user_inbody
│   │   ├── workout.py           # exercises, workout_plans, sessions, sets
│   │   ├── sleep.py             # sleep_records
│   │   ├── badge.py             # badges, user_badges
│   │   ├── community.py         # friendships, pokes
│   │   └── notification.py      # push_tokens, notification_settings
│   ├── schemas/                 # Pydantic 요청/응답 스키마
│   ├── routers/                 # API 라우터 (엔드포인트 정의)
│   └── services/
│       ├── fcm_service.py       # FCM 푸시 알림 발송
│       └── badge_service.py     # 뱃지 자동 지급 로직
├── alembic/                     # DB 마이그레이션
├── seed_exercises.py            # 운동 종목/뱃지 초기 데이터
├── requirements.txt
└── .env.example
```

## 빠른 시작

```bash
# 1. 가상환경 생성 및 패키지 설치
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에서 DB 정보 / SECRET_KEY / Firebase 설정

# 3. MySQL 데이터베이스 생성
# mysql -u root -p
# CREATE DATABASE persona_fit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 4. 마이그레이션 실행
alembic upgrade head

# 5. 초기 데이터 시드
python seed_exercises.py

# 6. 서버 실행
uvicorn app.main:app --reload --port 8000
```

## API 문서

서버 실행 후 → http://localhost:8000/docs (Swagger UI)

## DB 스키마 요약

| 테이블 | 설명 |
|--------|------|
| `users` | 유저 계정, 신체정보, 캐릭터 상태 |
| `user_inbody` | 체성분 측정 이력 (인바디) |
| `exercises` | 운동 종목 마스터 |
| `workout_plans` | 요일별 루틴 계획 |
| `workout_plan_exercises` | 루틴 내 운동 항목 |
| `workout_sessions` | 실제 운동 세션 기록 |
| `workout_sets` | 세트별 수행 데이터 |
| `sleep_records` | 일별 수면 기록 |
| `badges` | 뱃지 마스터 |
| `user_badges` | 유저 획득 뱃지 |
| `friendships` | 친구 관계 |
| `pokes` | 콕 찌르기 (운동 독려) |
| `push_tokens` | FCM 디바이스 토큰 |
| `notification_settings` | 유저 알림 수신 설정 |

## API 엔드포인트 목록

### Auth
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/auth/register` | 회원가입 |
| POST | `/api/v1/auth/login` | 로그인 |
| POST | `/api/v1/auth/refresh` | 토큰 갱신 |

### Users
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/users/me` | 내 프로필 조회 |
| PATCH | `/api/v1/users/me` | 내 프로필 수정 |
| POST | `/api/v1/users/me/inbody` | 체성분 기록 추가 |
| GET | `/api/v1/users/me/inbody` | 체성분 이력 조회 |
| GET | `/api/v1/users/{user_id}` | 다른 유저 프로필 조회 |

### Workouts
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/workouts/exercises` | 운동 종목 목록 |
| GET | `/api/v1/workouts/plans` | 내 주간 루틴 조회 |
| POST | `/api/v1/workouts/plans` | 루틴 생성 |
| PATCH | `/api/v1/workouts/plans/{id}` | 루틴 수정 |
| DELETE | `/api/v1/workouts/plans/{id}` | 루틴 삭제 |
| POST | `/api/v1/workouts/sessions/start` | 운동 세션 시작 |
| POST | `/api/v1/workouts/sessions/{id}/complete` | 운동 세션 완료 |
| GET | `/api/v1/workouts/sessions` | 운동 세션 목록 |
| GET | `/api/v1/workouts/sessions/{id}` | 운동 세션 상세 |

### Sleep
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/sleep` | 수면 기록 추가 |
| GET | `/api/v1/sleep` | 수면 이력 조회 |
| GET | `/api/v1/sleep/stats` | 수면 통계 |
| DELETE | `/api/v1/sleep/{id}` | 수면 기록 삭제 |

### Badges
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/badges` | 전체 뱃지 목록 |
| GET | `/api/v1/badges/me` | 내 획득 뱃지 |
| POST | `/api/v1/badges/me/equip` | 뱃지 장착 |

### Community
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/community/friends/request` | 친구 요청 |
| POST | `/api/v1/community/friends/{id}/accept` | 친구 수락 |
| GET | `/api/v1/community/friends` | 친구 목록 |
| DELETE | `/api/v1/community/friends/{id}` | 친구 삭제 |
| POST | `/api/v1/community/pokes` | 콕 찌르기 |
| GET | `/api/v1/community/pokes/received` | 받은 콕 찌르기 |

### Notifications
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/notifications/token` | FCM 토큰 등록 |
| DELETE | `/api/v1/notifications/token/{token}` | FCM 토큰 해제 |
| GET | `/api/v1/notifications/settings` | 알림 설정 조회 |
| PATCH | `/api/v1/notifications/settings` | 알림 설정 변경 |

## 푸시 알림 서비스: FCM (Firebase Cloud Messaging)

React Native 앱에서는 `@react-native-firebase/messaging` 또는 `expo-notifications`로 연동합니다.
