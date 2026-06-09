# <img src="frontend/assets/icon.png" width="48" style="vertical-align: middle;"> ReFit

> 🇰🇷 [한국어 버전](README.ko.md)

An AI-powered fitness guide focused on pre- and post-workout care.
ReFit automatically collects sleep, weather, and health data, then delivers personalized Gemini AI messages to help you prepare and recover. Your character grows as your habits build — stay motivated with friends.

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Care Tips** | Gemini-powered personalized messages on wake-up, 30 min before workout, and after session completion |
| **Character System** | Pixel art character whose state reflects your workout, sleep, and diet habits — grows with XP and levels |
| **Workout Tracking** | Set routines, log sessions, track body parts, view weekly stats |
| **Sleep Tracking** | Manual entry + automatic sync via Apple HealthKit / Health Connect |
| **Diet Logging** | Daily meal input and calorie tracking |
| **Health Data Sync** | Steps, heart rate, and calories from Apple HealthKit (iOS) · Health Connect (Android) |
| **Community** | Add friends, poke each other, achieve co-op workout milestones |
| **Badge System** | Badges awarded automatically for workout count, streaks, total volume, and more |
| **Weather Recommendation** | Suggests indoor or outdoor workout based on current conditions |
| **Push Notifications** | FCM-based scheduled alerts (morning care / pre-workout / sleep reminder / inactivity) |

---

## Screen Structure

```
(auth)
├── Login
└── Register

(onboarding)
├── Physical Profile
├── Sleep Goal
├── Workout Routine
├── Health App Connection
└── Character Introduction

(main)
├── Home         — Character state, weather, today's care tip, health metrics
├── Workout      — Today's plan, session completion, workout history
├── Community    — Friend list, activity feed, poke
└── Profile      — InBody, sleep/routine settings, badges, character
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native · Expo · expo-router (file-based routing) |
| **State** | Zustand |
| **Secure Storage** | expo-secure-store |
| **Backend** | FastAPI · SQLAlchemy (async) · Alembic |
| **Database** | MySQL 8.0 |
| **AI** | Google Gemini API |
| **Push Notifications** | Expo Push API (routes to FCM / APNs) + APScheduler |
| **Weather** | OpenWeather API |
| **Health Data (iOS)** | react-native-health (HealthKit) |
| **Health Data (Android)** | react-native-health-connect |
| **Infrastructure** | Docker Compose (api · db · cloudflared) · Cloudflare Tunnel |
| **Timezone** | KST-unified throughout (`TZ=Asia/Seoul`, `datetime.now()`) |

---

## Quick Start

### Prerequisites

- Docker Desktop
- Node.js 22.x LTS
- Xcode (iOS) / Android Studio (Android)
- EAS CLI: `npm install -g eas-cli`

### Backend (Docker)

```bash
cd backend
cp .env.example .env        # Fill in real values
docker compose up -d --build
docker exec refit_api alembic upgrade head
docker exec refit_api python seed_badges.py
docker exec refit_api python seed_exercises.py
```

API docs: `http://localhost:8000/docs` (only when DEBUG=True)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # Set EXPO_PUBLIC_API_URL
npx expo start --clear
# i → iOS simulator / a → Android emulator
```

> **Using Cloudflare Tunnel**: The URL changes on every container restart.
> Run `docker logs refit_tunnel | grep trycloudflare` to get the new URL and update `.env.local`.

### Android Additional Setup

**Register Android SDK path** (once per machine)

```bash
# Create frontend/android/local.properties
echo "sdk.dir=$HOME/Library/Android/sdk" > frontend/android/local.properties
```

**Android push notifications** (once per project)

1. [Firebase Console](https://console.firebase.google.com) → Create project → Add Android app (package: `com.refit.app`)
2. Download `google-services.json` → place at `frontend/android/app/google-services.json`
3. Firebase Console → Project Settings → **Service Accounts** → Generate new private key (download JSON)
4. Register FCM service account with Expo:
   ```bash
   cd frontend
   eas login
   eas credentials   # Android → Google Service Account → enter JSON file path
   ```

> `google-services.json` and the service account key are gitignored for security — each developer must obtain them directly.

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── core/        # Config, DB, security, rate limiting
│   │   ├── models/      # SQLAlchemy ORM models
│   │   ├── routers/     # FastAPI routers (auth, users, workouts, sleep, health, character, badges, community, notifications)
│   │   ├── schemas/     # Pydantic schemas
│   │   └── services/    # FCM, Gemini, OpenWeather, scheduler, badge, character
│   ├── alembic/         # DB migrations
│   └── docker-compose.yml
├── frontend/
│   ├── app/             # expo-router screens (auth / onboarding / main)
│   ├── components/      # Shared UI components
│   ├── services/        # API client, health data, care cache, storage
│   ├── store/           # Zustand stores
│   ├── constants/       # Design tokens (colors, typography)
│   └── types/           # TypeScript type definitions
└── docs/
    ├── product_spec.md  # Product specification
    └── setup_guide.md   # Environment setup guide
```

---

## Team

| Name | Role |
|------|------|
| Dogyun | Full-stack — Architecture, screen implementation, AI & health integration |
| Subin | Frontend — Character art and component implementation |
| Daeun | Backend — API, DB |
| Jimin | Design — Figma, graphic assets |
