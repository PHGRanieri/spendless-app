import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useApp } from '../AppContext';
import { monthLabel, monthShortLabel } from '../dates';
import { nextMonthToCreate } from '../domain/months';
import { colors, roles, softShadow, space } from '../theme';

/** Wordmark "$pendless" + seletor de mês + criar o próximo mês. */
export function Header({ onCreateNext }: { onCreateNext: (month: string) => void }) {
  const { db, months, month, setMonth } = useApp();
  const idx = months.indexOf(month);
  const prev = idx > 0 ? months[idx - 1] : null;
  const next = idx >= 0 && idx < months.length - 1 ? months[idx + 1] : null;
  const toCreate = nextMonthToCreate(db, new Date());
  const isLast = idx === months.length - 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View>
          <Text style={styles.brand} accessibilityRole="header" accessibilityLabel="$pendless">
            <Text style={styles.dollar}>$</Text>pendless
          </Text>
          <Text style={styles.tagline}>Seu dinheiro, em ordem.</Text>
        </View>
        {isLast && (
          <Pressable
            onPress={() => onCreateNext(toCreate)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Criar o mês ${monthLabel(toCreate)}`}
            style={({ pressed }) => [styles.create, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.createText}>＋ {monthShortLabel(toCreate)}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.picker}>
        <Arrow label="‹" target={prev} onPress={setMonth} a11y="Mês anterior" />
        <Text style={styles.month} accessibilityLabel={monthLabel(month)}>📅  {monthLabel(month)}</Text>
        <Arrow label="›" target={next} onPress={setMonth} a11y="Próximo mês" />
      </View>
    </View>
  );
}

function Arrow({ label, target, onPress, a11y }: {
  label: string;
  target: string | null;
  onPress: (m: string) => void;
  a11y: string;
}) {
  return (
    <Pressable
      disabled={!target}
      onPress={() => target && onPress(target)}
      hitSlop={12}
      style={[styles.arrow, !target && { opacity: 0.3 }]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Text style={styles.arrowText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: colors.background },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  brand: { fontSize: 34, fontWeight: '800', color: colors.primaryDark, letterSpacing: -1 },
  dollar: { color: colors.primary },
  tagline: { fontSize: 14, color: colors.textSecondary, marginTop: -2 },
  create: {
    backgroundColor: roles.action,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  createText: { color: roles.onAction, fontSize: 14, fontWeight: '700' },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 2,
    ...softShadow,
  },
  month: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softAccent,
  },
  arrowText: { fontSize: 24, color: colors.primaryDark, lineHeight: 28, fontWeight: '600' },
});
