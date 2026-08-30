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
import { theme } from '../lib/theme';
import { Providers } from '../lib/providers';

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
    <Providers>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.linen },
        }}
      />
    </Providers>
  );
}
