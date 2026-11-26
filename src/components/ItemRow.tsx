import React from 'react';
import { AccessibilityActionEvent, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, common, space } from '../theme';
import { formatBRL } from '../money';
import { Amount, StatusPill, TypeBadge } from './ui';

export function ItemRow({
  type,
  title,
  subtitle,
  cents,
  amountColor,
  done,
  doneLabel,
  pendingLabel,
  onToggle,
  onPress,
}: {
  type: string;
  title: string;
  subtitle: string;
  cents: number;
  amountColor: string;
  done: boolean;
  doneLabel: string;
  pendingLabel: string;
  onToggle: () => void;
  onPress: () => void;
}) {
  // A linha agrupa os filhos para o leitor de tela, então a pílula aninhada não recebe foco.
  // A troca de status fica disponível como ação de acessibilidade da própria linha.
  const toggleLabel = `Marcar como ${(done ? pendingLabel : doneLabel).toLowerCase()}`;
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'toggle') onToggle();
    else if (e.nativeEvent.actionName === 'activate') onPress();
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatBRL(cents)}, ${done ? doneLabel : pendingLabel}. ${subtitle}`}
      accessibilityHint="Toque duas vezes para editar. Deslize para cima ou para baixo para mudar o status."
      accessibilityActions={[
        { name: 'activate', label: 'Editar' },
        { name: 'toggle', label: toggleLabel },
      ]}
      onAccessibilityAction={onAction}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <TypeBadge type={type} />
      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={styles.right}>
        <Amount cents={cents} color={amountColor} bold size={16} />
        <StatusPill done={done} doneLabel={doneLabel} pendingLabel={pendingLabel} onPress={onToggle} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...common.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    marginBottom: space.sm + 2,
    gap: space.md,
  },
  middle: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
