/**
 * 시간 입력 필드 — 시/분 +/- 스테퍼.
 * 외부 datetime-picker 의존 없이 가볍게 구현 (온보딩 단순 입력 용도).
 * 값 포맷은 24시간 "HH:mm".
 */
import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { fontSize, fontWeight, radius } from '@/constants/typography';

interface TimeFieldProps {
  label: string;
  /** "HH:mm" */
  value: string;
  onChange: (value: string) => void;
}

const pad = (n: number): string => n.toString().padStart(2, '0');

type EditingField = 'hour' | 'minute' | null;

export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const [hStr, mStr] = value.split(':');
  const hour = Number(hStr) || 0;
  const minute = Number(mStr) || 0;

  const [editingField, setEditingField] = useState<EditingField>(null);

  const update = useCallback(
    (h: number, m: number) => {
      const nextH = ((h % 24) + 24) % 24;
      const nextM = ((m % 60) + 60) % 60;
      onChange(`${pad(nextH)}:${pad(nextM)}`);
    },
    [onChange],
  );

  /**
   * 직접 입력된 문자열을 파싱·검증 후 커밋한다.
   * 빈 값 또는 NaN이면 기존 값으로 되돌리고, 유효하면 범위 내로 클램프한다.
   */
  const commitEdit = useCallback(
    (field: 'hour' | 'minute', raw: string) => {
      const trimmed = raw.trim();
      const parsed = Number(trimmed);
      const isValid = trimmed.length > 0 && !Number.isNaN(parsed);

      if (isValid) {
        if (field === 'hour') {
          const clamped = Math.min(Math.max(Math.trunc(parsed), 0), 23);
          update(clamped, minute);
        } else {
          const clamped = Math.min(Math.max(Math.trunc(parsed), 0), 59);
          update(hour, clamped);
        }
      }
      // 무효 입력이면 값 변경 없이 표시로 복귀.
      setEditingField(null);
    },
    [update, hour, minute],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Stepper
          accessibilityLabel={`${label} 시`}
          value={pad(hour)}
          editing={editingField === 'hour'}
          onStartEdit={() => setEditingField('hour')}
          onEdit={(v) => commitEdit('hour', v)}
          onUp={() => update(hour + 1, minute)}
          onDown={() => update(hour - 1, minute)}
        />
        <Text style={styles.colon}>:</Text>
        <Stepper
          accessibilityLabel={`${label} 분`}
          value={pad(minute)}
          editing={editingField === 'minute'}
          onStartEdit={() => setEditingField('minute')}
          onEdit={(v) => commitEdit('minute', v)}
          onUp={() => update(hour, minute + 5)}
          onDown={() => update(hour, minute - 5)}
        />
      </View>
    </View>
  );
}

interface StepperProps {
  value: string;
  accessibilityLabel: string;
  editing: boolean;
  onStartEdit: () => void;
  onEdit: (value: string) => void;
  onUp: () => void;
  onDown: () => void;
}

function Stepper({
  value,
  accessibilityLabel,
  editing,
  onStartEdit,
  onEdit,
  onUp,
  onDown,
}: StepperProps) {
  // 편집 중에는 입력 버퍼를 로컬로 관리하고, 커밋 시 부모로 전달한다.
  const [draft, setDraft] = useState(value);

  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} 증가`}
        onPress={onUp}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
      >
        <Text style={styles.stepBtnText}>▲</Text>
      </Pressable>
      {editing ? (
        <TextInput
          accessibilityLabel={`${accessibilityLabel} 직접 입력`}
          style={[styles.stepValue, styles.stepInput]}
          defaultValue={value}
          autoFocus
          selectTextOnFocus
          keyboardType="number-pad"
          maxLength={2}
          returnKeyType="done"
          onChangeText={setDraft}
          onBlur={() => onEdit(draft)}
          onSubmitEditing={() => onEdit(draft)}
        />
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel} 직접 입력 시작`}
          accessibilityHint="탭하여 값을 직접 입력합니다"
          onPress={() => {
            setDraft(value);
            onStartEdit();
          }}
          activeOpacity={0.6}
        >
          <Text style={styles.stepValue}>{value}</Text>
        </TouchableOpacity>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel} 감소`}
        onPress={onDown}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
      >
        <Text style={styles.stepBtnText}>▼</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colon: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    color: colors.text3,
  },
  stepper: {
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.5,
  },
  stepBtnText: {
    fontSize: fontSize.md,
    color: colors.accent,
  },
  stepValue: {
    fontSize: 32,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    minWidth: 56,
    textAlign: 'center',
  },
  stepInput: {
    // 표시 텍스트가 가지던 기본 패딩과의 차이를 없애 레이아웃 점프 방지.
    paddingVertical: 0,
    paddingHorizontal: 0,
    color: colors.accent,
  },
});
