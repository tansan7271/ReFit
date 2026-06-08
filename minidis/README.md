# minidis — 픽셀 캐릭터 디스플레이 모듈

ReFit(mocum) 앱의 워치 + 앱 동시 표시용 다마고치 스타일 픽셀 캐릭터.  
`prototype/` 브라우저 프리뷰 + `src/` React Native 모듈로 구성.

---

## 개요

- **컨셉**: 메타몽(Ditto) — 상태·에너지·체형이 모두 바뀌는 픽셀 캐릭터
- **렌더링**: 100×100 픽셀 그리드 (10,000 픽셀), 각 셀은 `View` (2~4px)
- **상태 전환**: opacity fade 150ms out → 프레임 교체 → 150ms in
- **애니메이션**: `setInterval` 기반, 상태별 2~8 fps
- **외부 의존성**: React Native (Animated)

---

## 캐릭터 상태 9종

| 상태 | fps | 트리거 | 특징 |
|------|-----|--------|------|
| `neutral` | 2 | 기본값 | 위아래 bob |
| `happy` | 4 | 평균 점수 ≥ 75 | 바운스 + 눈 반짝 |
| `tired` | 2 | sleep < 40 | 처진 눈 + 다크서클 |
| `sleeping` | 2 | is_sleeping = true | 눈 감음 + ZZZ |
| `workout` | 8 | workout_status = active | 빠른 모션 + 운동 체형 |
| `flex` | 2 | workout_status = completed | 팔 들고 근육 뽐내기 |
| `sedentary` | 2 | exercise < 40 | 홀쭉한 체형 |
| `overfed` | 2 | diet < 40 | 통통한 체형 |
| `derailed` | 3 | routine < 40 | 먹구름 + 빗방울 |

## 에너지 레벨 7단계 (몸 색상)

수면 + 루틴 점수 평균으로 결정. 상태(모션)와 독립적으로 동작.

| 레벨 | 색상 |
|:----:|------|
| 0 | 거의 흰색 |
| 1 | 옅은 하늘 |
| 2 | 하늘색 |
| 3 | 옅은 보라 (기본) |
| 4 | 살몬/분홍 |
| 5 | 주황/붉은 |
| 6 | 골드/노랑 |

---

## 파일 구조

```
minidis/
├── src/
│   ├── index.ts            ← 배럴 export (모듈 진입점)
│   ├── types.ts            ← 타입 정의 + 상태 결정 로직
│   ├── pixelEngine.ts      ← buildFrame, PALETTES, ENERGY_BODY
│   ├── pixelHelpers.ts     ← oval, hline, pxSet, 그리드 상수
│   ├── accessories.ts      ← 액세서리 렌더 함수
│   ├── effects.ts          ← 이펙트 렌더 함수
│   ├── usePixelCharacter.ts← 애니메이션 훅 (usePixelCharacter, useCharacterFromData)
│   └── PixelCharacter.tsx  ← 컴포넌트 (PixelGrid, PixelCharacter, PixelCharacterFromData)
└── docs/
    ├── api-spec.md         ← 백엔드 API 명세 (백엔드 개발자용)
    └── frontend-module.md  ← 프론트엔드 모듈 API 문서
```

---

## 빠른 시작

### 프리뷰

프로젝트 루트의 `prototype/index.html` 또는 `prototype/preview.html`을 브라우저에서 열면 인터랙티브 데모가 실행됨.

### mocum 통합

```tsx
import {
  PixelCharacterFromData,
  useCharacterFromData,
  PixelGrid,
  CELL_SIZE,
} from '@/components/PixelCharacter';

// 패턴 A — 백엔드 데이터 직결 (가장 간단)
const { data } = useQuery(GET_CHARACTER);
<PixelCharacterFromData data={data} cellSize={CELL_SIZE.phone} />

// 패턴 B — 여러 화면 동기화 (훅 1개 → 여러 PixelGrid)
const ctrl = useCharacterFromData(data, { accessories: ['headband'] });
<PixelGrid {...ctrl} cellSize={CELL_SIZE.watch} />   // 워치
<PixelGrid {...ctrl} cellSize={CELL_SIZE.phone} />   // 폰
```

### 화면별 권장 셀 크기

```ts
CELL_SIZE.watch = 2   // → 200×200px
CELL_SIZE.card  = 2   // → 200×200px
CELL_SIZE.phone = 3   // → 300×300px
CELL_SIZE.large = 4   // → 400×400px
```

---

## 통합 가이드 문서

- **백엔드 API 명세** (`GET /character` 응답 구조, 필드 정의): [docs/api-spec.md](./docs/api-spec.md)
- **프론트엔드 모듈 API** (컴포넌트·훅·타입 레퍼런스): [docs/frontend-module.md](./docs/frontend-module.md)
