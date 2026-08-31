/**
 * El otro lado del acompañamiento: lo que ve el matrimonio que acompaña.
 *
 * The whole screen is one honest sentence made visible — you see what stage
 * they are in, and you never see what they write. There is no tab, no
 * "ver conversación", no unread badge, because the API has no endpoint that
 * would answer one.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, type RelationshipStage } from '@yugo/shared';
import {
  useAccompaniedBonds,
  useEnableMentor,
  useMentorProfile,
  useRespondToAccompaniment,
} from '@yugo/app-core';
import { Button, Card, Chip, Field, H, ScreenHeader, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

const stageName = (stage: RelationshipStage) => es.relationship.stages[stage];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });

export default function AccompanyScreen() {
  const { data: profile, isLoading: profileLoading } = useMentorProfile();
  const { data: bonds = [], isLoading } = useAccompaniedBonds();
  const respond = useRespondToAccompaniment();
  const enable = useEnableMentor();

  const [spouseName, setSpouseName] = useState('');
  const [marriedSince, setMarriedSince] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pending = bonds.filter((bond) => bond.status === 'INVITED');
  const active = bonds.filter((bond) => bond.status === 'ACTIVE');

  const enableMentor = () => {
    setError(null);
    enable.mutate(
      {
        spouseName: spouseName.trim() || undefined,
        marriedSince: marriedSince ? Number(marriedSince) : undefined,
        bio: bio.trim() || undefined,
      },
      {
        onError: (cause) => {
          const key = cause instanceof Error ? cause.message : 'generic';
          setError(
            key === 'needs_church_endorsement'
              ? es.accompaniment.mentorNeedsEndorsement
              : es.errors.generic,
          );
        },
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.linen }}>
      <ScreenHeader title={es.accompaniment.mentorTitle} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}>
        <Sub style={{ marginBottom: 12 }}>{es.accompaniment.mentorIntro}</Sub>

        {profileLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 24 }}>{es.common.loading}</Sub>
        ) : profile ? (
          <View style={styles.codeCard}>
            <Text style={styles.codeIntro}>{es.accompaniment.mentorCodeIntro}</Text>
            <Text style={styles.code}>{profile.code}</Text>
            {profile.spouseName ? (
              <Text style={styles.codeIntro}>
                {profile.spouseName}
                {profile.marriedSince
                  ? ` · ${es.accompaniment.marriedSince(profile.marriedSince)}`
                  : ''}
              </Text>
            ) : null}
          </View>
        ) : (
          <Card>
            <H size={13}>{es.accompaniment.mentorEnable}</H>
            <Sub style={{ fontSize: 11, marginTop: 4, marginBottom: 10 }}>
              {es.accompaniment.mentorNeedsEndorsement}
            </Sub>

            <Sub style={{ fontSize: 11, marginBottom: 4 }}>{es.accompaniment.spouseName}</Sub>
            <Field value={spouseName} onChangeText={setSpouseName} autoCapitalize="words" />

            <Sub style={{ fontSize: 11, marginTop: 10, marginBottom: 4 }}>
              {es.accompaniment.marriedSinceLabel}
            </Sub>
            <Field
              value={marriedSince}
              onChangeText={(text) => setMarriedSince(text.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={4}
            />

            <Sub style={{ fontSize: 11, marginTop: 10, marginBottom: 4 }}>
              {es.accompaniment.bioLabel}
            </Sub>
            <Field value={bio} onChangeText={setBio} multiline maxLength={400} />

            <Button
              label={es.accompaniment.mentorEnable}
              style={{ marginTop: 12 }}
              disabled={enable.isPending}
              onPress={enableMentor}
            />
            {error ? (
              <Text style={{ marginTop: 6, fontSize: 11, color: colors.wine }}>{error}</Text>
            ) : null}
          </Card>
        )}

        {pending.map((bond) => (
          <View key={bond.id} style={styles.pendingCard}>
            <Text style={styles.eyebrow}>{es.accompaniment.pendingInvitation}</Text>
            <Text style={styles.names}>{bond.names.join(' y ')}</Text>
            <Sub style={{ fontSize: 11 }}>{bond.churches.filter(Boolean).join(' · ')}</Sub>
            <Sub style={{ fontSize: 11, marginTop: 2 }}>{stageName(bond.stage)}</Sub>
            <View style={styles.actions}>
              <Button
                label={es.accompaniment.accept}
                style={{ flex: 1 }}
                onPress={() => respond.mutate({ id: bond.id, accept: true })}
              />
              <Button
                label={es.accompaniment.decline}
                tone="ghost"
                style={{ flex: 1 }}
                onPress={() => respond.mutate({ id: bond.id, accept: false })}
              />
            </View>
          </View>
        ))}

        {isLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 24 }}>{es.common.loading}</Sub>
        ) : active.length === 0 ? (
          <Card style={{ marginTop: 12 }}>
            <Sub style={{ textAlign: 'center', paddingVertical: 12 }}>
              {es.accompaniment.mentorEmpty}
            </Sub>
          </Card>
        ) : (
          active.map((bond) => (
            <Card key={bond.id} style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.names}>{bond.names.join(' y ')}</Text>
                  <Sub style={{ fontSize: 11 }}>{bond.churches.filter(Boolean).join(' · ')}</Sub>
                </View>
                <Chip label={stageName(bond.stage)} tone="wheat" />
              </View>
              {bond.since ? (
                <Sub style={{ fontSize: 11, marginTop: 6 }}>
                  {es.accompaniment.since(formatDate(bond.since))}
                </Sub>
              ) : null}
            </Card>
          ))
        )}

        {/* Se dice en la pantalla, no solo en la documentación. */}
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{es.accompaniment.neverSeesChat}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  codeCard: { backgroundColor: colors.oliveSoft, borderRadius: 18, padding: 14, marginBottom: 12 },
  codeIntro: { fontFamily: fonts.body, fontSize: 11, color: colors.oliveText },
  code: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    color: colors.ink,
    marginVertical: 4,
  },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.wheat,
    padding: 14,
    marginTop: 12,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.wheatText,
    marginBottom: 4,
  },
  names: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  notice: { backgroundColor: colors.oliveSoft, borderRadius: 12, padding: 12, marginTop: 14 },
  noticeText: { fontFamily: fonts.body, fontSize: 11, color: colors.oliveText, lineHeight: 16 },
});
