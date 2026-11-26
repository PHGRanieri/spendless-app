import { Alert } from 'react-native';
import type { EditScope } from '../domain/types';

export type DialogActionStyle = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'cancel';

export interface DialogAction {
  key: string;
  label: string;
  style: DialogActionStyle;
}

export interface DialogOptions {
  emoji: string;
  /** 'danger' pinta o círculo do emoji com tint de Brasa; 'neutral' com Orvalho. */
  tone: 'danger' | 'neutral';
  title: string;
  message: string;
  actions: DialogAction[];
}

type Presenter = (opts: DialogOptions) => Promise<string | null>;
let presenter: Presenter | null = null;

/** Registrado pelo <DialogHost/> montado na raiz do app. */
export function registerDialogPresenter(p: Presenter | null): void {
  presenter = p;
}

/**
 * Mostra o diálogo com a identidade do $pendless e devolve a `key` escolhida
 * (ou null se o usuário fechou/cancelou). Sem host montado, cai no Alert do sistema.
 */
export function showDialog(opts: DialogOptions): Promise<string | null> {
  if (presenter) return presenter(opts);
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      opts.actions.map((a) => ({
        text: a.label,
        style: a.style === 'cancel' ? 'cancel' : a.style.startsWith('danger') ? 'destructive' : 'default',
        onPress: () => resolve(a.style === 'cancel' ? null : a.key),
      })),
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** Pergunta se a mudança vale só para este mês ou para este e os próximos. */
export async function askScope(action: 'editar' | 'excluir'): Promise<EditScope | null> {
  const deleting = action === 'excluir';
  const key = await showDialog(
    deleting
      ? {
          emoji: '🗑️',
          tone: 'danger',
          title: 'Excluir item fixo',
          message: 'Este item se repete todo mês. De quais meses você quer excluir?',
          actions: [
            { key: 'only_this', label: 'Só deste mês', style: 'danger-outline' },
            { key: 'this_and_next', label: 'Deste e dos próximos', style: 'danger' },
            { key: 'cancel', label: 'Cancelar', style: 'cancel' },
          ],
        }
      : {
          emoji: '✏️',
          tone: 'neutral',
          title: 'Aplicar alteração',
          message: 'Este item se repete todo mês. A mudança vale para:',
          actions: [
            { key: 'only_this', label: 'Só este mês', style: 'secondary' },
            { key: 'this_and_next', label: 'Este e os próximos', style: 'primary' },
            { key: 'cancel', label: 'Cancelar', style: 'cancel' },
          ],
        },
  );
  return key === 'only_this' || key === 'this_and_next' ? key : null;
}

export async function confirm(
  title: string,
  message: string,
  okText: string,
  destructive = false,
  emoji = destructive ? '🗑️' : '💬',
): Promise<boolean> {
  const key = await showDialog({
    emoji,
    tone: destructive ? 'danger' : 'neutral',
    title,
    message,
    actions: [
      { key: 'ok', label: okText, style: destructive ? 'danger' : 'primary' },
      { key: 'cancel', label: 'Cancelar', style: 'cancel' },
    ],
  });
  return key === 'ok';
}
