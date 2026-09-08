import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { useReduceMotion } from '../lib/a11y';
import { theme } from '../lib/theme';

const { colors } = theme;

/**
 * Esqueletos de carga: la forma de lo que viene, en vez de «Cargando…».
 * El pulso se apaga cuando el sistema pide reducir el movimiento.
 */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, style, { opacity }]}
    />
  );
}

/** Una tarjeta genérica: título, dos líneas y un pie. */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      <Skeleton style={{ height: 14, width: '50%' }} />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          style={{ height: 12, width: index % 2 ? '66%' : '85%', marginTop: 8 }}
        />
      ))}
      <Skeleton style={{ height: 30, width: 96, marginTop: 12 }} />
    </View>
  );
}

/** Filas con avatar, para conexiones y grupos. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.card}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton style={{ height: 40, width: 40, borderRadius: 20 }} />
          <View style={{ flex: 1 }}>
            <Skeleton style={{ height: 13, width: '35%' }} />
            <Skeleton style={{ height: 11, width: '70%', marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Tarjeta de perfil alta (Descubrir). */
export function ProfileCardSkeleton() {
  return (
    <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
      <Skeleton style={{ height: 300, width: '100%', borderRadius: 0 }} />
      <View style={{ padding: 14 }}>
        <Skeleton style={{ height: 16, width: '50%' }} />
        <Skeleton style={{ height: 12, width: '66%', marginTop: 8 }} />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          <Skeleton style={{ height: 24, width: 64, borderRadius: 999 }} />
          <Skeleton style={{ height: 24, width: 80, borderRadius: 999 }} />
        </View>
      </View>
    </View>
  );
}

/** Pantalla completa: título y varias tarjetas. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 12, gap: 12 }} accessibilityLabel="Cargando">
      <Skeleton style={{ height: 22, width: '40%' }} />
      {Array.from({ length: cards }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </View>
  );
}

/** Conversación: burbujas alternas. */
export function ChatSkeleton() {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 12, gap: 8 }}>
      {[60, 40, 75, 35, 55].map((width, index) => (
        <View key={index} style={{ alignItems: index % 2 ? 'flex-end' : 'flex-start' }}>
          <Skeleton style={{ height: 36, width: `${width}%`, borderRadius: 16 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.linen2, borderRadius: 10 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
