import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { PrayerWall } from '../../components/devotional';
import { ScreenHeader } from '../../components/ui';

/**
 * El muro de oración de toda la comunidad.
 *
 * Las peticiones vivían enterradas dentro de un grupo: solo oraba por ellas
 * quien ya estaba adentro, que casi siempre es quien menos necesitaba que le
 * contaran.
 */
export default function PrayerScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScreenHeader title={es.prayer.title} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        <PrayerWall />
      </ScrollView>
    </SafeAreaView>
  );
}
