import { Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  primary: '#16A34A',
  primaryDark: '#14532D',
  softAccent: '#DCFCE7',
  background: '#F8FAF9',
  text: '#0F172A',
  textSecondary: '#64748B',
  expense: '#DC2626',
  pending: '#D97706',
  /** Âmbar escuro SÓ para texto de pendente (contraste 6,25:1 sobre o tint de Mel). Aprovado pelo usuário. */
  pendingText: '#92400E',
  surface: '#FFFFFF',
  border: '#E2E8F0',
} as const;

/**
 * Cores com papel de contraste (WCAG ≥ 4,5:1):
 * - ação: botões preenchidos e chips/dia selecionados usam Floresta com texto branco (9,1:1);
 * - entrada: valores de entradas em texto usam Floresta (9,1:1). Broto fica para "$", barras e detalhes.
 */
export const roles = {
  action: colors.primaryDark,
  onAction: colors.surface,
  incomeText: colors.primaryDark,
} as const;

/** Cor oficial com opacidade: "#16A34A" + 0.14 -> "rgba(22,163,74,0.14)". */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const tints = {
  green: tint(colors.primary, 0.12),
  amber: tint(colors.pending, 0.12),
  red: tint(colors.expense, 0.1),
  white15: 'rgba(255,255,255,0.15)',
  white70: 'rgba(255,255,255,0.75)',
} as const;

export const radius = 12;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** Números tabulares para valores em destaque. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Sombra leve (sem sombras pesadas). */
export const softShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  default: { elevation: 2 },
})!;

export const common = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    padding: space.lg,
    ...softShadow,
  },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: space.xs, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textSecondary },
});
