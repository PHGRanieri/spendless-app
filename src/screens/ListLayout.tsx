import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { Amount, Button, Empty, ProgressBar } from '../components/ui';
import { useApp } from '../AppContext';
import { common, space, tabular } from '../theme';

/** Estrutura comum das abas de lista: totais do mês, botão de incluir e itens. */
export function ListLayout({
  emoji,
  doneLabel,
  doneCents,
  totalCents,
  amountColor,
  progressBg,
  addLabel,
  onAdd,
  emptyTitle,
  emptyText,
  children,
  count,
}: {
  emoji: string;
  doneLabel: string;
  doneCents: number;
  totalCents: number;
  amountColor: string;
  progressBg: string;
  addLabel: string;
  onAdd: () => void;
  emptyTitle: string;
  emptyText: string;
  count: number;
  children: React.ReactNode;
}) {
  const { month } = useApp();
  const pct = totalCents > 0 ? Math.min(100, Math.round((doneCents / totalCents) * 100)) : 0;
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[common.card, styles.totals]}>
        <View style={styles.totalsRow}>
          <View>
            <Text style={common.label}>{doneLabel}</Text>
            <Amount cents={doneCents} color={amountColor} size={22} bold />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={common.label}>Previsto</Text>
            <Amount cents={totalCents} size={18} bold />
          </View>
        </View>
        <ProgressBar pct={pct} color={amountColor} trackColor={progressBg} resetKey={month} />
        <Text style={[common.muted, tabular, { fontSize: 12 }]}>
          {count === 0 ? 'Nenhum item ainda' : `${pct}% ${doneLabel.toLowerCase()} · ${count} ${count === 1 ? 'item' : 'itens'}`}
        </Text>
      </View>

      {count === 0 ? (
        <Empty emoji={emoji} title={emptyTitle} text={emptyText} actionLabel={addLabel} onAction={onAdd} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', marginBottom: space.lg }}>
            <Button title={addLabel} onPress={onAdd} />
          </View>
          {children}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: space.sm, paddingBottom: space.xl * 2 },
  totals: { marginBottom: space.lg, gap: space.sm },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
});
