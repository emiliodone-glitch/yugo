import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoActivities, demoGroups, demoPosts, es } from '@yugo/shared';
import { AvatarCircle, Button, Card, Chip, H, Sub } from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

export default function CommunityScreen() {
  const [praying, setPraying] = useState(false);
  const [joined, setJoined] = useState(false);
  const post = demoPosts[0];
  const activity = demoActivities[0];
  const myGroups = demoGroups.filter((g) => g.joined);
  const suggested = demoGroups.filter((g) => !g.joined);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <H>{es.community.title}</H>
          <Button label={es.community.createGroup} tone="ghost" small />
        </View>

        <Card style={{ padding: 12 }}>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <AvatarCircle name={myGroups[0].name} size={34} />
              <View>
                <Text style={styles.groupName}>{myGroups[0].name}</Text>
                <Sub style={{ fontSize: 11 }}>
                  {es.community.membersCount(myGroups[0].memberCount)} ·{' '}
                  {es.community.postsToday(myGroups[0].postsToday ?? 0)}
                </Sub>
              </View>
            </View>
            <View style={styles.officialBadge}>
              <Text style={styles.officialText}>{es.common.official}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <AvatarCircle name={post.author.displayName} size={34} />
            <View>
              <Text style={styles.groupName}>{post.author.displayName}</Text>
              <Sub style={{ fontSize: 11 }}>hace 2 h</Sub>
            </View>
          </View>
          <Text style={styles.postBody}>{post.body}</Text>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Button
              label={`🙏 ${es.community.praying} · ${post.prayingCount + (praying ? 1 : 0)}`}
              tone={praying ? 'olive' : 'ghost'}
              small
              onPress={() => setPraying((v) => !v)}
            />
            <Chip label={`${es.community.amen} · ${post.amenCount}`} />
          </View>
        </Card>

        <Card style={{ padding: 12 }}>
          <View style={styles.row}>
            <AvatarCircle name={myGroups[1].name} size={34} />
            <View>
              <Text style={styles.groupName}>{myGroups[1].name}</Text>
              <Sub style={{ fontSize: 11 }}>{es.community.membersCount(myGroups[1].memberCount)}</Sub>
            </View>
          </View>
          <View style={styles.activityBox}>
            <View style={styles.rowBetween}>
              <Chip label={es.community.activityChip} tone="wheat" />
              <Sub style={{ fontSize: 11 }}>Sáb 12 sep · 8:00 am</Sub>
            </View>
            <Text style={[styles.groupName, { marginTop: 4 }]}>{activity.title}</Text>
            <View style={[styles.rowBetween, { marginTop: 6 }]}>
              <Sub style={{ fontSize: 11 }}>
                {es.community.goingCount(activity.goingCount + (joined ? 1 : 0))}
              </Sub>
              <Button
                label={joined ? 'Apuntado ✓' : es.community.joinActivity}
                tone="olive"
                small
                onPress={() => setJoined((v) => !v)}
              />
            </View>
          </View>
        </Card>

        {suggested.map((group) => (
          <Card key={group.id} style={{ padding: 12 }}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <AvatarCircle name={group.name} size={34} />
                <View>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Sub style={{ fontSize: 11 }}>{es.community.membersCount(group.memberCount)}</Sub>
                </View>
              </View>
              {group.type === 'APPROVAL' ? (
                <Sub style={{ fontSize: 11 }}>{es.community.withApproval}</Sub>
              ) : (
                <Button label={es.community.join} tone="olive" small />
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupName: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  officialBadge: { backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  officialText: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line, marginVertical: 10 },
  postBody: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.text, marginTop: 6 },
  activityBox: { backgroundColor: colors.linen2, borderRadius: 12, padding: 10, marginTop: 10 },
});
