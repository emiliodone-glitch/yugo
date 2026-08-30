import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { Button, Chip, YugoMark } from '../components/ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

/** Bienvenida — the promise in one sentence (mockup 1). */
export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <YugoMark size={54} />
        <Text style={styles.headline}>Conoce a alguien{'\n'}que ya ora{'\n'}como tú.</Text>
        <Text style={styles.sub}>{es.welcome.sub}</Text>
      </View>
      <View>
        <View style={styles.chips}>
          <Chip label={es.welcome.chipVerified} tone="inverse" />
          <Chip label={es.welcome.chipAdults} tone="inverse" />
        </View>
        <Button label={es.welcome.createProfile} tone="wheat" onPress={() => router.push('/registro')} />
        <Button
          label={es.welcome.haveAccount}
          tone="ghost-light"
          style={{ marginTop: 8 }}
          onPress={() => router.push('/entrar')}
        />
        <Text style={styles.social}>{es.welcome.socialHint}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingHorizontal: 22,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  top: { marginTop: 12 },
  headline: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginTop: 18,
  },
  sub: { color: colors.inkMuted, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  social: {
    textAlign: 'center',
    color: colors.inkMuted2,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 12,
  },
});
