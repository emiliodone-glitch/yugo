import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { intlLocale } from '@yugo/shared';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/** Una hora en punto como la lee es-DO: «10:00 p. m.». */
export function hourLabel(hour: number): string {
  return new Intl.DateTimeFormat(intlLocale(), {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(2026, 0, 1, hour, 0));
}

const CHIP_WIDTH = 84;

/**
 * Selector de hora: las veinticuatro en una fila, la elegida resaltada.
 *
 * Con un lector de pantalla la fila entera es un control «ajustable»: subir
 * y bajar cambian la hora sin tener que recorrer veinticuatro botones.
 */
export function HourPicker({
  value,
  onChange,
  label,
  hours = Array.from({ length: 24 }, (_, hour) => hour),
}: {
  value: number | null;
  onChange: (hour: number) => void;
  label: string;
  /** Subconjunto de horas ofrecidas (por defecto, 0–23). */
  hours?: number[];
}) {
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (value === null) return;
    const index = hours.indexOf(value);
    if (index < 0) return;
    scroll.current?.scrollTo({ x: Math.max(0, (index - 1) * (CHIP_WIDTH + 6)), animated: false });
  }, [hours, value]);

  const step = (delta: number) => {
    const index = value === null ? -1 : hours.indexOf(value);
    const next = hours[Math.min(hours.length - 1, Math.max(0, index + delta))];
    if (next !== undefined && next !== value) onChange(next);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: value === null ? undefined : hourLabel(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') step(1);
        if (event.nativeEvent.actionName === 'decrement') step(-1);
      }}
    >
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {hours.map((hour) => {
          const active = hour === value;
          return (
            <Pressable
              key={hour}
              onPress={() => onChange(hour)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {hourLabel(hour)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6, paddingVertical: 2 },
  chip: {
    width: CHIP_WIDTH,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.text },
  chipTextActive: { color: '#fff', fontFamily: fonts.bodySemiBold },
});
