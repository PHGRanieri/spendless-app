import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { EASE_OUT, usePressScale, useReducedMotion } from '../motion';
import { Text, TextInput } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, common, radius, roles, space, tabular, tints } from '../theme';
import { iconBg, iconFor } from '../typeIcons';
import { centsFromMaskedInput, formatBRL } from '../money';
import { daysInMonth, firstWeekday, monthLabel } from '../dates';

/* ---------- Botões ---------- */

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const bg = variant === 'primary' ? roles.action : colors.surface;
  const fg = variant === 'primary' ? roles.onAction : variant === 'danger' ? colors.expense : colors.primaryDark;
  // Encolhe para 97% ao encostar (120ms) e volta ao soltar (160ms).
  const press = usePressScale({ to: 0.97, inMs: 120, release: { type: 'timing', ms: 160 } });
  const reduced = useReducedMotion();
  return (
    <Animated.View style={[{ flex: 1 }, press.style]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: bg, opacity: disabled ? 0.5 : reduced && pressed ? 0.8 : 1 },
          variant !== 'primary' && { borderWidth: 1, borderColor: variant === 'danger' ? colors.expense : colors.border },
        ]}
      >
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Botão de status: alterna entre concluído (verde) e pendente (âmbar). */
export function StatusPill({ done, doneLabel, pendingLabel, onPress }: {
  done: boolean;
  doneLabel: string;
  pendingLabel: string;
  onPress: () => void;
}) {
  // Sutil (usado dezenas de vezes por dia): 96% em 100ms, volta com mola rápida. A cor troca na hora.
  const press = usePressScale({ to: 0.96, inMs: 100, release: { type: 'spring', tension: 300, friction: 20 } });
  const reduced = useReducedMotion();
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={doneLabel}
        accessibilityState={{ checked: done }}
        accessibilityHint={`Toque duas vezes para marcar como ${(done ? pendingLabel : doneLabel).toLowerCase()}`}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        hitSlop={8}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: done ? colors.softAccent : tints.amber, opacity: reduced && pressed ? 0.7 : 1 },
        ]}
      >
        <Text
          maxFontSizeMultiplier={1.3}
          style={[styles.pillText, { color: done ? colors.primaryDark : colors.pendingText }]}
        >
          {done ? `✓ ${doneLabel}` : `○ ${pendingLabel}`}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Barra de progresso. Quando o valor muda dentro do mesmo mês (ex.: marcou um item
 * como pago), cresce/encolhe a partir da esquerda em 240ms. Ao montar ou trocar de
 * mês (`resetKey`), já aparece no lugar.
 * Anima a largura (não scaleX) para não achatar as pontas arredondadas.
 */
export function ProgressBar({ pct, color, trackColor, height = 8, resetKey }: {
  pct: number;
  color: string;
  trackColor: string;
  height?: number;
  resetKey: string;
}) {
  const value = useRef(new Animated.Value(pct)).current;
  const lastKey = useRef(resetKey);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (lastKey.current !== resetKey || reduced) {
      lastKey.current = resetKey;
      value.stopAnimation();
      value.setValue(pct);
      return;
    }
    Animated.timing(value, { toValue: pct, duration: 240, easing: EASE_OUT, useNativeDriver: false }).start();
  }, [pct, resetKey, reduced, value]);

  const width = value.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  return (
    <View style={{ height, borderRadius: 999, overflow: 'hidden', backgroundColor: trackColor }}>
      <Animated.View style={{ height, borderRadius: 999, width, backgroundColor: color }} />
    </View>
  );
}

/** Círculo com o emoji do tipo (identidade visual de cada categoria). */
export function TypeBadge({ type, size = 40 }: { type: string; size?: number }) {
  return (
    <View
      // Decorativo: o tipo já é lido no texto do item; o emoji não vira ruído no leitor de tela.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: iconBg(type),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text allowFontScaling={false} style={{ fontSize: size * 0.5 }}>{iconFor(type).emoji}</Text>
    </View>
  );
}

/* ---------- Campos ---------- */

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={common.label}>{label}</Text>
      {children}
    </View>
  );
}

export function TextField(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={colors.textSecondary} {...props} style={[styles.input, props.style]} />;
}

/** Valor em R$: o usuário digita só números, que preenchem os centavos da direita para a esquerda. */
export function MoneyField({ cents, onChange }: { cents: number; onChange: (c: number) => void }) {
  return (
    <TextInput
      style={[styles.input, styles.money]}
      keyboardType="number-pad"
      value={formatBRL(cents)}
      onChangeText={(t) => onChange(centsFromMaskedInput(t))}
      selectTextOnFocus={false}
      accessibilityLabel="Valor"
    />
  );
}

/** Caixa de seleção: abre uma lista com as opções. */
export function SelectField({ value, options, onChange, placeholder = 'Selecione' }: {
  value: string | null;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={[styles.input, styles.select]} onPress={() => setOpen(true)} accessibilityRole="button">
        <View style={styles.optionLeft}>
          {value && <TypeBadge type={value} size={28} />}
          <Text style={value ? common.body : common.muted}>{value ?? placeholder}</Text>
        </View>
        <Text style={common.muted}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={options as string[]}
              keyExtractor={(o) => o}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <TypeBadge type={item} size={32} />
                    <Text style={[common.body, item === value && { color: colors.primaryDark, fontWeight: '700' }]}>
                      {item}
                    </Text>
                  </View>
                  {item === value && <Text style={{ color: colors.primaryDark }}>✓</Text>}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function Segmented<T extends string>({ value, options, onChange, disabled }: {
  value: T;
  options: readonly { key: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.segmented, disabled && { opacity: 0.5 }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            disabled={disabled}
            onPress={() => onChange(o.key)}
            hitSlop={{ top: 2, bottom: 2 }}
            style={[styles.segment, active && { backgroundColor: roles.action, borderColor: roles.action }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: !!disabled }}
          >
            <Text style={[styles.segmentText, active && { color: roles.onAction }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Grade de dias do mês selecionado (igual no iOS e no Android). */
export function DayGrid({ month, value, onChange, minDate }: {
  month: string;
  value: string;
  onChange: (date: string) => void;
  /** Dias anteriores a esta data ficam desabilitados. */
  minDate?: string;
}) {
  const total = daysInMonth(month);
  const offset = firstWeekday(month);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return (
    <View style={styles.grid}>
      <Text style={[common.muted, { marginBottom: space.sm }]}>{monthLabel(month)}</Text>
      <View style={styles.row}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={[styles.cell, common.muted]}>{d}</Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.row}>
          {cells.slice(r * 7, r * 7 + 7).map((day, i) => {
            if (day == null) return <View key={i} style={styles.cell} />;
            const date = `${month}-${String(day).padStart(2, '0')}`;
            const selected = date === value;
            const disabled = minDate != null && date < minDate;
            return (
              <Pressable
                key={i}
                disabled={disabled}
                onPress={() => onChange(date)}
                style={[styles.cell, styles.day, selected && { backgroundColor: roles.action }]}
                accessibilityRole="button"
                accessibilityLabel={`Dia ${day}`}
                accessibilityState={{ selected, disabled }}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[
                    tabular,
                    {
                      color: selected ? roles.onAction : disabled ? colors.border : colors.text,
                      fontWeight: selected ? '700' : '400',
                    },
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* ---------- Estrutura ---------- */

/** Formulário em tela cheia (modal) com rolagem e teclado tratado nas duas plataformas. */
export function FormModal({ visible, title, onClose, children, footer }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        // 'padding' nas duas plataformas: no Android com edge-to-edge (SDK 58) a janela não
        // encolhe sozinha com o teclado. O KeyboardAvoidingView mede a sobreposição real, então
        // não compensa em dobro quando o sistema já redimensionou.
        behavior="padding"
      >
        <View style={[styles.modalHeader, { paddingTop: insets.top + space.md }]}>
          <Text style={common.title} accessibilityRole="header">{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={{ color: colors.primaryDark, fontSize: 16, fontWeight: '700' }}>Fechar</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        <View style={[styles.modalFooter, { paddingBottom: insets.bottom + space.md }]}>{footer}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Amount({ cents, color = colors.text, size = 15, bold }: {
  cents: number;
  color?: string;
  size?: number;
  bold?: boolean;
}) {
  return (
    <Text style={[tabular, { color, fontSize: size, fontWeight: bold ? '700' : '500' }]}>{formatBRL(cents)}</Text>
  );
}

/** Estado vazio acolhedor: emoji, frase amigável e (opcional) uma ação. */
export function Empty({ emoji = '🌱', title, text, actionLabel, onAction }: {
  emoji?: string;
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  // Entrada única (momento raro): sobe 8px com fade em 320ms; o emoji "assenta" 60ms depois.
  const reduced = useReducedMotion();
  const enter = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    if (reduced) {
      pop.setValue(1);
      Animated.timing(enter, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(enter, { toValue: 1, duration: 320, easing: EASE_OUT, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 7, tension: 120, delay: 60, useNativeDriver: true }),
    ]).start();
  }, [enter, pop, reduced]);
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : 8, 0] });

  return (
    <Animated.View style={[styles.empty, { opacity: enter, transform: [{ translateY }] }]}>
      <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.emptyIcon, { transform: [{ scale: pop }] }]}
      >
        <Text style={{ fontSize: 34 }}>{emoji}</Text>
      </Animated.View>
      <Text style={[common.title, { textAlign: 'center' }]}>{title}</Text>
      {text && <Text style={[common.muted, { textAlign: 'center', marginTop: space.xs }]}>{text}</Text>}
      {actionLabel && onAction && (
        <View style={{ flexDirection: 'row', marginTop: space.lg, alignSelf: 'stretch' }}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    flex: 1,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  pill: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  pillText: { fontSize: 12, fontWeight: '700' },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  empty: { ...common.card, alignItems: 'center', paddingVertical: space.xl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.softAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  money: { ...tabular, fontSize: 20, fontWeight: '600' },
  select: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'center', padding: space.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius, maxHeight: '75%', paddingVertical: space.sm },
  option: {
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  segment: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  segmentText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  grid: { backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: space.md },
  row: { flexDirection: 'row' },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  day: { borderRadius: radius },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
