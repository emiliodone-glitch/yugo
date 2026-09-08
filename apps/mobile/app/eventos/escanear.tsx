import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { es } from '@yugo/shared';
import { checkInTokenFrom, useCheckIn } from '@yugo/app-core';
import { Button, Notice, ScreenHeader, Sub } from '../../components/ui';
import { DEMO_MODE, errorMessage } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/**
 * Registrar mi asistencia (RF-EVE-06): la persona escanea el QR que la
 * iglesia puso en la entrada. Antes la app mostraba un dibujo que parecía
 * un QR y no había nadie que lo leyera; ahora el QR está en la puerta y la
 * app es la que lee.
 */
export default function ScanCheckInScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const checkIn = useCheckIn();
  const [result, setResult] = useState<{ title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const handle = async (data: string) => {
    if (busy.current || result) return;
    const token = checkInTokenFrom(data);
    if (!token) {
      setError('Ese código no es de un evento de Yugo. Busca el QR de la entrada.');
      return;
    }
    busy.current = true;
    setError(null);
    try {
      const done = await checkIn.mutateAsync(token);
      setResult({ title: done.eventTitle });
    } catch (caught) {
      setError(
        /invalid_qr/.test(errorMessage(caught))
          ? 'El código no corresponde a ningún evento publicado. Pide a la iglesia que revise el QR.'
          : errorMessage(caught),
      );
      busy.current = false;
    }
  };

  const back = () => {
    if (eventId) router.replace({ pathname: '/eventos/[id]', params: { id: eventId } });
    else router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.events.checkIn} />
      <View style={styles.container}>
        {result ? (
          <View style={styles.center}>
            <Text style={styles.big}>✓</Text>
            <Text style={styles.title}>¡Asistencia registrada!</Text>
            <Sub style={{ textAlign: 'center', marginTop: 6 }}>
              {result.title}. La iglesia solo ve el total de asistentes, nunca tu nombre.
            </Sub>
            <Button
              label={es.common.continue}
              tone="olive"
              style={{ marginTop: 20 }}
              onPress={back}
            />
          </View>
        ) : DEMO_MODE || manual ? (
          <View style={styles.center}>
            <Sub style={{ textAlign: 'center' }}>
              {DEMO_MODE
                ? 'En modo demo no hay cámara: el registro se simula.'
                : 'Sin cámara. Pídele a la iglesia el código escrito bajo el QR.'}
            </Sub>
            <Button
              label="Registrar asistencia"
              tone="olive"
              style={{ marginTop: 16 }}
              onPress={() => void handle('demo-check-in-token')}
            />
          </View>
        ) : !permission ? (
          <Sub style={{ textAlign: 'center' }}>{es.common.loading}</Sub>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Sub style={{ textAlign: 'center' }}>
              Necesitamos la cámara solo para leer el QR de la entrada. No guardamos ninguna imagen.
            </Sub>
            <Button
              label="Permitir la cámara"
              tone="olive"
              style={{ marginTop: 16 }}
              onPress={() => void requestPermission()}
            />
            <Button
              label="No tengo cámara"
              tone="ghost"
              style={{ marginTop: 8 }}
              onPress={() => setManual(true)}
            />
          </View>
        ) : (
          <>
            <View style={styles.cameraFrame}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => void handle(data)}
              />
              <View style={styles.reticle} pointerEvents="none" />
            </View>
            <Sub style={{ textAlign: 'center', marginTop: 14 }}>
              Apunta al QR de la entrada. Se registra una sola vez por evento.
            </Sub>
            {checkIn.isPending ? (
              <Sub style={{ textAlign: 'center', marginTop: 8 }}>Registrando…</Sub>
            ) : null}
          </>
        )}
        {error ? (
          <View style={{ marginTop: 12 }}>
            <Notice tone="wine" text={error} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  cameraFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    marginTop: 8,
  },
  reticle: {
    position: 'absolute',
    left: '15%',
    top: '15%',
    width: '70%',
    height: '70%',
    borderWidth: 2,
    borderColor: colors.wheat,
    borderRadius: 18,
  },
  big: { fontFamily: fonts.display, fontSize: 56, color: colors.olive },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginTop: 4 },
});
