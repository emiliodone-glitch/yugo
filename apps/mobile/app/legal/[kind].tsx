import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COVENANT_V1, PRIVACY_V1, TERMS_V1 } from '@yugo/shared';
import { Card, ScreenHeader, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

/** In-app legal documents (RF-ADM-10, RF-SEG-08); the stores link here too. */
const DOCUMENTS = {
  terminos: {
    title: 'Términos de servicio',
    version: TERMS_V1.version,
    sections: TERMS_V1.sections,
    footnote: null as string | null,
  },
  privacidad: {
    title: 'Política de privacidad',
    version: PRIVACY_V1.version,
    sections: PRIVACY_V1.sections,
    footnote: PRIVACY_V1.law,
  },
  pacto: {
    title: 'Pacto de conducta',
    version: COVENANT_V1.version,
    sections: COVENANT_V1.points.map((point, index) => ({
      title: `Compromiso ${index + 1}`,
      body: point,
    })),
    footnote:
      'Aceptar el pacto es obligatorio para usar Yugo. Si publicamos una versión nueva, te pediremos aceptarla otra vez.',
  },
} as const;

export default function LegalScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const document = DOCUMENTS[kind as keyof typeof DOCUMENTS];

  if (!document) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title="Documento" />
        <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>
          Ese documento no existe.
        </Sub>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title={document.title} />
      <ScrollView contentContainerStyle={styles.container}>
        <Sub style={{ marginBottom: 14 }}>
          Versión {document.version} · República Dominicana
        </Sub>

        {document.sections.map((section) => (
          <View key={section.title} style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}

        {document.footnote ? (
          <Card style={{ backgroundColor: colors.linen2, borderWidth: 0 }}>
            <Sub style={{ fontSize: 11 }}>{document.footnote}</Sub>
          </Card>
        ) : null}

        <Sub style={{ textAlign: 'center', fontSize: 11 }}>privacidad@yugo.do</Sub>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginBottom: 4 },
  body: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: colors.text },
});
