# ReFit

> 🇺🇸 [English version](README.md)

운동 전후 관리에 집중한 AI 피트니스 가이드 앱.
수면·날씨·헬스 데이터를 자동으로 수집하고, Gemini AI가 오늘 컨디션에 맞는 준비·회복 메시지를 알려줍니다.
운동 습관이 쌓일수록 캐릭터가 성장하고, 친구와 함께 동기를 유지합니다.

---

## 주요 기능

| 기능                 | 설명                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| **AI 케어팁**        | 아침 기상 직후 / 운동 30분 전 / 운동 완료 시 Gemini 기반 개인화 메시지   |
| **캐릭터 시스템**    | 운동·수면·식단 습관에 따라 상태가 변하는 픽셀 아트 캐릭터, XP·레벨 성장  |
| **운동 기록**        | 루틴 설정, 세션 기록, 부위별 운동 완료, 주간 통계                        |
| **수면 추적**        | 수동 입력 + Apple HealthKit / Health Connect 자동 동기화                 |
| **식단 기록**        | 일별 식단 입력 및 칼로리 추적                                            |
| **헬스 데이터 연동** | Apple HealthKit (iOS) · Health Connect (Android) 걸음수·심박수·칼로리    |
| **커뮤니티**         | 친구 추가, 콕 찌르기, 협동 운동 달성                                     |
| **뱃지 시스템**      | 운동 횟수·스트릭·볼륨 등 조건 달성 시 뱃지 자동 지급                     |
| **날씨 추천**        | 현재 날씨 기반 야외 운동 가능 여부 안내                                  |
| **푸시 알림**        | FCM 기반 스케줄 알림 (아침 케어 / 운동 전 / 수면 리마인더 / 비활동 알림) |

---

## 화면 구조

```
(auth)
├── 로그인
└── 회원가입

(onboarding)
├── 신체 정보 입력
├── 수면 목표 설정
├── 운동 루틴 설정
├── 헬스 앱 연동
└── 캐릭터 소개

(main)
├── 홈          — 캐릭터 상태, 날씨, 오늘의 케어팁, 헬스 지표
├── 운동        — 오늘의 플랜, 세션 완료, 운동 기록
├── 커뮤니티    — 친구 목록, 피드, 콕 찌르기
└── 프로필      — 인바디, 수면·루틴 설정, 뱃지, 캐릭터
```

---

## 기술 스택

| 영역                      | 기술                                                        |
| ------------------------- | ----------------------------------------------------------- |
| **Frontend**              | React Native · Expo · expo-router (파일 기반 라우팅)        |
| **상태 관리**             | Zustand                                                     |
| **보안 저장소**           | expo-secure-store                                           |
| **Backend**               | FastAPI · SQLAlchemy (async) · Alembic                      |
| **DB**                    | MySQL 8.0                                                   |
| **AI**                    | Google Gemini API                                           |
| **푸시 알림**             | Firebase Cloud Messaging (FCM) + APScheduler                |
| **날씨**                  | OpenWeather API                                             |
| **헬스 데이터 (iOS)**     | react-native-health (HealthKit)                             |
| **헬스 데이터 (Android)** | react-native-health-connect                                 |
| **인프라**                | Docker Compose (api · db · cloudflared) · Cloudflare Tunnel |
| **타임존**                | 전체 KST 통일 (`TZ=Asia/Seoul`, `datetime.now()` 기준)      |

---

## 빠른 시작

### 필수 도구

- Docker Desktop
- Node.js 22.x LTS
- Xcode (iOS) / Android Studio (Android)

### 백엔드 (Docker)

```bash
cd backend
cp .env.example .env        # 실제 값 채우기
docker compose up -d --build
docker exec refit_api alembic upgrade head
docker exec refit_api python seed_badges.py
docker exec refit_api python seed_exercises.py
```

API 문서: `http://localhost:8000/docs` (DEBUG=True 환경에서만)

### 프론트엔드

```bash
cd frontend
npm install
cp .env.example .env.local  # EXPO_PUBLIC_API_URL 설정
npx expo start --clear
# i → iOS 시뮬레이터 / a → Android 에뮬레이터
```

> **Cloudflare Tunnel 사용 시**: 컨테이너 재시작마다 URL이 변경됩니다.
> `docker logs refit_tunnel | grep trycloudflare` 로 새 URL 확인 후 `.env.local` 업데이트.

---

## 프로젝트 구조

```
├── backend/
│   ├── app/
│   │   ├── core/        # 설정, DB, 보안, rate limiting
│   │   ├── models/      # SQLAlchemy ORM 모델
│   │   ├── routers/     # FastAPI 라우터 (auth, users, workouts, sleep, health, character, badges, community, notifications)
│   │   ├── schemas/     # Pydantic 스키마
│   │   └── services/    # FCM, Gemini, OpenWeather, 스케줄러, 뱃지, 캐릭터
│   ├── alembic/         # DB 마이그레이션
│   └── docker-compose.yml
├── frontend/
│   ├── app/             # expo-router 화면 (auth / onboarding / main)
│   ├── components/      # 공통 UI 컴포넌트
│   ├── services/        # API 클라이언트, 헬스 데이터, 케어 캐시, 스토리지
│   ├── store/           # Zustand 스토어
│   ├── constants/       # 디자인 토큰 (색상, 타이포)
│   └── types/           # TypeScript 타입 정의
└── docs/
    ├── product_spec.md  # 제품 기획서
    └── setup_guide.md   # 환경 세팅 가이드
```

---

## 팀

| 이름 | 역할                                       |
| ---- | ------------------------------------------ |
| 도균 | 풀스택 — 아키텍처, 화면 구현, AI·헬스 연동 |
| 수빈 | 프론트엔드 — 캐릭터 아트 및 컴포넌트 구현  |
| 다은 | 백엔드 — API, DB                           |
| 지민 | 디자인 — Figma, 그래픽 에셋                |
