import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { Providers } from '../lib/providers';
import { useIsOnline } from '../lib/offline';
import { OfflineBanner } from '../components/ui';

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
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.linen }}>
      <OfflineBanner visible={!online} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.linen },
        }}
      />
    </View>
  );
}
