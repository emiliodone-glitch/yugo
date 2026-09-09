import { Audio, type AVPlaybackStatus } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { es } from '@yugo/shared';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/**
 * Reproductor mínimo para el testimonio en audio (RF-PER-12): un botón,
 * los segundos y nada más. Descarga el archivo firmado al pulsar, no antes.
 */
export function VoicePlayer({
  url,
  durationMs,
  label = es.affinity.voice,
}: {
  url: string;
  durationMs?: number;
  label?: string;
}) {
  const sound = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [error, setError] = useState(false);

  useEffect(
    () => () => {
      void sound.current?.unloadAsync();
    },
    [],
  );

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPositionMs(status.positionMillis);
    setPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setPlaying(false);
      setPositionMs(0);
      void sound.current?.setPositionAsync(0);
    }
  };

  const toggle = async () => {
    try {
      if (!sound.current) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const created = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true }, onStatus);
        sound.current = created.sound;
        setPlaying(true);
        return;
      }
      if (playing) await sound.current.pauseAsync();
      else await sound.current.playAsync();
    } catch {
      setError(true);
    }
  };

  const total = Math.max(1, Math.round((durationMs ?? 0) / 1000));
  const shown = playing || positionMs > 0 ? Math.round(positionMs / 1000) : total;

  return (
    <Pressable
      onPress={() => void toggle()}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${playing ? 'pausar' : 'escuchar'}`}
      style={styles.row}
    >
      <View style={styles.button}>
        <Text style={styles.icon}>{playing ? '❚❚' : '▶'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.time}>
          {error ? 'No se pudo reproducir' : es.affinity.voiceSeconds(shown)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.linen,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { color: '#fff', fontSize: 13, fontFamily: fonts.bodySemiBold },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.ink },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
});
