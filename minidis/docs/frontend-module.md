# PixelCharacter 프론트엔드 모듈 명세

> **대상**: 프론트엔드 개발자  
> **목적**: 픽셀 캐릭터 컴포넌트·훅·유틸의 공개 API 정의  
> **최종 수정**: 2026-06-08  
> **백엔드 API 문서**: [api-spec.md](./api-spec.md)

---

## 개요

`src/index.ts` 배럴 export를 통해 모든 public API에 접근합니다.  
mocum 통합 시 `frontend/components/PixelCharacter/` 디렉터리로 이동 예정.

```ts
import {
  PixelCharacterFromData,
  useCharacterFromData,
  PixelGrid,
  CELL_SIZE,
} from '@/components/PixelCharacter';
```

---

## 사용 패턴

### 패턴 A — 백엔드 데이터 직결 (권장, 가장 간단)

```tsx
const { data } = useQuery(GET_CHARACTER); // SWR / React Query

<PixelCharacterFromData
  data={data}
  cellSize={CELL_SIZE.phone}
  accessories={['headband']}
  effect="heart_beat"
/>
```

- `data`가 없으면 `neutral` 상태 유지
- `data`가 바뀌면 자동 fade 전환
- 상태·에너지·성장 레벨 전부 자동 계산

---

### 패턴 B — 여러 화면 동기화 (워치 + 폰 동시)

```tsx
// 훅 1개 → 여러 PixelGrid에 동일 프레임 공유
// 애니메이션 루프도 1개만 실행됨
const ctrl = useCharacterFromData(data, { accessories: ['headband'] });

// 워치 화면
<PixelGrid {...ctrl} cellSize={CELL_SIZE.watch} />

// 폰 홈 화면
<PixelGrid {...ctrl} cellSize={CELL_SIZE.phone} />

// 앱 내 카드 위젯
<PixelGrid {...ctrl} cellSize={CELL_SIZE.card} />
```

---

### 패턴 C — 상태 직접 제어

```tsx
<PixelCharacter
  state="workout"
  options={{ energyLevel: 5, accessories: ['dumbbells'], effect: 'speed_lines' }}
  cellSize={CELL_SIZE.phone}
/>
```

---

## 컴포넌트

### `<PixelGrid>`

훅·내부 상태 없는 순수 렌더러. 패턴 B의 다중 화면 공유에 사용.

| prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `frameData` | `PixelFrame` | 필수 | 10000개 픽셀 색상 배열 |
| `opacity` | `Animated.Value` | 필수 | 화면 전환 opacity |
| `currentState` | `CharacterState` | 필수 | 현재 상태 (렌더에 미사용, spread 편의용) |
| `cellSize` | `number` | `3` | 픽셀 1개 크기(px). `CELL_SIZE` 상수 활용 권장 |

---

### `<PixelCharacter>`

독립형 — 내부적으로 애니메이션 루프를 실행. 화면 1개에 단독 배치 시 사용.

| prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `state` | `CharacterState` | `'neutral'` | 캐릭터 상태 |
| `options` | `RenderOptions` | `{}` | 렌더 옵션 (아래 표 참고) |
| `cellSize` | `number` | `CELL_SIZE.phone` | 픽셀 1개 크기(px) |
| `fadeMs` | `number` | `150` | 상태 전환 fade 시간(ms) |

---

### `<PixelCharacterFromData>`

백엔드 데이터 직결 — 상태·에너지·성장 레벨 자동 계산.

| prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `data` | `CharacterData \| null` | `null` | 백엔드 API 응답 |
| `cellSize` | `number` | `CELL_SIZE.phone` | 픽셀 1개 크기(px) |
| `fadeMs` | `number` | `150` | 상태 전환 fade 시간(ms) |
| `accessories` | `AccessoryType[]` | `[]` | 장착할 액세서리 목록 |
| `effect` | `EffectType` | — | 활성화할 이펙트 |

---

## 훅

### `usePixelCharacter`

상태를 직접 제어할 때 사용.

```ts
const { frameData, opacity, setState, currentState } =
  usePixelCharacter(initialState, options, fadeMs);
```

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `initialState` | `CharacterState` | `'neutral'` | 초기 상태 |
| `options` | `RenderOptions` | `{}` | 렌더 옵션. 매 렌더마다 최신값 자동 반영 |
| `fadeMs` | `number` | `150` | fade 시간(ms) |

| 반환 | 타입 | 설명 |
|------|------|------|
| `frameData` | `PixelFrame` | 현재 프레임 |
| `opacity` | `Animated.Value` | 화면 전환 opacity |
| `setState` | `(next: CharacterState) => void` | 상태 전환 함수 (fade 처리 포함) |
| `currentState` | `CharacterState` | 현재 상태 |

---

### `useCharacterFromData`

백엔드 데이터를 받아 자동 계산. 다중 화면 동기화의 핵심.

```ts
const ctrl = useCharacterFromData(data, extras, fadeMs);
```

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `data` | `CharacterData \| null` | — | 백엔드 API 응답 |
| `extras` | `CharacterDataExtras` | `{}` | UI 레이어 옵션 |
| `fadeMs` | `number` | `150` | fade 시간(ms) |

**`CharacterDataExtras` 필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `accessories` | `AccessoryType[]` | 장착할 액세서리 |
| `effect` | `EffectType` | 활성화할 이펙트 |
| `energyLevel` | `EnergyLevel` | 지정 시 자동 계산 override |
| `growthLevel` | `GrowthLevel` | 지정 시 자동 계산 override |
| `workoutPart` | `WorkoutPart` | 지정 시 `data.workout_part` override |

반환값은 `PixelCharacterController` (`frameData`, `opacity`, `currentState`).  
`setState`는 노출하지 않음 — `data`가 단일 진실의 원천.

---

## 유틸 함수

### `resolveCharacterState(data)`

`CharacterData` → `CharacterState`. 우선순위 로직 포함 (api-spec.md 참고).

### `resolveEnergyLevel(data)`

`CharacterData` → `EnergyLevel (0~6)`.

```ts
const score = (data.stats.sleep + data.stats.routine) / 2;
return Math.min(6, Math.floor(score * 7 / 100));
```

### `resolveGrowthLevel(data)`

`CharacterData` → `GrowthLevel (1~5)`.  
`character_level` (1~5)을 그대로 클램프해서 반환.

---

## 상수

### `CELL_SIZE`

```ts
const CELL_SIZE = {
  watch: 2,  // 200×200px — 워치 페이스 255px 원형에 맞춤
  card:  2,  // 200×200px — 인라인 카드·위젯
  phone: 3,  // 300×300px — 앱 홈 화면 메인
  large: 4,  // 400×400px — 태블릿·대형 화면
};
```

---

## `RenderOptions` 필드

`usePixelCharacter`의 `options`와 `PixelCharacter`의 `options` prop에 공통 사용.

| 필드 | 타입 | 설명 |
|------|------|------|
| `accessories` | `AccessoryType[]` | 장착 액세서리 목록 (중복 가능) |
| `effect` | `EffectType` | 이펙트 (단일 선택) |
| `energyLevel` | `EnergyLevel` (0~6) | 몸 색상 레벨 |
| `growthLevel` | `GrowthLevel` (1~5) | 캐릭터 크기 단계 |
| `workoutPart` | `WorkoutPart` | 운동 부위별 체형 |

---

## 액세서리 목록 (`AccessoryType`)

| 값 | 설명 |
|----|------|
| `headband` | 헤드밴드 |
| `dumbbells` | 아령 (양손) |
| `crown` | 왕관 |
| `sunglasses` | 선글라스 |
| `wristband` | 손목밴드 |
| `medal` | 메달 (목걸이) |
| `water_bottle` | 물통 (오른손) |
| `running_shoes` | 러닝화 (발바닥 솔) |
| `earphones` | 무선 이어폰 |

---

## 이펙트 목록 (`EffectType`)

| 값 | 설명 | 어울리는 상태 |
|----|------|-------------|
| `aura` | 에너지 오라 | happy |
| `fire` | 불꽃 | workout, flex |
| `sparkles` | 스파클 | happy, flex |
| `moon_stars` | 달·별 | sleeping |
| `rain_cloud` | 먹구름 | derailed |
| `speed_lines` | 속도선 | workout |
| `recovery_glow` | 회복 오라 | flex, tired |
| `heart_beat` | 하트 | happy, neutral |

---

## 캐릭터 상태 (`CharacterState`)

| 상태 | fps | 트리거 | 몸 형태 |
|------|-----|--------|--------|
| `neutral` | 2 | 기본값 | 기본 |
| `happy` | 4 | 평균 점수 ≥ 75 | 기본 |
| `tired` | 2 | sleep < 40 | 기본 |
| `sleeping` | 2 | is_sleeping = true | 기본 |
| `workout` | 8 | workout_status = active | `workout_part` 체형 |
| `flex` | 2 | workout_status = completed | `workout_part` 체형 |
| `sedentary` | 2 | exercise < 40 | 홀쭉 (THIN) |
| `overfed` | 2 | diet < 40 | 통통 (CHUBBY) |
| `derailed` | 3 | routine < 40 | 기본 |

---

## mocum 통합 가이드

### 통합 경로

`minidis/src/` 파일 전체를 아래 경로로 복사:

```
frontend/src/components/PixelCharacter/
├── index.ts              ← minidis/src/index.ts
├── types.ts              ← minidis/src/types.ts
├── pixelEngine.ts        ← minidis/src/pixelEngine.ts
├── pixelHelpers.ts       ← minidis/src/pixelHelpers.ts
├── accessories.ts        ← minidis/src/accessories.ts
├── effects.ts            ← minidis/src/effects.ts
├── usePixelCharacter.ts  ← minidis/src/usePixelCharacter.ts
└── PixelCharacter.tsx    ← minidis/src/PixelCharacter.tsx
```

### import 경로 (통합 후)

```ts
import { PixelCharacterFromData, useCharacterFromData, CELL_SIZE } from '@/components/PixelCharacter';
```

### CharacterData 타입 위치

`types.ts`의 `CharacterData`는 백엔드 API 응답 타입이지만, 픽셀 엔진과 결합도가 높으므로 `src/api/types.ts`로 분리하지 않고 `PixelCharacter/types.ts` 안에 유지.  
백엔드 API 명세는 [api-spec.md](./api-spec.md) 참고.

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-06-08 | 최초 작성. 모듈 구조 확정 (PixelGrid / PixelCharacter / PixelCharacterFromData / CELL_SIZE). 훅 RenderOptions 지원 추가. useCharacterFromData 신규. 배럴 export (index.ts). |
| 2026-06-08 | mocum 통합 가이드 추가. 통합 경로 (`frontend/src/components/PixelCharacter/`) 및 파일 매핑 확정. |
