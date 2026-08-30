import React from 'react';
import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { avatarColor } from '@yugo/ui-tokens';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

export function YugoMark({ size = 44, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <Circle cx={14} cy={27} r={8} stroke={color} strokeWidth={3} />
      <Circle cx={30} cy={27} r={8} stroke={color} strokeWidth={3} />
      <Path d="M6 20c4-11 28-11 32 0" stroke={colors.wheat} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckMark({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12l5 5L20 7"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AvatarCircle({
  name,
  size = 46,
  highlight,
}: {
  name: string;
  size?: number;
  highlight?: boolean;
}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: avatarColor(name),
        },
        highlight ? { borderWidth: 3, borderColor: colors.wheat } : null,
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/** Affinity ring drawn with an SVG arc (conic gradient equivalent). */
export function AffinityRing({ value, size = 52 }: { value: number; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.linen2} strokeWidth={stroke} fill="#fff" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.olive}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${(circumference * value) / 100} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: size * 0.26, color: colors.ink }}>{value}</Text>
    </View>
  );
}

export function Chip({
  label,
  tone = 'default',
  style,
  onPress,
}: {
  label: string;
  tone?: 'default' | 'olive' | 'wheat' | 'wine' | 'inverse';
  style?: ViewStyle;
  /** Makes the chip a filter toggle; without it the chip is just a label. */
  onPress?: () => void;
}) {
  const tones = {
    default: { bg: colors.linen2, fg: colors.ink },
    olive: { bg: colors.oliveSoft, fg: colors.oliveText },
    wheat: { bg: colors.wheatSoft, fg: colors.wheatText },
    wine: { bg: colors.wineSoft, fg: colors.wine },
    inverse: { bg: 'rgba(255,255,255,.12)', fg: '#fff' },
  }[tone];
  const content = (
    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: tones.fg }}>{label}</Text>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: tones.bg, opacity: pressed ? 0.8 : 1 },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={[styles.chip, { backgroundColor: tones.bg }, style]}>{content}</View>;
}

export function Button({
  label,
  onPress,
  tone = 'ink',
  small,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: 'ink' | 'olive' | 'wheat' | 'ghost' | 'ghost-light';
  small?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const background =
    tone === 'olive' ? colors.olive : tone === 'wheat' ? colors.wheat : tone === 'ink' ? colors.ink : 'transparent';
  const textColor =
    tone === 'wheat' ? colors.inkDeep : tone === 'ghost' ? colors.ink : tone === 'ghost-light' ? '#fff' : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small ? styles.buttonSmall : null,
        { backgroundColor: background, opacity: disabled ? 0.6 : pressed ? 0.85 : 1 },
        tone === 'ghost' ? { borderWidth: 1.5, borderColor: colors.ink } : null,
        tone === 'ghost-light' ? { borderWidth: 1.5, borderColor: 'rgba(255,255,255,.4)' } : null,
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemiBold,
          fontSize: small ? 12 : 14,
          color: textColor,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ value, style }: { value: number; style?: ViewStyle }) {
  return (
    <View style={[styles.barTrack, style]}>
      <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, value))}%` }]} />
    </View>
  );
}

export function H({ children, size = 19, style }: { children: React.ReactNode; size?: number; style?: object }) {
  return (
    <Text style={[{ fontFamily: fonts.display, fontSize: size, color: colors.ink, letterSpacing: -0.2 }, style]}>
      {children}
    </Text>
  );
}

export function Sub({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: object;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 17 }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: fonts.display },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
  },
  buttonSmall: {
    width: 'auto',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  card: {
    backgroundColor: '#fff',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  barTrack: { height: 6, borderRadius: 6, backgroundColor: colors.linen2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6, backgroundColor: colors.olive },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.linen2,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segmentItemActive: { backgroundColor: '#fff' },
  notice: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  yugoLink: { alignItems: 'center', marginVertical: 12, height: 62 },
  yugoLinkAvatars: { flexDirection: 'row', gap: 88, marginTop: 6 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});

// ---------------------------------------------------------------------------
// Screen chrome and form controls shared by the secondary screens
// ---------------------------------------------------------------------------

/** Title row with a back arrow, the native counterpart of the web PageHeader. */
export function ScreenHeader({
  title,
  right,
  onBack,
}: {
  title: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={styles.screenHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={onBack ?? (() => router.back())}
        style={styles.backButton}
      >
        <Text style={{ fontSize: 20, color: colors.ink, lineHeight: 22 }}>‹</Text>
      </Pressable>
      <H size={17} style={{ flex: 1 }}>
        {title}
      </H>
      {right}
    </View>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  maxLength,
  multiline,
  centered,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  multiline?: boolean;
  centered?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
      multiline={multiline}
      style={[
        styles.field,
        multiline ? { height: 84, textAlignVertical: 'top' } : null,
        centered ? { textAlign: 'center', letterSpacing: 3 } : null,
        style,
      ]}
    />
  );
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <Switch
      value={on}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ true: colors.olive, false: '#D5D2C8' }}
      thumbColor="#fff"
    />
  );
}

/** Segmented control; the native equivalent of the web tabs. */
export function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <View style={styles.segment}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segmentItem, active ? styles.segmentItemActive : null]}
          >
            <Text
              style={{
                fontFamily: active ? fonts.bodySemiBold : fonts.bodyMedium,
                fontSize: 12,
                color: active ? colors.ink : colors.muted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Inline feedback: success in olive, warning in wheat, error in wine. */
export function Notice({
  text,
  tone = 'olive',
}: {
  text: string;
  tone?: 'olive' | 'wheat' | 'wine';
}) {
  const tones = {
    olive: { bg: colors.oliveSoft, fg: colors.oliveText },
    wheat: { bg: colors.wheatSoft, fg: colors.wheatText },
    wine: { bg: colors.wineSoft, fg: colors.wine },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: tones.bg }]}>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: tones.fg }}>
        {text}
      </Text>
    </View>
  );
}

/** One component of the affinity breakdown. */
export function ScoreBar({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text }}>
          {label}
        </Text>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink }}>{value}</Text>
      </View>
      <ProgressBar value={value} style={{ marginTop: 5 }} />
      {note ? <Sub style={{ fontSize: 11, marginTop: 4 }}>{note}</Sub> : null}
    </View>
  );
}

/** The signature: two avatars joined by the yoke arc. */
export function YugoLink({ nameA, nameB }: { nameA: string; nameB: string }) {
  return (
    <View style={styles.yugoLink}>
      <Svg width={200} height={34} viewBox="0 0 200 34" style={{ position: 'absolute', top: 2 }}>
        <Path
          d="M28 26C50 2 150 2 172 26"
          stroke={colors.wheat}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <View style={styles.yugoLinkAvatars}>
        <AvatarCircle name={nameA} size={54} />
        <AvatarCircle name={nameB} size={54} />
      </View>
    </View>
  );
}

/**
 * Deterministic QR matrix for the event check-in (RF-EVE-06). The real token
 * is encoded server-side; this renders the same shape offline.
 */
export function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const cells = 21;
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  const cell = size / cells;

  const isFinder = (row: number, col: number): boolean | null => {
    const inBox = (r0: number, c0: number) => row >= r0 && row < r0 + 7 && col >= c0 && col < c0 + 7;
    const onRing = (r0: number, c0: number) => {
      const dr = row - r0;
      const dc = col - c0;
      return dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
    };
    if (inBox(0, 0)) return onRing(0, 0);
    if (inBox(0, cells - 7)) return onRing(0, cells - 7);
    if (inBox(cells - 7, 0)) return onRing(cells - 7, 0);
    return null;
  };

  const modules: React.ReactNode[] = [];
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const finder = isFinder(row, col);
      const filled =
        finder !== null
          ? finder
          : ((hash >> ((row * cells + col) % 31)) ^ (row * 7 + col * 13)) % 3 === 0;
      if (!filled) continue;
      modules.push(
        <Rect
          key={`${row}-${col}`}
          x={col * cell}
          y={row * cell}
          width={cell}
          height={cell}
          fill={colors.ink}
        />,
      );
    }
  }

  return (
    <Svg
      width={size}
      height={size}
      accessibilityRole="image"
      accessibilityLabel="Código QR de check-in"
    >
      <Rect width={size} height={size} fill="#fff" />
      {modules}
    </Svg>
  );
}

/** Tappable settings / navigation row with a chevron. */
export function ListRow({
  label,
  hint,
  onPress,
  right,
}: {
  label: string;
  hint?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.listRow} onPress={onPress} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text }}>
          {label}
        </Text>
        {hint ? <Sub style={{ fontSize: 11, marginTop: 2 }}>{hint}</Sub> : null}
      </View>
      {right ?? <Text style={{ color: colors.muted, fontSize: 16 }}>›</Text>}
    </Pressable>
  );
}
