import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { DevotionalCard } from '../../components/devotional';
import { ScreenHeader } from '../../components/ui';

/**
 * El devocional completo, con la reflexión propia y las de la congregación.
 *
 * Tiene pantalla propia y no solo una tarjeta en Inicio porque leerlo con
 * calma es la actividad, no un trámite antes de ver sugerencias.
 */
export default function DevotionalScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScreenHeader title={es.devotional.title} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        <DevotionalCard />
      </ScrollView>
    </SafeAreaView>
  );
}
