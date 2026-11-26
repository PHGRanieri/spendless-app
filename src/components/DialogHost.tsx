import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { DialogAction, DialogOptions, registerDialogPresenter } from './dialogs';
import { EASE_OUT, usePressScale, useReducedMotion } from '../motion';
import { colors, radius, roles, softShadow, space, tint } from '../theme';

interface Pending {
  opts: DialogOptions;
  resolve: (key: string | null) => void;
}

/**
 * Diálogo de confirmação com a identidade do $pendless: cartão de Louça, emoji em
 * círculo tingido, título em Nunito, ações empilhadas em largura total.
 * Entra com fade do véu + cartão de 96%→100% (220ms); sai em 140ms.
 * O resultado só é entregue depois que o modal terminou de fechar, para que a ação
 * seguinte (fechar o formulário, abrir o compartilhamento) não colida com ele no iOS.
 */
export function DialogHost() {
  const [current, setCurrent] = useState<Pending | null>(null);
  const [visible, setVisible] = useState(false);
  const result = useRef<{ resolve: (k: string | null) => void; key: string | null } | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  const flush = useCallback(() => {
    const r = result.current;
    result.current = null;
    setCurrent(null);
    r?.resolve(r.key);
  }, []);

  useEffect(() => {
    registerDialogPresenter(
      (opts) =>
        new Promise((resolve) => {
          // Um diálogo por vez: um pedido novo cancela o anterior.
          result.current?.resolve(null);
          result.current = null;
          fade.setValue(0);
          setCurrent({ opts, resolve });
          setVisible(true);
        }),
    );
    return () => registerDialogPresenter(null);
  }, [fade]);

  useEffect(() => {
    if (visible && current) {
      Animated.timing(fade, { toValue: 1, duration: reduced ? 160 : 220, easing: EASE_OUT, useNativeDriver: true }).start();
    }
  }, [visible, current, fade, reduced]);

  const close = (key: string | null) => {
    if (!current || result.current) return;
    result.current = { resolve: current.resolve, key };
    Animated.timing(fade, { toValue: 0, duration: 140, easing: EASE_OUT, useNativeDriver: true }).start(() => {
      setVisible(false);
      // iOS entrega pelo onDismiss do Modal; Android não tem esse evento.
      if (Platform.OS !== 'ios') setTimeout(flush, 0);
    });
  };

  if (!current) return null;
  const { opts } = current;
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 1 : 0.96, 1] });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => close(null)}
      onDismiss={flush}
    >
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(null)} accessible={false} />
        <Animated.View
          style={[styles.card, { opacity: fade, transform: [{ scale }] }]}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[
              styles.badge,
              { backgroundColor: opts.tone === 'danger' ? tint(colors.expense, 0.1) : colors.softAccent },
            ]}
          >
            <Text allowFontScaling={false} style={styles.emoji}>{opts.emoji}</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">{opts.title}</Text>
          <Text style={styles.message}>{opts.message}</Text>
          <View style={styles.actions}>
            {opts.actions.map((a) => (
              <DialogButton key={a.key} action={a} onPress={() => close(a.style === 'cancel' ? null : a.key)} />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function DialogButton({ action, onPress }: { action: DialogAction; onPress: () => void }) {
  const press = usePressScale({ to: 0.97, inMs: 120, release: { type: 'timing', ms: 160 } });
  const s = BUTTON_STYLES[action.style];
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[styles.button, s.box]}
      >
        <Text style={[styles.buttonText, s.text]}>{action.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const BUTTON_STYLES = {
  primary: { box: { backgroundColor: roles.action }, text: { color: roles.onAction } },
  secondary: { box: { backgroundColor: colors.softAccent }, text: { color: colors.primaryDark } },
  // Brasa com texto branco: 4,83:1. O vermelho cheio fica só para a ação mais forte.
  danger: { box: { backgroundColor: colors.expense }, text: { color: colors.surface } },
  // Tonal: tint de Brasa com Brasa Tostada (5,5:1).
  'danger-soft': { box: { backgroundColor: tint(colors.expense, 0.1) }, text: { color: colors.expenseText } },
  cancel: { box: { backgroundColor: 'transparent' }, text: { color: colors.textSecondary } },
} as const;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: tint(colors.text, 0.45),
    justifyContent: 'center',
    padding: space.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius * 2,
    paddingTop: space.xl,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    ...softShadow,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  emoji: { fontSize: 30 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.sm,
  },
  actions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.xl },
  button: { borderRadius: radius, minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.lg },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
