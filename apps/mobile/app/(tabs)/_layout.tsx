import { Tabs } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { theme } from '../../lib/theme';
import { scaled, useFontScale } from '../../lib/a11y';

const { colors, fonts } = theme;

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11l9-8 9 8v10H3z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}
function DiscoverIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M15 9l-2 6-4 2 2-6z" fill={color} />
    </Svg>
  );
}
function ChatIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h16v11H9l-5 4z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}
function GroupIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.5} stroke={color} strokeWidth={1.8} />
      <Circle cx={17} cy={10} r={2.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M3 20c0-4 3-6 6-6s6 2 6 6M15 19c0-3 2-5 5-4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={16} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export default function TabsLayout() {
  // RNF-05: la barra crece con el texto del sistema en vez de recortar las
  // etiquetas.
  const fontScale = useFontScale();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 10 },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: colors.line,
          height: scaled(64, fontScale),
          paddingBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <HomeIcon color={color} /> }}
      />
      <Tabs.Screen
        name="descubrir"
        options={{ title: 'Descubrir', tabBarIcon: ({ color }) => <DiscoverIcon color={color} /> }}
      />
      <Tabs.Screen
        name="conexiones"
        options={{ title: 'Conexiones', tabBarIcon: ({ color }) => <ChatIcon color={color} /> }}
      />
      <Tabs.Screen
        name="comunidad"
        options={{ title: 'Comunidad', tabBarIcon: ({ color }) => <GroupIcon color={color} /> }}
      />
      <Tabs.Screen
        name="eventos"
        options={{ title: 'Eventos', tabBarIcon: ({ color }) => <CalendarIcon color={color} /> }}
      />
    </Tabs>
  );
}
