import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { Providers } from '../lib/providers';
import { useIsOnline } from '../lib/offline';
import { startMonitoring } from '../lib/monitoring';
import { loadLocale, useLocale } from '../lib/locale';
import { OfflineBanner } from '../components/ui';

// Antes del primer render: un error al montar también tiene que llegar.
startMonitoring();
// El idioma guardado (o el del sistema) antes de que se vea la primera pantalla.
void loadLocale();

/**
 * Accesibilidad: la letra sigue el tamaño del sistema (allowFontScaling) con
 * un tope de 1.6× para que las tarjetas no se rompan con el tamaño máximo de
 * iOS/Android. Se fija una vez, para todos los textos de la app.
 */
type TextWithDefaults = typeof Text & { defaultProps?: Record<string, unknown> };
type InputWithDefaults = typeof TextInput & { defaultProps?: Record<string, unknown> };
(Text as TextWithDefaults).defaultProps = {
  ...((Text as TextWithDefaults).defaultProps ?? {}),
  allowFontScaling: true,
  maxFontSizeMultiplier: 1.6,
};
(TextInput as InputWithDefaults).defaultProps = {
  ...((TextInput as InputWithDefaults).defaultProps ?? {}),
  allowFontScaling: true,
  maxFontSizeMultiplier: 1.6,
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    // DM Sans variable font covers 600 via 500/700 nearest weights on native.
    DMSans_600SemiBold: DMSans_500Medium,
    DMSans_700Bold,
  });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.colors.ink }} />;

  return (
    <SafeAreaProvider>
      <Providers>
        <StatusBar style="dark" />
        <Shell />
      </Providers>
    </SafeAreaProvider>
  );
}

/** Inside Providers so it can read the connectivity React Query tracks. */
function Shell() {
  const online = useIsOnline();
  // Cambiar de idioma vuelve a montar la navegación: todas las pantallas
  // leen sus textos al pintarse, así que es la forma segura de que ninguna
  // quede a medias.
  const locale = useLocale();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.linen }}>
      <OfflineBanner visible={!online} />
      <Stack
        key={locale}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.linen },
        }}
      />
    </View>
  );
}
