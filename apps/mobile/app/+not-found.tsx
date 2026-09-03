import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { Button, YugoMark } from '../components/ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/**
 * Ruta no encontrada. Sin esta pantalla, expo-router muestra su página por
 * defecto en inglés («Unmatched Route») cuando una notificación o un enlace
 * apunta a algo que ya no existe: una conexión cerrada, un evento borrado.
 */
export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <YugoMark size={40} />
        <Text style={styles.title}>{es.notFound.title}</Text>
        <Text style={styles.body}>{es.notFound.body}</Text>
        <Button label={es.notFound.home} tone="wheat" onPress={() => router.replace('/inicio')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, justifyContent: 'center', paddingHorizontal: 22 },
  card: { gap: 14 },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 28, lineHeight: 32, marginTop: 8 },
  body: { color: colors.inkMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
});
