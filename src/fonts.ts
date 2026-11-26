import type { TextStyle } from 'react-native';

/**
 * Nunito (SIL Open Font License — assets/fonts/OFL.txt), embutida no app.
 * Uma família por peso: no Android, fontWeight não escolhe o arquivo de uma
 * fonte customizada, então o peso é resolvido aqui.
 * Os dígitos da Nunito têm largura fixa por padrão (números tabulares).
 */
export const FONT_FILES = {
  'Nunito-Regular': require('../assets/fonts/Nunito_400Regular.ttf'),
  'Nunito-SemiBold': require('../assets/fonts/Nunito_600SemiBold.ttf'),
  'Nunito-Bold': require('../assets/fonts/Nunito_700Bold.ttf'),
  'Nunito-ExtraBold': require('../assets/fonts/Nunito_800ExtraBold.ttf'),
};

let ready = false;

/** Chamado pelo App quando as fontes terminam de carregar. Se falharem, o app usa a fonte do sistema. */
export function setFontsReady(value: boolean): void {
  ready = value;
}

/** Família Nunito para o peso pedido, ou undefined (fonte do sistema) se não carregou. */
export function fontFamilyFor(weight: TextStyle['fontWeight']): string | undefined {
  if (!ready) return undefined;
  const w = typeof weight === 'number' ? weight : weight === 'bold' ? 700 : Number(weight ?? 400) || 400;
  if (w >= 800) return 'Nunito-ExtraBold';
  if (w >= 700) return 'Nunito-Bold';
  if (w >= 500) return 'Nunito-SemiBold';
  return 'Nunito-Regular';
}
