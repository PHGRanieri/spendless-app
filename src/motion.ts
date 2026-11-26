import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutAnimation } from 'react-native';

/** Curva padrão: sai rápido e assenta suave. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion = v), () => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => (reduceMotion = v));

/** "Reduzir movimento" ligado no aparelho: troca escala/deslocamento por fades curtos ou nada. */
export function useReducedMotion(): boolean {
  const [value, setValue] = useState(reduceMotion);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setValue(v), () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setValue);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return value;
}

/**
 * Feedback de toque por escala. `release` define como volta: mola rápida ou timing.
 * Com "reduzir movimento", não escala (o componente mantém o feedback de opacidade).
 */
export function usePressScale(opts: {
  to: number;
  inMs: number;
  release: { type: 'spring'; tension: number; friction: number } | { type: 'timing'; ms: number };
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  const onPressIn = () => {
    if (reduced) return;
    Animated.timing(scale, { toValue: opts.to, duration: opts.inMs, easing: EASE_OUT, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    if (reduced) return;
    const r = opts.release;
    (r.type === 'spring'
      ? Animated.spring(scale, { toValue: 1, tension: r.tension, friction: r.friction, useNativeDriver: true })
      : Animated.timing(scale, { toValue: 1, duration: r.ms, easing: EASE_OUT, useNativeDriver: true })
    ).start();
  };
  return { style: { transform: [{ scale }] }, onPressIn, onPressOut };
}

/**
 * Faz a próxima mudança de layout (item incluído/excluído) acontecer com fade
 * em vez de salto. Chamar logo ANTES de gravar.
 */
export function animateNextLayout(): void {
  if (reduceMotion) return;
  LayoutAnimation.configureNext({
    duration: 200,
    create: { type: 'easeInEaseOut', property: 'opacity' },
    update: { type: 'easeInEaseOut' },
    delete: { type: 'easeInEaseOut', property: 'opacity' },
  });
}
