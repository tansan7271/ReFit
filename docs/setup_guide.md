# ReFit — 개발 환경 세팅 가이드

> 이 문서 한 번만 따라하면 로컬에서 프론트 + 백엔드 모두 실행할 수 있습니다.

---

## 목차

1. [사전 준비](#1-사전-준비)
2. [저장소 클론](#2-저장소-클론)
3. [백엔드 세팅](#3-백엔드-세팅)
4. [프론트엔드 세팅](#4-프론트엔드-세팅)
5. [개발 서버 실행](#5-개발-서버-실행)
6. [보안 가이드](#6-보안-가이드)
7. [자주 묻는 질문](#7-자주-묻는-질문)

---

## 1. 사전 준비

### 공통 (macOS + Windows)

| 도구           | 버전                    | 설치                                           |
| -------------- | ----------------------- | ---------------------------------------------- |
| Git            | 최신                    | https://git-scm.com                            |
| Docker Desktop | 최신                    | https://www.docker.com/products/docker-desktop |
| Node.js        | 22.x LTS                | https://nodejs.org                             |
| Python         | **3.12.x** (3.13+ 불가) | https://www.python.org/downloads               |

> **Python 버전 주의:** `greenlet` 등 일부 패키지가 3.13 이상 미지원.
> `python --version` 으로 반드시 확인하세요.

### macOS 추가

```bash
# Homebrew 설치 (없으면)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Xcode Command Line Tools (iOS 시뮬레이터용)
xcode-select --install

# watchman (Expo Metro bundler 파일 감시)
brew install watchman
```

- **Xcode:** App Store에서 설치 (iOS 시뮬레이터 실행 시 필요)
- **Android Studio:** https://developer.android.com/studio (Android 에뮬레이터 실행 시 필요)

### Windows 추가

- **Android Studio** 설치 후 `ANDROID_HOME` 환경변수 설정
- PowerShell 또는 WSL2 사용 권장
- `python` 명령이 없으면 `py -3.12` 로 대체

---

## 2. 저장소 클론

```bash
git clone https://github.com/<org>/Mocum_pokopia_Refit.git
cd Mocum_pokopia_Refit
```

---

## 3. 백엔드 세팅

```bash
cd backend
```

### 3-1. `.env` 파일 생성

```bash
cp .env.example .env
```

`.env` 파일을 열고 실제 값을 채워주세요. **API 키와 비밀번호는 레포에 탑재 금지.**

```bash
# SECRET_KEY는 각자 생성
python -c "import secrets; print(secrets.token_hex(32))"
# 출력값을 .env의 SECRET_KEY= 에 붙여넣기
```

### 3-2. Python 가상환경 생성

**macOS**

```bash
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Windows (PowerShell)**

```powershell
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> 활성화 후 터미널 앞에 `(venv)` 가 붙어야 정상입니다.

### 3-3. Docker로 MySQL 실행

```bash
docker compose up -d db
```

MySQL이 `healthy` 상태가 될 때까지 기다립니다 (약 15-30초):

```bash
docker compose ps
# STATUS 열에 (healthy) 가 표시되면 OK
```

### 3-4. DB 마이그레이션 실행

```bash
DB_HOST=localhost python -m alembic upgrade head
```

**Windows (PowerShell)**

```powershell
$env:DB_HOST="localhost"; python -m alembic upgrade head
```

> `Running upgrade ... -> ...` 메시지가 뜨면 성공입니다.

---

## 4. 프론트엔드 세팅

```bash
cd frontend
npm install
```

> 경고(warning) 메시지는 무시해도 됩니다. 에러(error)만 처리하면 됩니다.

### Expo Go vs 시뮬레이터

| 방법                   | 용도                     | 제약                          |
| ---------------------- | ------------------------ | ----------------------------- |
| **Expo Go 앱**         | 빠른 UI 확인             | HealthKit/Health Connect 불가 |
| **iOS 시뮬레이터**     | iOS 전체 기능 테스트     | macOS + Xcode 필요            |
| **Android 에뮬레이터** | Android 전체 기능 테스트 | Android Studio 필요           |
| **웹 브라우저**        | 레이아웃 확인용          | 네이티브 기능 불가            |

> 헬스 데이터 연동 기능은 반드시 시뮬레이터/에뮬레이터 또는 실기기에서 테스트해야 합니다.

---

## 5. 개발 서버 실행

### 백엔드

터미널 1 — MySQL (Docker):

```bash
cd backend
docker compose up -d db
```

터미널 2 — FastAPI:

```bash
cd backend
source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 프론트엔드

터미널 3:

```bash
cd frontend
npm start
```

Metro Bundler가 뜨면:

- `i` → iOS 시뮬레이터
- `a` → Android 에뮬레이터
- `w` → 웹 브라우저
- QR 코드 스캔 → Expo Go 앱

---

## 6. 보안 가이드

### 절대 하면 안 되는 것

#### `.env` 파일을 git에 커밋하지 않기

```bash
# 이 파일들은 절대 git에 올리면 안 됩니다
.env
firebase-credentials.json
```

`.gitignore`에 이미 등록되어 있지만, 커밋 전 `git status`로 반드시 확인하세요.

#### API 키나 비밀번호를 카카오톡·디스코드에 붙여넣지 않기

키 공유가 필요할 때는 **대면으로** 전달하거나, 임시 키를 발급 후 즉시 교체하세요.

#### 코드 안에 키 하드코딩하지 않기

```python
# ❌ 이렇게 하면 안 됩니다
GEMINI_API_KEY = "AIzaSy..."

# ✅ 이렇게 해야 합니다
GEMINI_API_KEY = settings.GEMINI_API_KEY  # .env에서 읽어옴
```

---

### 커밋 전 체크리스트

```
□ git status에서 .env, firebase-credentials.json이 보이지 않는가?
□ 코드 안에 API 키, 비밀번호가 문자열로 적혀있지 않은가?
□ 새로운 환경변수를 추가했다면 .env.example에도 키 이름(값 제외)을 추가했는가?
□ 새로운 DB 컬럼/테이블을 추가했다면 alembic migration을 생성해 커밋했는가?
```

---

### `.env.example` 관리 규칙

새로운 환경변수가 생기면 **값은 비워두고 키 이름만** `.env.example`에 추가하고 커밋하세요.

```bash
# .env.example — ✅ 커밋 가능 (키 이름만, 값 없음)
NEW_API_KEY=your-key-here

# .env — ❌ 커밋 금지 (실제 값 있음)
NEW_API_KEY=sk-real-secret-value-123
```

---

### API 키 발급처 정리

| 키                          | 발급처                | 담당자   |
| --------------------------- | --------------------- | -------- |
| `GEMINI_API_KEY`            | Google AI Studio      | 도균     |
| `OPENWEATHER_API_KEY`       | openweathermap.org    | 도균     |
| `FIREBASE_CREDENTIALS_PATH` | Firebase 콘솔         | 도균     |
| `CLOUDFLARE_TUNNEL_TOKEN`   | Cloudflare Zero Trust | 도균     |
| `SECRET_KEY`                | 로컬 직접 생성        | **각자** |
| `DB_PASSWORD`               | 도균에게 받기         | 도균     |

---

### 실수로 키를 커밋했다면

**당황하지 말고 즉시 팀원에게 알리세요.**
git 히스토리에서 지우고 키를 즉시 재발급합니다.
시간이 지날수록 더 복잡해집니다. 빠를수록 좋습니다.

---

## 7. 자주 묻는 질문

**Q. `alembic upgrade head` 에서 `Can't connect to MySQL server` 오류**
→ Docker MySQL이 `healthy` 상태인지 확인 후 재시도.
→ `DB_HOST=localhost python -m alembic upgrade head` 형태로 실행.

**Q. `npm install` 후 expo 실행이 안 됨**
→ `npx expo start --clear` 로 캐시 초기화 후 재시도.

**Q. iOS 시뮬레이터가 안 열림**
→ Xcode를 한 번 직접 실행해 라이선스 동의 후 재시도.
→ `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

**Q. Python 버전이 맞는데도 `greenlet` 설치 실패**
→ `pip install --upgrade pip` 후 재시도.

**Q. `python` 명령이 없음 (macOS)**
→ `python3.12` 또는 `python3` 으로 실행.
→ `alias python=python3.12` 를 `~/.zshrc` 에 추가하면 편리함.
