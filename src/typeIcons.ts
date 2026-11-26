import { colors, tint } from './theme';

export interface TypeIcon {
  emoji: string;
  /** Cor base (oficial) do círculo; o fundo usa um tint dela. */
  color: string;
}

const G = colors.primary;
const D = colors.primaryDark;
const A = colors.pending;
const R = colors.expense;
const S = colors.textSecondary;

/** Tipo de entrada/gasto → emoji + cor. */
export const TYPE_ICONS: Record<string, TypeIcon> = {
  // Entradas
  Salário: { emoji: '💼', color: G },
  Freelance: { emoji: '💻', color: D },
  Rendimentos: { emoji: '🌱', color: G },
  Reembolso: { emoji: '↩️', color: S },
  Venda: { emoji: '🏷️', color: A },
  // Gastos
  'Contas de casa': { emoji: '🏠', color: D },
  Alimentação: { emoji: '🍽️', color: A },
  Mercado: { emoji: '🛒', color: G },
  Transporte: { emoji: '🚌', color: S },
  Saúde: { emoji: '🩺', color: R },
  Academia: { emoji: '💪', color: A },
  Estudos: { emoji: '📚', color: D },
  Lazer: { emoji: '🎉', color: A },
  Assinaturas: { emoji: '📺', color: S },
  Pets: { emoji: '🐾', color: A },
  Vestuário: { emoji: '👕', color: D },
  'Cuidados pessoais': { emoji: '🧴', color: G },
  Viagem: { emoji: '✈️', color: S },
  'Impostos e taxas': { emoji: '🧾', color: R },
  Outros: { emoji: '✨', color: S },
};

export function iconFor(type: string): TypeIcon {
  return TYPE_ICONS[type] ?? { emoji: '✨', color: S };
}

export function iconBg(type: string): string {
  return tint(iconFor(type).color, 0.14);
}
