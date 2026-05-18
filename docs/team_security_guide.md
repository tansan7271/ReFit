# ReFit 팀 보안 행동 강령

> 이 문서를 한 번만 읽어두면 됩니다. 모르는 게 있으면 도균에게 물어보세요.

---

## 절대 하면 안 되는 것 (경고)

### ❌ `.env` 파일을 git에 커밋하지 않기

```bash
# 이 파일들은 절대 git에 올리면 안 됩니다
.env
firebase-credentials.json
```

`.gitignore`에 이미 등록되어 있지만, `git add .` 할 때 실수로 올라가는 경우가 있습니다.
**커밋 전에 `git status`로 꼭 확인하세요.**

### ❌ API 키나 비밀번호를 카카오톡·디스코드에 붙여넣지 않기

키 공유가 필요할 때는 **대면으로** 전달하거나, 임시로 만든 뒤 바로 교체하세요.

### ❌ 코드 안에 키 하드코딩하지 않기

```python
# ❌ 이렇게 하면 안 됩니다
GEMINI_API_KEY = "AIzaSy..."

# ✅ 이렇게 해야 합니다
GEMINI_API_KEY = settings.GEMINI_API_KEY  # .env에서 읽어옴
```

---

## 로컬 개발 환경 셋업

### 1. `.env` 파일 만들기

```bash
# backend 폴더에서
cp .env.example .env
# 그 다음 .env 파일을 열고 실제 값으로 채우기
```

`.env.example`은 키 이름만 있는 템플릿입니다. 실제 값은 도균에게 받으세요.

### 2. `SECRET_KEY` 생성 (JWT 서명용)

각자 로컬 개발용 키를 직접 생성하세요:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

출력된 값을 `.env`의 `SECRET_KEY=` 뒤에 붙여넣으세요.

### 3. 서버 배포용 `.env`는 도균이 관리

배포 서버(연구실 PC)의 `.env`는 도균이 직접 설정합니다. 팀원은 건드리지 않아도 됩니다.

---

## 커밋 전 체크리스트

```
□ git status에서 .env, firebase-credentials.json이 보이지 않는가?
□ 코드 안에 API 키, 비밀번호가 문자열로 적혀있지 않은가?
□ 새로운 API 키가 필요하면 .env.example에도 키 이름(값 제외)을 추가했는가?
```

---

## .env.example 관리 규칙

새로운 환경 변수가 생기면 **값은 비워두고 키 이름만** `.env.example`에 추가하고 커밋하세요.

```bash
# .env.example — ✅ 커밋 가능 (키 이름만, 값 없음)
NEW_API_KEY=your-key-here

# .env — ❌ 커밋 금지 (실제 값 있음)
NEW_API_KEY=sk-real-secret-value-123
```

---

## 만약 실수로 키를 커밋했다면

**당황하지 말고 즉시 도균에게 알리세요.** git 히스토리에서 지우고 키를 즉시 재발급합니다.
시간이 지날수록 더 복잡해집니다. 빠를수록 좋습니다.

---

## API 키 발급처 정리

| 키 | 발급처 | 담당자 |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio | 도균 |
| `OPENWEATHER_API_KEY` | openweathermap.org | 도균 |
| `FIREBASE_CREDENTIALS_PATH` | Firebase 콘솔 | 도균 |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare Zero Trust | 도균 |
| `SECRET_KEY` | 로컬 직접 생성 | **각자** |
| `DB_PASSWORD` | 도균에게 받기 | 도균 |
