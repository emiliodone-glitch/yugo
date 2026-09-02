/* eslint-disable @typescript-eslint/no-var-requires */
// Todo en modo demo: las pantallas se montan con las fixtures compartidas,
// que es exactamente lo que ve quien revisa el APK sin infraestructura.
//
// Con YUGO_TEST_LIVE=1 se apagan las fixtures y las pantallas hablan con la
// API de EXPO_PUBLIC_API_URL sin sesión: todo responde 401 y la app tiene que
// quedarse en pie igual. Es la prueba de «se abre sin servidor ni cuenta».
process.env.EXPO_PUBLIC_DEMO_MODE = process.env.YUGO_TEST_LIVE ? 'false' : 'true';

// La 4.10.5 no trae `jest/mock`; sin este mock, SafeAreaView llega undefined
// y las 32 pantallas fallan con «Element type is invalid».
jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const Passthrough = ({ children }: { children?: unknown }) =>
    R.createElement(R.Fragment, null, children ?? null);
  return {
    SafeAreaProvider: Passthrough,
    SafeAreaView: View,
    SafeAreaInsetsContext: R.createContext(insets),
    SafeAreaFrameContext: R.createContext(frame),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(),
  isLoaded: () => true,
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  setNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { DEFAULT: 3 },
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri: string) => ({ uri, width: 1, height: 1 })),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-linking', () => ({
  openURL: jest.fn(async () => true),
  createURL: (path: string) => `yugo://${path}`,
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} }, easConfig: undefined },
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

// expo-router: navegación inerte y parámetros configurables por prueba. Las
// fábricas de jest.mock no pueden tocar variables de fuera, así que React y el
// estado de los parámetros se resuelven dentro, en el momento de la carga.
(globalThis as Record<string, unknown>).__routeParams = {};
(globalThis as Record<string, unknown>).__setRouteParams = (params: Record<string, string>) => {
  (globalThis as Record<string, unknown>).__routeParams = params;
};
jest.mock('expo-router', () => {
  const R = require('react');
  const params = () => (globalThis as Record<string, unknown>).__routeParams as Record<string, string>;
  const Passthrough = ({ children }: { children?: unknown }) =>
    R.createElement(R.Fragment, null, children ?? null);
  const Screen = () => null;
  const Stack = Object.assign(Passthrough, { Screen });
  const Tabs = Object.assign(Passthrough, { Screen });
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: params,
    useGlobalSearchParams: params,
    usePathname: () => '/',
    useSegments: () => [],
    useFocusEffect: (cb: () => void) => R.useEffect(cb, []),
    Link: Passthrough,
    Redirect: () => null,
    Stack,
    Tabs,
    Slot: Passthrough,
  };
});

// El `Animated` de RN avisa por el driver nativo en Jest; silencio solo eso.
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });
