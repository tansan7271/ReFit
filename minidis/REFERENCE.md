# minidis 작업 참조 문서

## 실행 방법
빌드 없음. 프로젝트 루트의 `prototype/index.html` 또는 `prototype/preview.html`을 브라우저에서 바로 열면 됨.  
TypeScript 타입 체크: `frontend/` 의존성이 설치된 상태(`npm install`)에서 `minidis/` 루트 위치의 tsc 실행.

---

## 파일 구조

```
minidis/
├── src/
│   ├── index.ts            ← 배럴 export (모듈 진입점)
│   ├── types.ts            ← 타입 + resolveCharacterState/EnergyLevel/GrowthLevel
│   ├── pixelEngine.ts      ← buildFrame, STATE_CONFIGS, PALETTES, ENERGY_BODY
│   ├── pixelHelpers.ts     ← 픽셀 유틸 (oval, hline, pxSet, drawZ)
│   ├── accessories.ts      ← 액세서리 렌더 함수
│   ├── effects.ts          ← 이펙트 렌더 함수
│   ├── usePixelCharacter.ts← 훅 (usePixelCharacter, useCharacterFromData)
│   └── PixelCharacter.tsx  ← 컴포넌트 (PixelGrid, PixelCharacter, PixelCharacterFromData)
└── docs/
    ├── api-spec.md         ← 백엔드 API 명세 (백엔드 개발자용)
    └── frontend-module.md  ← 프론트엔드 모듈 API 문서
```

> `prototype/index.html`, `prototype/preview.html` — 브라우저 인터랙티브 데모.  
> `pixelEngine.ts`를 수정하면 두 HTML 파일의 인라인 JS도 동일하게 수정해야 함.

---

## 그리드 스펙

- **크기:** 100×100 셀, 10,000픽셀
- **화면별 셀 크기:** `CELL_SIZE.watch = 2` (200px), `CELL_SIZE.phone = 3` (300px), `CELL_SIZE.large = 4` (400px)
- **워치페이스:** 255×255px 원형, 배경 `#0e0e12`
- **픽셀 배경:** `null` (투명) — 캐릭터가 없는 셀은 배경이 그대로 보임
- **HTML 렌더링:** `span` 태그 color 속성으로 `■` 문자 색칠
- **RN 렌더링:** `View` 컴포넌트, `backgroundColor` prop
- **중심:** `cx = 49.5 + dx`, `cy = 49.5 + dy` (애니메이션 오프셋 적용 전)

---

## 캐릭터 형태 — dittoBlob()

```ts
function dittoBlob(
  g: PixelFrame,
  cx: number, cy: number,
  color: string, shadow: string, hiColor: string,
  cfg: BlobConfig,   // 파트별 좌표·크기 설정
  sc: number,        // 성장 레벨 스케일 (1.0 = 레벨 5)
): void
```

`BlobConfig` 구조 (BLOB_NORMAL 기준값, 각 항목은 `[dx, dy, rx, ry]` 또는 `[rx, ry]`):

| 파트 | 필드 | 기준 좌표 (sc=1) | 크기 (rx, ry) |
|------|------|-----------------|---------------|
| 메인 몸통 | `body` | (cx, cy) | 23, 17 |
| 왼쪽 범프 | `bumpL` | (cx-9, cy-19) | 10, 8 |
| 오른쪽 범프 | `bumpR` | (cx+7, cy-21) | 8, 7 |
| 왼쪽 손 | `handL` | (cx-26, cy+4) | 6, 5 |
| 오른쪽 손 | `handR` | (cx+25, cy+3) | 5, 5 |
| 왼쪽 발 | `footL` | (cx-10, cy+18) | 9, 8 |
| 오른쪽 발 | `footR` | (cx+9, cy+17) | 8, 7 |
| 그림자 임계 | `shdAt` | cy + 11 이하 행 | — |
| 하이라이트 | `hi` | (cx-7, cy-6) | 9, 6 |

**체형 변형:** `BLOB_THIN` (sedentary), `BLOB_CHUBBY` (overfed), `WORKOUT_BLOB[part]` (6종 운동 부위)

---

## 얼굴 좌표

성장 레벨(1~5)에 따라 `FACE_LV` 설정으로 결정됨. 레벨 5(최대) 기준값:

```ts
const fc = FACE_LV[gl]; // gl: GrowthLevel
const er  = Math.round(cy + fc.eyeDy);   // 레벨5: cy + 3
const elc = Math.round(cx + fc.eyeLDx);  // 레벨5: cx - 6
const erc = Math.round(cx + fc.eyeRDx);  // 레벨5: cx + 5
const mr  = Math.round(cy + fc.mouthDy); // 레벨5: cy + 8
const mc  = Math.round(cx);
```

| 레벨 | eyeDy | eyeLDx | eyeRDx | mouthDy | xs |
|:----:|:-----:|:------:|:------:|:-------:|:--:|
| 1 | 2 | -3 | 3 | 4 | 0.55 |
| 2 | 2 | -4 | 4 | 5 | 0.68 |
| 3 | 2 | -5 | 4 | 7 | 0.82 |
| 4 | 3 | -6 | 5 | 7 | 0.91 |
| 5 | 3 | -6 | 5 | 8 | 1.00 |

---

## 레이어 순서 (buildFrame 내부)

```
L1  배경 이펙트    aura (몸통보다 먼저 — 오라가 캐릭터 뒤에 깔림)
L2  몸통           dittoBlob() — 체형 + 에너지 레벨 색상
L3  몸통 액세서리  wristband, dumbbells, medal, water_bottle, running_shoes
L4  얼굴           눈 + 입 (상태별 표정)
L5  머리 액세서리  headband, crown, sunglasses, earphones
L6  상태 FX        ZZZ, 운동 잔상, 반짝임, 땀방울, 먹구름
L7  전경 이펙트    fire, sparkles, moon_stars, rain_cloud, speed_lines, recovery_glow, heart_beat
```

---

## 몸 색상 — ENERGY_BODY

몸 색상(body/hi/shd)은 상태가 아닌 **에너지 레벨**로 결정됨.  
에너지 = `(stats.sleep + stats.routine) / 2`, 레벨 = `Math.min(6, Math.floor(score * 7 / 100))`.

| energy_level | body | hi | shd | 의미 |
|:---:|---|---|---|---|
| 0 | `#f0f5ff` | `#f8faff` | `#b0c8e0` | 거의 흰색 (에너지 없음) |
| 1 | `#c0dcf4` | `#e0efff` | `#7aaace` | 옅은 하늘 |
| 2 | `#88b8ec` | `#b8d8ff` | `#4478b8` | 하늘색 |
| 3 | `#c4b4ec` | `#ddd0ff` | `#8868cc` | 옅은 보라 **(기본)** |
| 4 | `#f4a888` | `#ffd0b4` | `#c86040` | 살몬/분홍 |
| 5 | `#f07848` | `#ffaa80` | `#c04820` | 주황/붉은 |
| 6 | `#f8cc40` | `#fff080` | `#c89000` | 골드/노랑 (최고) |

---

## 눈·입·이펙트 색상 — PALETTES

`PALETTES[state]`는 body/hi/shd를 제외한 eye/mouth/부가색만 담당.  
buildFrame 내에서 `{ ...PALETTES[state], ...ENERGY_BODY[el] }` 로 병합됨.

| state | eye | mouth | 추가 |
|-------|-----|-------|------|
| neutral | `#18102e` | `#18102e` | — |
| happy | `#18102e` | `#ee2244` | glow `#ffee99` |
| tired | `#18102e` | `#18102e` | circ `#7890a8` (다크서클) |
| sleeping | `#18102e` | `#18102e` | zzz `#9090cc` |
| workout | `#18102e` | `#18102e` | trail `#ff4020`, sweat `#88ccff` |
| flex | `#18102e` | `#ee2244` | arm `#d4a000`, shine `#ffffff`, medal `#f8d040` |
| sedentary | `#18102e` | `#18102e` | sweat `#88ccff` |
| overfed | `#18102e` | `#18102e` | — |
| derailed | `#18102e` | `#18102e` | cloud `#5070a0`, rain `#88aacc` |

---

## 9가지 상태

| state | fps | 프레임 수 | 트리거 | 특징 |
|-------|:---:|:--------:|--------|------|
| neutral | 2 | 2 | 기본값 | 위아래 bob (dy: 0→-3) |
| happy | 4 | 3 | 평균 ≥ 75 | 점프 (dy: 0→-3→-6), 큰 웃음, 반짝임 |
| tired | 2 | 2 | sleep < 40 | 아래 bob (dy: 0→+3), 다크서클, 처진 눈썹 |
| sleeping | 2 | 3 | is_sleeping | ZZZ 애니메이션, 선 눈 |
| workout | 8 | 4 | workout=active | 빠른 점프+이동, 잔상, 땀방울, 집중 표정 |
| flex | 2 | 2 | workout=completed | 양팔 들기, 메달, 반짝임 |
| sedentary | 2 | 2 | exercise < 40 | 아래 bob (dy: 0→+2), 처진 눈, 땀방울 |
| overfed | 2 | 2 | diet < 40 | 좌우 흔들 (dx: 0→+1), 통통한 체형 |
| derailed | 3 | 3 | routine < 40 | 찡그린 입, 먹구름+빗방울 |

---

## 성장 레벨별 몸 스케일

| GrowthLevel | sc |
|:-----------:|:--:|
| 1 | 0.55 |
| 2 | 0.70 |
| 3 | 0.82 |
| 4 | 0.91 |
| 5 | 1.00 |

---

## 액세서리 함수 목록

| 액세서리 | 함수 | Y 앵커 (sc=1) | 비고 |
|---------|------|--------------|------|
| headband | `drawHeadband(g, cx, cy, sc)` | `cy - 18` | 상단 범프 가로지르는 밴드 |
| crown | `drawCrown(g, cx, cy, sc)` | `cy - 27` | 캐릭터 최상단 |
| sunglasses | `drawSunglasses(g, cx, cy, sc, er)` | `er` (눈 행) | 눈 위치에 정렬 |
| wristband | `drawWristband(g, cx, cy, sc)` | `cy + 4` | 몸통 양옆 손목 |
| medal | `drawMedalItem(g, cx, cy, sc)` | `cy + 19` | 몸통 중앙 하부 |
| dumbbells | `drawDumbbells(g, cx, cy, sc)` | `cy - 2` | 양 손 바깥 |
| water_bottle | `drawWaterBottle(g, cx, cy, sc)` | `cy + 3` | 오른손에 들고 있는 물통 |
| running_shoes | `drawRunningShoes(g, cx, cy, sc)` | `cy + 22~23` | 발바닥 아래 컬러 솔 |
| earphones | `drawEarphones(g, cx, cy, sc)` | `cy - 16` | 머리 양옆 이어버드 |

---

## 이펙트 함수 목록

| 이펙트 | 함수 | 위치 | 레이어 |
|--------|------|------|--------|
| aura | `drawAuraEffect(g, cx, cy, color, fi)` | 캐릭터 주변 r=30+fi 원 | L1 (몸통 뒤) |
| fire | `drawFireEffect(g, cx, cy, sc, fi)` | `cy + 25*sc` (발 아래) | L7 |
| sparkles | `drawSparklesEffect(g, cx, cy, sc, fi)` | 5개 고정 위치, 교대 점멸 | L7 |
| moon_stars | `drawMoonStarsEffect(g, cx, cy, sc)` | `cx+22*sc, cy-25*sc` 초승달 + 별 3개 | L7 |
| rain_cloud | `drawRainCloudEffect(g, cx, cy, sc, fi)` | `cx+14*sc, cy-32*sc` 구름 + 빗방울 | L7 |
| speed_lines | `drawSpeedLinesEffect(g, cx, cy, sc, fi)` | 왼쪽 4줄 모션 라인 | L7 |
| recovery_glow | `drawRecoveryGlowEffect(g, cx, cy, fi)` | 캐릭터 주변 이중 오라 | L7 |
| heart_beat | `drawHeartBeatEffect(g, cx, cy, sc, fi)` | 3개 위치 교대 하트 | L7 |

---

## buildFrame 시그니처

```ts
// TypeScript (pixelEngine.ts)
buildFrame(state: CharacterState, frameIndex: number, options: RenderOptions = {}): PixelFrame

// JavaScript (prototype/index.html, prototype/preview.html)
buildFrame(state, fi, accessories=[], effect=null, energyLevel=3, growthLevel=5, workoutPart=null)
```

---

## 땀방울 위치 (몸통 바깥, sc=1 기준)

```ts
// workout 땀방울 (오른쪽 바깥)
pxSet(g, er - 3, cx + 24, sweat);
pxSet(g, er - 1, cx + 24, sweat);
pxSet(g, er - 1, cx + 25, sweat);

// sedentary 땀방울 (오른쪽 눈 바깥)
pxSet(g, er,     erc + 18, sweat);  // erc = cx + 5, 즉 cx + 23
pxSet(g, er + 2, erc + 18, sweat);
pxSet(g, er + 2, erc + 17, sweat);
```
