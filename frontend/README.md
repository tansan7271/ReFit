# ReFit Frontend

운동 전·후 AI 케어 피트니스 앱 — React Native + Expo (SDK 52, expo-router).

## 빠른 시작

```bash
cd frontend
npm install
cp .env.example .env      # 환경변수 파일 생성
npx expo start
```

Metro 번들러가 뜨면 터미널에서:

- `i` — iOS 시뮬레이터 실행
- `a` — Android 에뮬레이터 실행
- `w` — 웹 브라우저 실행

> Expo Go 앱으로 빠르게 보려면 `npx expo start --go` 후 QR 코드를 스캔한다.
> 단, 아래 "헬스 연동" 항목을 반드시 확인할 것.

## 환경변수

`.env.example` 을 복사해 `.env` 를 만든다. `EXPO_PUBLIC_` 접두사가 붙은
변수만 클라이언트 번들에 노출된다 (expo-router 규약).

| 변수                  | 설명                  | 기본값                  |
| --------------------- | --------------------- | ----------------------- |
| `EXPO_PUBLIC_API_URL` | 백엔드 API base URL   | `http://localhost:8000` |

EAS 빌드 시에는 `.env` 대신 `eas.json` 의 빌드 프로필별 `env` 값이 적용된다.

## 헬스 연동 — Expo Go 불가, EAS Build 필요

`react-native-health` (iOS / HealthKit) 와 `react-native-health-connect`
(Android / Health Connect) 는 **네이티브 모듈**이라 Expo Go 에서 동작하지
않는다. `services/health.ts` 가 동적 import 로 Expo Go 크래시는 막아 두었지만,
실제 헬스 데이터를 읽으려면 development build 가 필요하다.

로컬에서 네이티브 빌드를 만들려면 (Xcode / Android Studio 필요):

```bash
npx expo run:ios        # iOS 네이티브 빌드 + 실행
npx expo run:android    # Android 네이티브 빌드 + 실행
```

또는 EAS 클라우드 빌드:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

> `eas build` 최초 실행 시 Expo 계정 로그인과 프로젝트 링크가 필요하다.
> `eas init` 이 `app.json` 에 `extra.eas.projectId` 를 자동으로 채워 준다.

## 앱 아이콘 / 스플래시 이미지

현재 `app.json` 에는 아이콘·스플래시 이미지 경로가 설정되어 있지 않다
(플레이스홀더 에셋이 없어 `expo start` 가 깨지지 않도록 제거함).
디자인 확정 후 `assets/` 디렉터리에 이미지를 추가하고 `app.json` 에 다시
연결한다:

```jsonc
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#f0f4ff"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#f0f4ff"
      }
    }
  }
}
```

권장 크기: `icon.png` 1024×1024, `adaptive-icon.png` 1024×1024.

## 스크립트

```bash
npm start          # = npx expo start
npm run ios        # iOS 시뮬레이터
npm run android    # Android 에뮬레이터
npm run web        # 웹
```

## 구조

```
app/                expo-router 파일 기반 라우팅
  _layout.tsx       루트 — 인증 상태 보고 그룹 분기
  index.tsx         스플래시 / 진입점
  (auth)/           로그인·회원가입
  (onboarding)/     온보딩 6단계 (최초 1회)
  (main)/           메인 탭 (홈/운동/기록/마이)
components/ui/      공통 UI 컴포넌트
constants/          디자인 토큰 (colors, typography, labels)
services/           api(axios) · health(플랫폼 분기)
store/              Zustand 스토어 (auth, onboarding)
types/              공통 도메인 타입
```

## EAS 빌드 프로필

| 프로필        | 용도                   | API URL                         |
| ------------- | ---------------------- | ------------------------------- |
| `development` | 개발 빌드 (dev client) | `http://localhost:8000`         |
| `preview`     | 내부 배포 테스트       | `https://staging-api.refit.app` |
| `production`  | 스토어 출시            | `https://api.refit.app`         |
