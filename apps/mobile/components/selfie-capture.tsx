import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { es } from '@yugo/shared';
import { Button, Notice, Sub } from './ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

const GESTURE_LABELS: Record<string, string> = {
  SMILE: 'Sonríe',
  TURN_LEFT: 'Gira la cabeza a la izquierda',
  TURN_RIGHT: 'Gira la cabeza a la derecha',
  BLINK_TWICE: 'Parpadea dos veces',
  LOOK_UP: 'Mira hacia arriba',
};

type CameraModule = typeof import('expo-camera');
type CameraViewRef = InstanceType<CameraModule['CameraView']>;

/**
 * `expo-camera` se carga solo cuando hace falta la cámara de verdad. Su
 * módulo web arranca al importarse un worker que descarga el lector de QR de
 * un CDN, y eso rompe la pantalla en web aunque nadie toque la cámara.
 */
let cameraModule: CameraModule | null = null;
function loadCamera(): CameraModule {
  if (!cameraModule) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cameraModule = require('expo-camera') as CameraModule;
  }
  return cameraModule;
}

interface SelfieProps {
  gestures: string[];
  busy?: boolean;
  onUse: (uri: string | null) => void;
}

/**
 * Selfie guiada (RF-VER-01): cámara frontal, los gestos que pide el
 * servidor, una foto, la vista previa y «Usar esta selfie».
 *
 * En modo demo y en web (donde la cámara puede no existir) se simula la
 * captura para que el flujo se pueda recorrer igual; `onUse` recibe `null`
 * y quien llama sabe que no hay archivo que subir.
 */
export function SelfieCapture({
  simulate,
  ...props
}: SelfieProps & {
  /** Sin cámara: la captura se simula y `onUse` recibe `null`. */
  simulate: boolean;
}) {
  return simulate ? <SimulatedSelfie {...props} /> : <LiveSelfie {...props} />;
}

function SimulatedSelfie({ gestures, busy, onUse }: SelfieProps) {
  const [captured, setCaptured] = useState(false);
  return (
    <SelfieFrame
      gestures={gestures}
      busy={busy}
      captured={captured}
      preview={captured ? <View style={[StyleSheet.absoluteFill, styles.simulated]} /> : <View />}
      canTake
      onTake={() => setCaptured(true)}
      onRetake={() => setCaptured(false)}
      onUse={() => onUse(null)}
    />
  );
}

function LiveSelfie({ gestures, busy, onUse }: SelfieProps) {
  const { CameraView, useCameraPermissions } = loadCamera();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraViewRef>(null);
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const take = async () => {
    setError(null);
    try {
      const shot = await camera.current?.takePictureAsync({ quality: 0.8 });
      if (!shot?.uri) throw new Error('no_photo');
      setPhoto(shot.uri);
    } catch {
      setError(es.profile.cameraDenied);
    }
  };

  const denied = !!permission && !permission.granted && !permission.canAskAgain;

  return (
    <SelfieFrame
      gestures={gestures}
      busy={busy}
      captured={photo !== null}
      preview={
        photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : permission?.granted ? (
          <>
            <CameraView
              ref={camera}
              style={StyleSheet.absoluteFill}
              facing="front"
              onCameraReady={() => setReady(true)}
            />
            {!ready ? <Text style={styles.starting}>{es.profile.cameraStarting}</Text> : null}
          </>
        ) : (
          <View />
        )
      }
      canTake={!!permission?.granted && ready}
      error={denied ? es.profile.cameraDenied : error}
      onTake={() => void take()}
      onRetake={() => setPhoto(null)}
      onUse={() => onUse(photo)}
      extra={
        permission && !permission.granted && permission.canAskAgain ? (
          <Button
            label="Permitir la cámara"
            tone="ghost"
            style={{ marginTop: 8 }}
            onPress={() => void requestPermission()}
          />
        ) : null
      }
    />
  );
}

/** El marco, los gestos y los botones; iguales con cámara real o simulada. */
function SelfieFrame({
  gestures,
  busy,
  captured,
  preview,
  canTake,
  error,
  onTake,
  onRetake,
  onUse,
  extra,
}: {
  gestures: string[];
  busy?: boolean;
  captured: boolean;
  preview: React.ReactNode;
  canTake: boolean;
  error?: string | null;
  onTake: () => void;
  onRetake: () => void;
  onUse: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <View>
      <View style={styles.frame}>
        {preview}
        {!captured ? <View style={styles.oval} pointerEvents="none" /> : null}
      </View>

      {error ? <Notice tone="wine" text={error} /> : null}

      {!captured ? (
        <View style={styles.gestures}>
          <Text style={styles.gesturesTitle}>Sigue estos gestos:</Text>
          {gestures.map((gesture, index) => (
            <Text key={gesture} style={styles.gestureItem}>
              {index + 1}. {GESTURE_LABELS[gesture] ?? gesture}
            </Text>
          ))}
        </View>
      ) : null}

      <Sub style={{ fontSize: 11, marginTop: 8 }}>
        Busca buena luz, sin lentes ni gorra. Tu selfie solo la ve el equipo de verificación; nunca
        se muestra en tu perfil.
      </Sub>

      {captured ? (
        <View style={styles.actions}>
          <Button
            label={es.profile.retakeSelfie}
            tone="ghost"
            style={{ flex: 1 }}
            disabled={busy}
            onPress={onRetake}
          />
          <Button
            label={busy ? es.common.loading : es.profile.useThisSelfie}
            tone="olive"
            style={{ flex: 1.4 }}
            disabled={busy}
            onPress={onUse}
          />
        </View>
      ) : (
        <Button
          label={es.profile.takeSelfie}
          tone="olive"
          style={{ marginTop: 12 }}
          disabled={!canTake}
          onPress={onTake}
        />
      )}
      {extra}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 260,
    borderRadius: 16,
    backgroundColor: '#AFA694',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  simulated: { backgroundColor: '#8C8471' },
  oval: {
    width: 130,
    height: 175,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,.6)',
    borderStyle: 'dashed',
  },
  starting: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: '#fff',
  },
  gestures: {
    backgroundColor: colors.wheatSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  gesturesTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.wheatText },
  gestureItem: { fontFamily: fonts.body, fontSize: 12, color: colors.wheatText, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
