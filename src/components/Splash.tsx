import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from './Text';
import { EASE_OUT, useReducedMotion } from '../motion';
import { colors } from '../theme';

/** Mesmo tamanho do `imageWidth` do plugin expo-splash-screen (app.json): o 1º quadro casa com o nativo. */
const MARK = 160;

const base = require('../../assets/logo/mark-base.png');
const leafRight = require('../../assets/logo/mark-leaf-right.png');
const leafLeft = require('../../assets/logo/mark-leaf-left.png');

/**
 * Abertura do $pendless. Começa idêntica ao splash nativo (ladrilho + cifrão + haste),
 * esconde o nativo no primeiro layout e então:
 *   80–520ms  as duas folhas brotam da ponta da haste (a esquerda 70ms depois)
 *   300–620ms o wordmark sobe 8px com fade; a frase vem 80ms depois
 *   950–1150ms a camada inteira some e revela o app
 * Com Reduzir Movimento: tudo já no lugar, só o fade de saída.
 * Tudo em transform/opacity com native driver: roda na thread de UI mesmo com o JS ocupado.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const leafR = useRef(new Animated.Value(0)).current;
  const leafL = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  const started = useRef(false);

  const start = () => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hideAsync().catch(() => {});
    const fadeOut = Animated.timing(out, { toValue: 0, duration: 200, easing: EASE_OUT, useNativeDriver: true });
    if (reduced) {
      [leafR, leafL, word, tag].forEach((v) => v.setValue(1));
      Animated.sequence([Animated.delay(450), fadeOut]).start(onDone);
      return;
    }
    const sprout = (v: Animated.Value, delay: number) =>
      Animated.timing(v, { toValue: 1, duration: 440, delay, easing: EASE_OUT, useNativeDriver: true });
    const rise = (v: Animated.Value, delay: number) =>
      Animated.timing(v, { toValue: 1, duration: 320, delay, easing: EASE_OUT, useNativeDriver: true });
    Animated.sequence([
      Animated.parallel([sprout(leafR, 80), sprout(leafL, 150), rise(word, 300), rise(tag, 380)]),
      Animated.delay(250),
      fadeOut,
    ]).start(onDone);
  };

  // Segurança: se o layout nunca disparar, o splash nativo não pode prender o usuário.
  useEffect(() => {
    const t = setTimeout(start, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leafStyle = (v: Animated.Value, originY: string) => ({
    opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
    // Cresce a partir da ponta da haste, não do centro do quadro.
    transformOrigin: `50% ${originY}`,
  });
  const riseStyle = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: out }]}
      onLayout={start}
      accessible
      accessibilityLabel="$pendless"
    >
      <View style={styles.mark}>
        <Image source={base} style={styles.layer} />
        <Animated.Image source={leafRight} style={[styles.layer, leafStyle(leafR, '27.3%')]} />
        <Animated.Image source={leafLeft} style={[styles.layer, leafStyle(leafL, '28.5%')]} />
      </View>
      <View style={styles.words}>
        <Animated.View style={riseStyle(word)}>
          <Text style={styles.brandRest} allowFontScaling={false}>
            <Text style={styles.dollar}>$</Text>pendless
          </Text>
        </Animated.View>
        <Animated.View style={riseStyle(tag)}>
          <Text style={styles.tagline} allowFontScaling={false}>Seu dinheiro, em ordem.</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  mark: { width: MARK, height: MARK },
  layer: { position: 'absolute', width: MARK, height: MARK },
  // Fora do fluxo: o ladrilho fica exatamente no centro, como no splash nativo.
  words: { position: 'absolute', top: '50%', marginTop: MARK / 2 + 20, alignItems: 'center' },
  dollar: { fontSize: 34, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  brandRest: { fontSize: 34, fontWeight: '800', color: colors.primaryDark, letterSpacing: -1 },
  tagline: { fontSize: 15, color: colors.textSecondary, marginTop: 2 },
});
