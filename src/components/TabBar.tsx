import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme';

export type TabKey = 'resumo' | 'entradas' | 'fixos' | 'variaveis' | 'ajustes';

export const TABS: { key: TabKey; label: string; emoji: string; a11y: string }[] = [
  { key: 'resumo', label: 'Resumo', emoji: '🏡', a11y: 'Resumo' },
  { key: 'entradas', label: 'Entradas', emoji: '💰', a11y: 'Entradas' },
  { key: 'fixos', label: 'Fixos', emoji: '📌', a11y: 'Gastos fixos' },
  { key: 'variaveis', label: 'Variáveis', emoji: '🛍️', a11y: 'Gastos variáveis' },
  { key: 'ajustes', label: 'Ajustes', emoji: '⚙️', a11y: 'Ajustes' },
];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={t.a11y}
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.iconPill, on && { backgroundColor: colors.softAccent }]}>
              <Text allowFontScaling={false} style={[styles.emoji, !on && { opacity: 0.55 }]}>{t.emoji}</Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: 'center' },
  iconPill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 16, marginBottom: 2 },
  emoji: { fontSize: 20 },
  label: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  labelOn: { color: colors.primaryDark, fontWeight: '800' },
});
