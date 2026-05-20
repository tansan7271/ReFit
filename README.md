# ReFit

> **운동 중 기록은 많은 앱이 해줘. ReFit은 운동 전에 어떻게 준비하고, 운동 후에 어떻게 회복할지를 AI가 알려줘.**

운동 전후 관리에 집중한 AI 피트니스 가이드 앱. 수면·날씨 데이터를 자동으로 수집하고, Gemini AI가 오늘 컨디션에 맞는 준비 및 회복 방법을 푸시 알림으로 알려줍니다.

---

## 주요 기능

- **아침 스마트 알림** — 수면 데이터 + 날씨를 조합해 오늘의 운동 준비 메시지 생성
- **운동 후 회복 가이드** — 세션 완료 시 AI 기반 스트레칭·수분·영양 추천
- **캐릭터 시스템** — 운동·수면 습관에 따라 캐릭터 상태가 변화
- **헬스 데이터 자동 연동** — Apple HealthKit (iOS) / Health Connect (Android)
- **비경쟁** — 랭킹 없음, 나의 성장만 추적

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React Native + Expo (EAS Build) |
| **Navigation** | expo-router (파일 기반) |
| **상태 관리** | Zustand |
| **Backend** | FastAPI + MySQL + SQLAlchemy (async) |
| **마이그레이션** | Alembic |
| **AI** | Google Gemini API |
| **푸시 알림** | Firebase Cloud Messaging (FCM) |
| **날씨** | OpenWeather API |
| **헬스 데이터 (iOS)** | react-native-health (HealthKit) |
| **헬스 데이터 (Android)** | react-native-health-connect |
| **인프라** | Docker Compose + Cloudflare Tunnel |

---

## 빠른 시작

전체 세팅 가이드는 **[docs/setup_guide.md](docs/setup_guide.md)** 를 참고하세요.

### 필수 도구

- Docker Desktop
- Node.js 22.x LTS
- Python **3.12.x** (3.13 이상 불가)
- Xcode (iOS 시뮬레이터, macOS 전용) / Android Studio (Android 에뮬레이터)

### 백엔드

```bash
cd backend
cp .env.example .env        # .env 실제 값 채우기 (도균에게 받기)
python3.12 -m venv venv
source venv/bin/activate    # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt

docker compose up -d db
DB_HOST=localhost python -m alembic upgrade head
uvicorn app.main:app --reload
```

API 문서: http://localhost:8000/docs (개발 환경에서만 접근 가능)

### 프론트엔드

```bash
cd frontend
npm install
npm start
# i → iOS 시뮬레이터 / a → Android 에뮬레이터 / w → 웹
```

---

## 프로젝트 구조

```
├── backend/
│   ├── app/
│   │   ├── core/        # 설정, DB, 보안, rate limiting
│   │   ├── models/      # SQLAlchemy ORM 모델
│   │   ├── routers/     # FastAPI 라우터
│   │   ├── schemas/     # Pydantic 스키마
│   │   └── services/    # FCM, Gemini, OpenWeather 서비스
│   ├── alembic/         # DB 마이그레이션
│   └── docker-compose.yml
├── frontend/
│   ├── app/             # expo-router 화면 (auth / onboarding / main)
│   ├── components/ui/   # 공통 UI 컴포넌트
│   ├── services/        # API 클라이언트, 헬스 데이터, 토큰 스토리지
│   ├── store/           # Zustand 스토어
│   ├── constants/       # 디자인 토큰 (색상, 타이포, 라벨)
│   └── types/           # TypeScript 타입 정의
└── docs/
    ├── product_spec.md  # 제품 기획서
    ├── dev_status.md    # 개발 현황 추적
    └── setup_guide.md   # 환경 세팅 가이드
```

---

## 팀

| 이름 | 역할 |
|------|------|
| 도균 | 풀스택 — 아키텍처, AI·헬스 연동 |
| 수빈 | 프론트엔드 — 화면 구현 |
| 다은 | 백엔드 — API, DB |
| 지민 | 디자인 — Figma, 캐릭터 에셋 |

---

## 문서

- [제품 기획서](docs/product_spec.md) — 앱 정의, MVP 스코프, 화면 목록
- [개발 현황](docs/dev_status.md) — 구현 상태, 다음 작업 목록
- [세팅 가이드](docs/setup_guide.md) — 로컬 환경 구성 + 보안 가이드
