import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, type GroupSummary } from '@yugo/shared';
import { useGroups, useJoinGroup } from '@yugo/app-core';
import { AvatarCircle, Button, Card, Chip, H, Notice, Segment, Sub } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

type Tab = 'mine' | 'suggested';

export default function CommunityScreen() {
  const { data, isLoading } = useGroups();
  const joinGroup = useJoinGroup();
  const [tab, setTab] = useState<Tab>('mine');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = (tab === 'mine' ? data?.mine : data?.suggested) ?? [];

  const join = async (group: GroupSummary) => {
    setError(null);
    setNotice(null);
    try {
      const result = await joinGroup.mutateAsync({ groupId: group.id });
      setNotice(
        result.pending
          ? `Enviamos tu solicitud a los administradores de ${group.name}.`
          : `Te uniste a ${group.name}.`,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const openGroup = (groupId: string) =>
    router.push({ pathname: '/comunidad/[id]', params: { id: groupId } });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <H>{es.community.title}</H>
          <Button label={es.community.createGroup} tone="ghost" small />
        </View>

        <Segment
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mine', label: es.community.myGroups },
            { value: 'suggested', label: es.community.suggested },
          ]}
        />

        {notice ? <Notice text={notice} /> : null}
        {error ? <Notice tone="wine" text={error} /> : null}

        {isLoading ? (
          <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>{es.common.loading}</Sub>
        ) : null}

        {groups.map((group) => (
          <Pressable key={group.id} onPress={() => openGroup(group.id)}>
            <Card style={{ padding: 12 }}>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <AvatarCircle name={group.name} size={38} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Sub style={{ fontSize: 11 }}>
                      {es.community.membersCount(group.memberCount)}
                      {group.postsToday ? ` · ${es.community.postsToday(group.postsToday)}` : ''}
                    </Sub>
                  </View>
                </View>
                {group.isOfficial ? <Chip label={es.common.official} tone="olive" /> : null}
              </View>

              {!group.joined ? (
                <View style={[styles.rowBetween, { marginTop: 10 }]}>
                  <Sub style={{ fontSize: 11 }}>
                    {group.type === 'APPROVAL' ? es.community.withApproval : es.community.open}
                  </Sub>
                  <Button
                    label={
                      group.type === 'APPROVAL' ? es.community.requestJoin : es.community.join
                    }
                    tone="olive"
                    small
                    disabled={joinGroup.isPending}
                    onPress={() => join(group)}
                  />
                </View>
              ) : null}
            </Card>
          </Pressable>
        ))}

        {!isLoading && groups.length === 0 ? (
          <Card>
            <Sub style={{ textAlign: 'center', paddingVertical: 16 }}>
              {tab === 'mine'
                ? 'Todavía no formas parte de ningún grupo. Mira los sugeridos.'
                : 'No tenemos grupos nuevos que sugerirte por ahora.'}
            </Sub>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupName: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
});
