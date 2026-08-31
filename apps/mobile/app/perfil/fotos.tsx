import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, LIMITS } from '@yugo/shared';
import { useDeletePhoto, useMyPhotos, useUploadPhoto } from '@yugo/app-core';
import { Button, Card, Chip, Notice, ScreenHeader, Sub } from '../../components/ui';
import { DEMO_MODE, errorMessage } from '../../lib/api';
import { pickPhoto } from '../../lib/photos';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

const MODERATION_COPY: Record<string, { label: string; tone: 'olive' | 'wheat' | 'wine' }> = {
  PENDING: { label: 'En revisión', tone: 'wheat' },
  APPROVED: { label: 'Publicada', tone: 'olive' },
  HELD: { label: 'En revisión manual', tone: 'wheat' },
  REJECTED: { label: 'No aprobada', tone: 'wine' },
};

/** RF-PER-02: entre 2 y 6 fotos, todas moderadas antes de publicarse. */
export default function PhotosScreen() {
  const { data: photos = [], isLoading } = useMyPhotos();
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const [error, setError] = useState<string | null>(null);

  const add = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const picked = await pickPhoto(source);
      if (!picked) return;
      await upload.mutateAsync({
        blob: picked.blob,
        contentType: picked.contentType,
        position: photos.length,
      });
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === 'permission_denied'
          ? source === 'camera'
            ? 'Necesitamos permiso para usar la cámara.'
            : 'Necesitamos permiso para ver tus fotos.'
          : errorMessage(caught),
      );
    }
  };

  const confirmRemove = (photoId: string) =>
    Alert.alert('Quitar foto', '¿Seguro que quieres quitarla de tu perfil?', [
      { text: es.common.cancel, style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => remove.mutate(photoId) },
    ]);

  const canAddMore = photos.length < LIMITS.PHOTOS_MAX;
  const missing = Math.max(0, LIMITS.PHOTOS_MIN - photos.length);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={es.onboarding.photosTitle} />
      <ScrollView contentContainerStyle={styles.container}>
        <Sub style={{ marginBottom: 12 }}>{es.onboarding.photosSub}</Sub>

        {missing > 0 ? (
          <Notice
            tone="wheat"
            text={`Te ${
              missing === 1 ? 'falta 1 foto' : `faltan ${missing} fotos`
            } para el mínimo de ${LIMITS.PHOTOS_MIN}. Sin ellas tu perfil no aparece en Descubrir.`}
          />
        ) : null}

        {error ? <Notice tone="wine" text={error} /> : null}

        {DEMO_MODE ? (
          <Notice
            tone="wheat"
            text="En modo demo las fotos no se suben a ningún servidor: ves el flujo completo sin guardar nada."
          />
        ) : null}

        {isLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 24 }}>{es.common.loading}</Sub>
        ) : (
          <View style={styles.grid}>
            {photos.map((photo, index) => {
              const state = MODERATION_COPY[photo.moderationStatus] ?? MODERATION_COPY.PENDING;
              return (
                <View key={photo.id} style={styles.cell}>
                  <View style={styles.frame}>
                    {photo.url && photo.moderationStatus !== 'REJECTED' ? (
                      <Image
                        source={{ uri: photo.url }}
                        style={styles.image}
                        accessibilityLabel={
                          index === 0 ? 'Tu foto principal' : `Tu foto ${index + 1}`
                        }
                      />
                    ) : (
                      <View style={styles.emptyFrame} />
                    )}
                    {index === 0 ? (
                      <View style={styles.mainBadge}>
                        <Text style={styles.mainBadgeText}>Principal</Text>
                      </View>
                    ) : null}
                  </View>
                  <Chip label={state.label} tone={state.tone} style={{ marginTop: 6 }} />
                  <Pressable onPress={() => confirmRemove(photo.id)}>
                    <Text style={styles.removeText}>Quitar</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {canAddMore ? (
          <Card style={{ marginTop: 12 }}>
            <Button
              label={upload.isPending ? 'Subiendo…' : 'Tomar una foto'}
              tone="olive"
              disabled={upload.isPending}
              onPress={() => add('camera')}
            />
            <Button
              label="Elegir de la galería"
              tone="ghost"
              style={{ marginTop: 8 }}
              disabled={upload.isPending}
              onPress={() => add('library')}
            />
          </Card>
        ) : null}

        <Sub style={{ fontSize: 11, marginTop: 10 }}>
          {photos.length} de {LIMITS.PHOTOS_MAX}. Recortamos al cuadrado en tu teléfono, así ves
          exactamente el encuadre que verán los demás. Cada foto pasa por moderación antes de
          publicarse.
        </Sub>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '30%', alignItems: 'center' },
  frame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.linen2,
  },
  image: { width: '100%', height: '100%' },
  emptyFrame: { flex: 1, backgroundColor: colors.linen2 },
  mainBadge: {
    position: 'absolute',
    left: 4,
    top: 4,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mainBadgeText: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 9 },
  removeText: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.muted,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});
