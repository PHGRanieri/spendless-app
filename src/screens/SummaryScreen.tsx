import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { useApp } from '../AppContext';
import { loadMonthSummary } from '../domain/summary';
import { Amount, Empty, ProgressBar, TypeBadge } from '../components/ui';
import { colors, common, radius, roles, space, tabular, tints } from '../theme';
import { formatBRL } from '../money';
import { iconFor } from '../typeIcons';

export function SummaryScreen() {
  const { db, month, version } = useApp();
  const s = useMemo(() => loadMonthSummary(db, month), [db, month, version]);
  const negative = s.balanceNow < 0;
  const forecastNegative = s.balanceForecast < 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Cartão-herói */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>Saldo atual</Text>
          {negative && (
            <View style={styles.negBadge}>
              <Text style={styles.negBadgeText}>no vermelho</Text>
            </View>
          )}
        </View>
        <Text style={[styles.heroValue, tabular]} adjustsFontSizeToFit numberOfLines={1}>
          {formatBRL(s.balanceNow)}
        </Text>
        <Text style={styles.heroHint}>entradas recebidas − gastos pagos</Text>
        <View style={styles.heroDivider} />
        <View style={styles.heroBottom}>
          <Text style={styles.heroLabel}>Previsto no fim do mês</Text>
          <View style={forecastNegative ? styles.negForecast : undefined}>
            <Text style={[styles.heroForecast, tabular]}>{formatBRL(s.balanceForecast)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <FlowCard
          emoji="💰"
          bg={tints.green}
          label="Entradas"
          done={s.incomesReceived}
          expected={s.incomesExpected}
          doneWord="recebido"
          color={roles.incomeText}
        />
        <FlowCard
          emoji="💸"
          bg={tints.red}
          label="Saídas"
          done={s.expensesPaid}
          expected={s.expensesExpected}
          doneWord="pago"
          color={colors.expense}
        />
      </View>

      <Text style={[common.title, styles.sectionTitle]}>Para onde vai o dinheiro</Text>
      {s.byType.length === 0 ? (
        <Empty emoji="🧺" title="Nenhum gasto neste mês" text="Quando você lançar gastos, eles aparecem aqui por tipo." />
      ) : (
        <View style={common.card}>
          {s.byType.map((t, i) => {
            const pct = Math.round(t.share * 100);
            const color = iconFor(t.type).color;
            return (
              <View key={t.type} style={[styles.typeRow, i === s.byType.length - 1 && { marginBottom: 0 }]}>
                <TypeBadge type={t.type} size={36} />
                <View style={{ flex: 1 }}>
                  <View style={styles.typeHead}>
                    <Text style={styles.typeName} numberOfLines={1}>{t.type}</Text>
                    <Text style={[common.muted, tabular]}>{pct}%</Text>
                    <Amount cents={t.cents} bold />
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.bar, { width: `${Math.max(3, pct)}%`, backgroundColor: color }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function FlowCard({ emoji, bg, label, done, expected, doneWord, color }: {
  emoji: string;
  bg: string;
  label: string;
  done: number;
  expected: number;
  doneWord: string;
  color: string;
}) {
  const { month } = useApp();
  const pct = expected > 0 ? Math.min(100, Math.round((done / expected) * 100)) : 0;
  return (
    <View style={[common.card, styles.flow]}>
      <View style={styles.flowHead}>
        <View style={[styles.flowIcon, { backgroundColor: bg }]}>
          <Text style={{ fontSize: 16 }}>{emoji}</Text>
        </View>
        <Text style={styles.flowLabel}>{label}</Text>
      </View>
      <Amount cents={done} color={color} size={18} bold />
      <Text style={[common.muted, tabular, { fontSize: 12 }]}>
        {doneWord} de {formatBRL(expected)}
      </Text>
      <View style={{ marginTop: space.sm }}>
        <ProgressBar pct={pct} color={color} trackColor={bg} resetKey={month} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: space.sm, paddingBottom: space.xl * 2 },
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius,
    padding: space.xl,
    marginBottom: space.md,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: tints.white70, fontSize: 14, fontWeight: '600' },
  heroValue: { color: colors.surface, fontSize: 38, fontWeight: '800', marginTop: space.xs, letterSpacing: -0.5 },
  heroHint: { color: tints.white70, fontSize: 12 },
  heroDivider: { height: 1, backgroundColor: tints.white15, marginVertical: space.lg },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroForecast: { color: colors.surface, fontSize: 20, fontWeight: '700' },
  negBadge: { backgroundColor: colors.expense, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  negForecast: { backgroundColor: colors.expense, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10 },
  negBadgeText: { color: colors.surface, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: space.md, marginBottom: space.xl },
  flow: { flex: 1, gap: 2, padding: space.md },
  flowHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  flowIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  flowLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  sectionTitle: { marginBottom: space.md },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  typeHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 6 },
  typeName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  track: { height: 10, borderRadius: 999, backgroundColor: colors.background, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 999 },
});
