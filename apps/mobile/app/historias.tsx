/**
 * Historias.
 *
 * Parejas que se conocieron aquí y se casaron. Cada una nombra su iglesia,
 * porque una historia que nadie puede comprobar es publicidad y una que una
 * congregación respalda es una razón para confiar.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es } from '@yugo/shared';
import { useStories } from '@yugo/app-core';
import { Card, ScreenHeader, Sub } from '../components/ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));

export default function StoriesScreen() {
  const { data: stories = [], isLoading } = useStories();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.linen }}>
      <ScreenHeader title={es.stories.title} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}>
        <Sub style={{ marginBottom: 12 }}>{es.stories.subtitle}</Sub>

        {isLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 32 }}>{es.common.loading}</Sub>
        ) : stories.length === 0 ? (
          <Card>
            <Sub style={{ textAlign: 'center', paddingVertical: 16 }}>{es.stories.empty}</Sub>
          </Card>
        ) : (
          stories.map((story) => (
            <Card key={story.id} style={{ marginBottom: 12 }}>
              <Text style={styles.names}>{story.names}</Text>
              <Sub style={{ fontSize: 11, marginTop: 2 }}>
                {es.stories.marriedOn(formatDate(story.marriedAt))}
                {story.city ? ` · ${story.city}` : ''}
              </Sub>
              <Text style={styles.body}>{story.body}</Text>
              {/* La iglesia por testigo. */}
              <View style={styles.witness}>
                <Text style={styles.witnessText}>{es.stories.witness(story.churchNames)}</Text>
              </View>
            </Card>
          ))
        )}

        <Sub style={{ textAlign: 'center', fontSize: 11, marginTop: 12 }}>
          {es.stories.consentNotice}
        </Sub>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  names: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  body: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.text,
    marginTop: 10,
  },
  witness: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 10,
    paddingTop: 8,
  },
  witnessText: { fontFamily: fonts.body, fontSize: 11, color: colors.oliveText },
});
