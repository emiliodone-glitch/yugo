import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoCurrentUser, es } from '@yugo/shared';
import {
  useCreatePost,
  useDemoStore,
  useGroupDetail,
  useJoinRequests,
  useReactToPost,
} from '@yugo/app-core';
import {
  AvatarCircle,
  Button,
  Card,
  Chip,
  Field,
  Notice,
  ScreenHeader,
  Segment,
  Sub,
} from '../../components/ui';
import { theme } from '../../lib/theme';

const { colors, fonts } = theme;

type Tab = 'wall' | 'activities' | 'members';

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('es-DO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));

/** Group detail: moderated wall, prayer requests, activities and members. */
export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = id ?? '';
  const { data: group, isLoading } = useGroupDetail(groupId);
  const createPost = useCreatePost(groupId);
  const react = useReactToPost();

  const [tab, setTab] = useState<Tab>('wall');
  const [draft, setDraft] = useState('');
  const [isPrayer, setIsPrayer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localPosts, setLocalPosts] = useState<
    Array<{ id: string; body: string; held: boolean }>
  >([]);
  const { praying, amen, activityJoined, toggleActivity } = useDemoStore();

  const isAdmin = group?.myRole === 'ADMIN' || group?.myRole === 'MODERATOR';
  const { data: joinRequests = [] } = useJoinRequests(groupId, !!isAdmin);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.community.title} />
        <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>{es.common.loading}</Sub>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title={es.community.title} />
        <Sub style={{ textAlign: 'center', paddingVertical: 30 }}>
          Este grupo ya no está disponible.
        </Sub>
      </SafeAreaView>
    );
  }

  const publish = async () => {
    const body = draft.trim();
    if (!body) return;
    // Every post is classified before it is published (RF-COM-08).
    const result = await createPost.mutateAsync({ body, isPrayerRequest: isPrayer });
    const held = result.moderationStatus !== 'APPROVED';
    setLocalPosts((current) => [{ id: result.id, body, held }, ...current]);
    setNotice(
      held ? 'Tu publicación está en revisión: la moderación la revisa antes de mostrarla.' : null,
    );
    setDraft('');
    setIsPrayer(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader
        title={group.name}
        right={group.isOfficial ? <Chip label={es.common.official} tone="olive" /> : undefined}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.groupRow}>
            <AvatarCircle name={group.name} size={42} />
            <View>
              <Sub style={{ fontSize: 11 }}>
                {es.community.membersCount(group.memberCount)}
                {group.city ? ` · ${group.city}` : ''}
              </Sub>
              <Sub style={{ fontSize: 11 }}>
                {group.category}
                {group.churchName ? ` · ${group.churchName}` : ''}
              </Sub>
            </View>
          </View>

          <Segment
            value={tab}
            onChange={setTab}
            options={[
              { value: 'wall', label: 'Muro' },
              { value: 'activities', label: 'Actividades' },
              {
                value: 'members',
                label:
                  isAdmin && joinRequests.length > 0
                    ? `Miembros (${joinRequests.length})`
                    : 'Miembros',
              },
            ]}
          />

          {tab === 'wall' ? (
            <>
              {/* Composer — every post passes moderation (RF-COM-04/08) */}
              <Card>
                <Field
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Comparte algo con el grupo…"
                  autoCapitalize="sentences"
                  maxLength={1200}
                  multiline
                />
                <View style={[styles.rowBetween, { marginTop: 10 }]}>
                  <Button
                    label={
                      isPrayer ? `✓ ${es.community.newPrayerRequest}` : es.community.newPrayerRequest
                    }
                    tone={isPrayer ? 'olive' : 'ghost'}
                    small
                    onPress={() => setIsPrayer((value) => !value)}
                  />
                  <Button
                    label={createPost.isPending ? es.common.loading : 'Publicar'}
                    tone="olive"
                    small
                    disabled={createPost.isPending || draft.trim().length === 0}
                    onPress={publish}
                  />
                </View>
              </Card>

              {notice ? <Notice tone="wheat" text={notice} /> : null}

              {localPosts.map((post) => (
                <Card
                  key={post.id}
                  style={post.held ? { borderColor: colors.wheat, borderStyle: 'dashed' } : undefined}
                >
                  <View style={styles.authorRow}>
                    <AvatarCircle name={demoCurrentUser.displayName} size={32} />
                    <View>
                      <Text style={styles.author}>{demoCurrentUser.displayName}</Text>
                      <Sub style={{ fontSize: 11 }}>
                        {post.held ? 'En revisión' : 'hace un momento'}
                      </Sub>
                    </View>
                  </View>
                  <Text style={styles.postBody}>{post.body}</Text>
                </Card>
              ))}

              {group.posts.map((post) => (
                <Card key={post.id}>
                  <View style={styles.authorRow}>
                    <AvatarCircle name={post.author.displayName} size={32} />
                    <View>
                      <Text style={styles.author}>{post.author.displayName}</Text>
                      <Sub style={{ fontSize: 11 }}>{dateTime(post.createdAt)}</Sub>
                    </View>
                  </View>
                  <Text style={styles.postBody}>{post.body}</Text>
                  <View style={[styles.row, { marginTop: 10 }]}>
                    {post.isPrayerRequest ? (
                      <Button
                        label={`🙏 ${es.community.praying} · ${
                          post.prayingCount + (praying[post.id] ? 1 : 0)
                        }`}
                        tone={praying[post.id] ? 'olive' : 'ghost'}
                        small
                        onPress={() => react.mutate({ postId: post.id, type: 'PRAYING' })}
                      />
                    ) : null}
                    <Button
                      label={`${es.community.amen} · ${post.amenCount + (amen[post.id] ? 1 : 0)}`}
                      tone={amen[post.id] ? 'olive' : 'ghost'}
                      small
                      onPress={() => react.mutate({ postId: post.id, type: 'AMEN' })}
                    />
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          {tab === 'activities' ? (
            group.activities.length === 0 ? (
              <Card>
                <Sub style={{ textAlign: 'center', paddingVertical: 16 }}>
                  Este grupo aún no tiene actividades programadas.
                </Sub>
              </Card>
            ) : (
              group.activities.map((activity) => (
                <Card key={activity.id}>
                  <View style={styles.rowBetween}>
                    <Chip label={es.community.activityChip} tone="wheat" />
                    <Sub style={{ fontSize: 11 }}>{dateTime(activity.startsAt)}</Sub>
                  </View>
                  <Text style={[styles.author, { marginTop: 6 }]}>{activity.title}</Text>
                  {activity.place ? <Sub style={{ fontSize: 11 }}>{activity.place}</Sub> : null}
                  <View style={[styles.rowBetween, { marginTop: 10 }]}>
                    <Sub style={{ fontSize: 11 }}>
                      {es.community.goingCount(
                        activity.goingCount + (activityJoined[activity.id] ? 1 : 0),
                      )}
                    </Sub>
                    <Button
                      label={activityJoined[activity.id] ? 'Apuntado ✓' : es.community.joinActivity}
                      tone="olive"
                      small
                      onPress={() => toggleActivity(activity.id)}
                    />
                  </View>
                </Card>
              ))
            )
          ) : null}

          {tab === 'members' ? (
            <>
              {/* RF-COM-02: pending requests for approval groups */}
              {isAdmin && joinRequests.length > 0 ? (
                <Card>
                  <Text style={styles.author}>Solicitudes pendientes</Text>
                  {joinRequests.map((request) => (
                    <View key={request.id} style={styles.requestRow}>
                      <AvatarCircle name={request.displayName} size={34} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.author}>{request.displayName}</Text>
                        <Sub style={{ fontSize: 11 }}>
                          {request.city ? `${request.city} · ` : ''}Nivel {request.verificationLevel}
                        </Sub>
                        {request.message ? (
                          <Sub style={{ fontSize: 11 }}>{request.message}</Sub>
                        ) : null}
                      </View>
                      <Button label="Aceptar" tone="olive" small />
                    </View>
                  ))}
                </Card>
              ) : null}
              <Card>
                <Sub style={{ fontSize: 12 }}>
                  {es.community.membersCount(group.memberCount)}. Los administradores del grupo
                  pueden silenciar o expulsar miembros y reciben los reportes de su grupo
                  (RF-COM-07/08).
                </Sub>
              </Card>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 24 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  author: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  postBody: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.text, marginTop: 8 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
