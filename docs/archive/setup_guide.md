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

| 도구           | 버전                        | 설치                                           |
| -------------- | --------------------------- | ---------------------------------------------- |
| Git            | 최신                        | https://git-scm.com                            |
| Docker Desktop | 최신                        | https://www.docker.com/products/docker-desktop |
| Node.js        | **22.x LTS** (v24 사용 불가) | nvm 으로 설치 (아래 참고)                      |
| Python         | **3.12.x** (3.13+ 불가)     | https://www.python.org/downloads               |

> **Node 버전 주의:** `@expo/cli` 내부 `tar` 모듈 호환 문제로 Node 24 이상에서 `expo prebuild` 가 실패합니다.  
> **반드시 nvm 으로 Node 22 를 사용하세요.**

```bash
# nvm 설치 (없으면)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc  # 또는 ~/.bashrc

# Node 22 LTS 설치 및 활성화
nvm install 22
nvm use 22
node -v  # v22.x.x 이어야 합니다
```

> **Python 버전 주의:** `greenlet` 등 일부 패키지가 3.13 이상 미지원.  
> `python --version` 으로 반드시 확인하세요.

### macOS 추가

```bash
# Homebrew 설치 (없으면)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Xcode Command Line Tools
xcode-select --install

# watchman (Expo Metro bundler 파일 감시)
brew install watchman

# JDK 17 — Android 빌드에 필요 (이미 설치됐으면 건너뜀)
brew install --cask zulu@17
```

- **Xcode:** App Store에서 설치 (iOS 시뮬레이터 실행 시 필요, Xcode 16+ 지원)
- **Android Studio:** https://developer.android.com/studio 설치 후 SDK Manager 에서 Android SDK 설치

#### macOS Android 환경변수 설정

`~/.zshrc` (또는 `~/.bashrc`) 맨 아래에 추가:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

저장 후 적용:

```bash
source ~/.zshrc
```

### Windows 추가

- **JDK 17:** https://www.azul.com/downloads/?package=jdk 에서 Zulu JDK 17 설치
- **Android Studio** 설치 후 SDK Manager 에서 Android SDK 설치
- 시스템 환경변수에 `ANDROID_HOME` 추가 (예: `C:\Users\<이름>\AppData\Local\Android\Sdk`)
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

### ⚠️ Expo Go 사용 불가

이 앱은 `react-native-health`, `lottie-react-native` 등 **네이티브 모듈을 사용**하기 때문에
**Expo Go 앱으로는 실행되지 않습니다.** 반드시 아래의 Dev Client 빌드 방식을 사용하세요.

| 방법                   | 용도                     | 비고                            |
| ---------------------- | ------------------------ | ------------------------------- |
| **iOS 시뮬레이터**     | iOS 전체 기능 테스트     | macOS + Xcode 필요, 최초 빌드 필요 |
| **Android 에뮬레이터** | Android 전체 기능 테스트 | Android Studio + JDK 17 필요    |
| **웹 브라우저**        | 레이아웃 확인용          | 네이티브 기능 불가              |

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

> **Node 버전 확인 필수:** 터미널을 새로 열 때마다 `nvm use 22` 를 먼저 실행하세요.

#### iOS

**최초 실행 (팀원 모두 처음 한 번만):**

```bash
cd frontend
nvm use 22
npx expo prebuild --platform ios   # 네이티브 iOS 프로젝트 생성
cd ios && pod install               # CocoaPods 의존성 설치 (5~10분 소요)
cd ..
npx expo run:ios                   # Xcode 빌드 + 시뮬레이터 실행 (10~20분 소요)
```

> `pod install` 시 Podfile의 `post_install` 훅이 자동으로 fmt 헤더를 패치합니다.  
> Xcode 26 (macOS Tahoe) 환경에서 발생하는 컴파일 오류를 방지하기 위한 처리입니다.

**이후 일상 개발 (빠른 리프레시):**

```bash
cd frontend
nvm use 22
npx expo start
# Metro Bundler 실행 후 → i 키 입력 (iOS 시뮬레이터)
```

> 새로운 네이티브 모듈(npm 패키지)을 추가했을 때만 `pod install` + `npx expo run:ios` 를 다시 실행하면 됩니다.

#### Android

**최초 환경 설정 (macOS, 한 번만):**

```bash
# JDK 17 설치
brew install --cask zulu@17

# ANDROID_HOME 환경변수 — ~/.zshrc 에 추가 (위의 1. 사전 준비 참고)
source ~/.zshrc
```

Android Studio 에서:
1. **Virtual Device Manager** 열기
2. **Create Device** → Phone → Pixel 7 → Android API 35 이미지 선택
3. 에뮬레이터 시작

**최초 실행:**

```bash
cd frontend
nvm use 22
npx expo run:android   # Gradle 빌드 + 에뮬레이터 설치 (10~20분 소요)
```

**이후 일상 개발:**

```bash
cd frontend
nvm use 22
npx expo start
# Metro Bundler 실행 후 → a 키 입력 (Android 에뮬레이터)
```

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

**Q. `npx expo start` 후 "No development build (com.refit.app)" 에러**
→ Expo Go 로는 이 앱을 실행할 수 없습니다. `npx expo run:ios` 또는 `npx expo run:android` 로 Dev Client 빌드를 먼저 진행하세요. (5. 개발 서버 실행 참고)

**Q. `npx expo prebuild` 실패: "Cannot read properties of undefined (reading 'extract')"**
→ Node 버전 문제입니다. `nvm use 22` 로 Node 22 를 활성화한 후 재시도하세요.  
→ nvm 이 없으면 설치: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`

**Q. iOS 빌드 에러: `fmt/base.h` consteval 관련 컴파일 오류**
→ Xcode 26 (macOS Tahoe) + React Native 0.76 의 알려진 호환성 문제입니다.  
→ 프로젝트 `ios/Podfile` 에 자동 패치 훅이 포함되어 있으므로, `cd ios && pod install` 을 실행하면 자동으로 해결됩니다.  
→ `pod install` 을 이미 했는데도 에러가 나면 `Pods/` 폴더를 삭제하고 `pod install` 을 다시 실행하세요.

**Q. `npx expo run:android` 에서 "Unable to locate a Java Runtime" 에러**
→ JDK 17 이 설치되어 있지 않습니다. `brew install --cask zulu@17` 으로 설치 후 터미널을 재시작하세요.

**Q. `npx expo run:android` 에서 "SDK location not found" 에러**
→ `ANDROID_HOME` 환경변수가 설정되지 않았습니다.  
→ `~/.zshrc` 에 아래를 추가하고 `source ~/.zshrc` 를 실행하세요:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

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
