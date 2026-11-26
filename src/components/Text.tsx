import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
  TextStyle,
} from 'react-native';
import { fontFamilyFor } from '../fonts';

/** Converte fontWeight na família Nunito correspondente (mantém o resto do estilo). */
function withFont(style: TextProps['style']) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const family = fontFamilyFor(flat.fontWeight);
  if (!family) return style;
  const { fontWeight: _ignored, ...rest } = flat;
  return [rest, { fontFamily: family }];
}

/**
 * Teto de ampliação pela fonte do sistema: acompanha a preferência do usuário até 160%,
 * sem deixar o layout de celular estourar. Pontos rígidos (pílulas, abas, grade) usam 1.3.
 */
const DEFAULT_MAX_SCALE = 1.6;

/** Text do app: usa a Nunito no peso certo em iOS e Android. */
export function Text({ style, maxFontSizeMultiplier = DEFAULT_MAX_SCALE, ...props }: TextProps) {
  return <RNText {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} style={withFont(style)} />;
}

export function TextInput({ style, maxFontSizeMultiplier = DEFAULT_MAX_SCALE, ...props }: TextInputProps) {
  return <RNTextInput {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} style={withFont(style)} />;
}
