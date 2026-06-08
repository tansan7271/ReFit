# 병합 후 개발 루틴

> **대상**: 프론트엔드(수빈) + 백엔드(다은)  
> **전제**: `minidis/src/` → `frontend/src/components/PixelCharacter/` 병합 완료 상태  
> **최종 수정**: 2026-06-08

---

## 개요

minidis 컴포넌트는 완성되어 있지만, 실제 데이터를 받아 화면에 띄우려면 아래 순서로 작업이 필요합니다.  
백엔드 → 프론트엔드 → 뱃지 순으로 진행하세요.

---

## 1단계 — 백엔드: `GET /character` 구현

### 1-1. 네 기둥 모델 설계

현재 백엔드에 없는 두 기둥부터 설계가 필요합니다.

| 기둥 | 현재 상태 | 필요 작업 |
|------|----------|----------|
| `sleep` | `SleepRecord` 있음 | 0~100 점수 계산 로직 추가 |
| `exercise` | `WorkoutSession` 있음 | 0~100 점수 계산 로직 추가 |
| `diet` | **모델 없음** | 식단 기록 모델 + 점수 계산 설계 필요 |
| `routine` | **모델 없음** | 루틴/습관 추적 모델 + 점수 계산 설계 필요 |

점수 계산 가이드는 [api-spec.md](./api-spec.md#stats-객체)를 참고하세요.

### 1-2. 실시간 상태 판별

| 필드 | 필요 작업 |
|------|----------|
| `workout_status` | `WorkoutSession.status == ACTIVE`인 세션이 있으면 `'active'`, 완료 후 30분 이내면 `'completed'`, 나머지 `'none'` |
| `is_sleeping` | 현재 시각이 유저의 수면 목표 취침 시간 ~ 기상 시간 사이면 `true` (또는 진행 중인 SleepRecord 감지) |

### 1-3. 엔드포인트 추가

```
GET /api/v1/character
```

응답 스펙 전체는 [api-spec.md](./api-spec.md)를 참고하세요.  
`dev_status.md`의 API 라우터 목록에 추가하는 것도 잊지 마세요.

---

## 2단계 — 프론트엔드: 캐릭터 컴포넌트 연결

백엔드에서 `GET /character`가 준비되면 프론트엔드 연결을 진행합니다.

### 2-1. API 클라이언트 추가

`frontend/services/api.ts`에 `fetchCharacter()` 함수 추가:

```ts
export const fetchCharacter = (): Promise<CharacterData> =>
  api.get('/character').then((r) => r.data);
```

`CharacterData` 타입은 병합 후 `@/components/PixelCharacter`에서 import합니다.

### 2-2. 홈 화면에 컴포넌트 연결

`frontend/app/(main)/index.tsx` (홈 화면)에 연결합니다.

```tsx
import { useQuery } from '@tanstack/react-query'; // 또는 SWR
import { PixelCharacterFromData, CELL_SIZE } from '@/components/PixelCharacter';
import { fetchCharacter } from '@/services/api';

const { data } = useQuery({ queryKey: ['character'], queryFn: fetchCharacter });

<PixelCharacterFromData data={data ?? null} cellSize={CELL_SIZE.phone} />
```

### 2-3. 폴링 주기 설정

[api-spec.md](./api-spec.md#폴링-주기-권장) 기준:

| 상황 | `refetchInterval` |
|------|------------------|
| 일반 | `5 * 60 * 1000` (5분) |
| `workout_status === 'active'` 중 | `30 * 1000` (30초) |
| `is_sleeping === true` 중 | 폴링 중단 (취침 종료 이벤트로 처리) |

---

## 3단계 — 뱃지 장착 UI 연결

`POST /badges/me/equip` API는 백엔드에 이미 구현되어 있습니다.  
프론트엔드 두 곳을 수정하면 됩니다.

### 3-1. 스토어 (`frontend/store/badgeStore.ts`)

```ts
equipBadge: async (badgeId: number) => {
  await equipBadgeApi(badgeId); // api.ts에 추가
  await get().fetchData(true);  // 강제 새로고침
},
```

### 3-2. 화면 (`frontend/app/(main)/badges.tsx`)

획득 뱃지 카드에 탭 핸들러 + 장착 상태 표시 추가:

- `is_equipped === true`인 뱃지에 장착 표시 (테두리 강조 등)
- 카드 탭 시 `equipBadge(badge.id)` 호출

### 3-3. 캐릭터 위에 뱃지 표시 (선택, 백엔드 협의 필요)

장착된 뱃지를 캐릭터 위에 시각적으로 표현하려면 `GET /character` 응답에 필드 추가가 필요합니다.

```jsonc
// api-spec.md에 추가 협의 필요
{
  "equipped_badge_emoji": "🏆"  // 장착 뱃지 없으면 null
}
```

필드가 추가되면 `minidis/src/types.ts`의 `CharacterData`에 반영하고,  
`PixelCharacterFromData`에 `badge` prop으로 전달해 이펙트 또는 액세서리로 렌더링합니다.

---

## 작업 순서 요약

```
[백엔드 다은]
  1. diet / routine 모델 설계
  2. 네 기둥 점수 계산 로직
  3. GET /character 엔드포인트 추가
  4. (선택) GET /character 응답에 equipped_badge_emoji 추가

[프론트엔드 수빈]
  5. api.ts에 fetchCharacter() 추가
  6. 홈 화면 캐릭터 컴포넌트 연결 + 폴링 설정
  7. badgeStore.ts에 equipBadge() 추가
  8. badges.tsx 장착 탭 핸들러 + 장착 표시 UI 추가
  9. (백엔드 4번 완료 후) 캐릭터 위 뱃지 렌더링
```
