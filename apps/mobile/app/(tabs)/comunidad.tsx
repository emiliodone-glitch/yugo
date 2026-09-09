import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { es, GROUP_CATEGORIES, type GroupSummary } from '@yugo/shared';
import { useCreateGroup, useGroups, useJoinGroup } from '@yugo/app-core';
import {
  AvatarCircle,
  Button,
  Card,
  Chip,
  Field,
  H,
  Notice,
  Segment,
  Sub,
} from '../../components/ui';
import { PrayerWall } from '../../components/devotional';
import { QueryErrorCard } from '../../components/query-error-card';
import { errorMessage } from '../../lib/api';
import { theme } from '../../lib/theme';
import { ListSkeleton } from '../../components/skeleton';

const { colors, fonts } = theme;

type Tab = 'mine' | 'suggested' | 'prayer';

const categoryName = (slug: string) =>
  GROUP_CATEGORIES.find((category) => category.slug === slug)?.name ?? slug;

/**
 * Comunidad: mis grupos, los sugeridos y el muro de oración, como en la web.
 * «Crear grupo» propone uno de verdad (RF-COM-02): nace «en revisión».
 */
export default function CommunityScreen() {
  const groupsQuery = useGroups();
  const { data, isLoading, isError, error, refetch } = groupsQuery;
  const joinGroup = useJoinGroup();
  const createGroup = useCreateGroup();
  const [tab, setTab] = useState<Tab>('mine');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState(GROUP_CATEGORIES[0]?.slug ?? 'ciudad');
  const [formError, setFormError] = useState<string | null>(null);

  const groups = (tab === 'mine' ? data?.mine : data?.suggested) ?? [];

  const join = async (group: GroupSummary) => {
    setErrorText(null);
    setNotice(null);
    try {
      const result = await joinGroup.mutateAsync({ groupId: group.id });
      setNotice(
        result.pending
          ? `Enviamos tu solicitud a los administradores de ${group.name}.`
          : `Te uniste a ${group.name}.`,
      );
    } catch (caught) {
      setErrorText(errorMessage(caught));
    }
  };

  const propose = async () => {
    setFormError(null);
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    // Mismos mínimos que valida la API (3 y 10 caracteres).
    if (trimmedName.length < 3 || trimmedDescription.length < 10) {
      setFormError(es.errors.generic);
      return;
    }
    try {
      await createGroup.mutateAsync({
        name: trimmedName,
        description: trimmedDescription,
        categorySlug,
        type: 'APPROVAL',
      });
      setProposing(false);
      setName('');
      setDescription('');
      setTab('mine');
      setNotice(es.community.groupProposed);
    } catch (caught) {
      setFormError(errorMessage(caught));
    }
  };

  const openGroup = (groupId: string) =>
    router.push({ pathname: '/comunidad/[id]', params: { id: groupId } });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <H>{es.community.title}</H>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Button
              label={es.prayer.title}
              tone="ghost"
              small
              onPress={() => router.push('/oracion')}
            />
            <Button
              label={es.community.createGroup}
              tone="ghost"
              small
              onPress={() => setProposing(true)}
            />
          </View>
        </View>

        <Segment
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mine', label: es.community.myGroups },
            { value: 'suggested', label: es.community.suggested },
            { value: 'prayer', label: es.community.prayer },
          ]}
        />

        {notice ? <Notice text={notice} /> : null}
        {errorText ? <Notice tone="wine" text={errorText} /> : null}

        {tab === 'prayer' ? (
          <PrayerWall />
        ) : isError ? (
          <QueryErrorCard error={error} onRetry={() => void refetch()} />
        ) : (
          <>
            {isLoading ? <ListSkeleton rows={4} /> : null}

            {groups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => openGroup(group.id)}
                accessibilityRole="button"
              >
                <Card style={{ padding: 12 }}>
                  <View style={styles.rowBetween}>
                    <View style={styles.row}>
                      <AvatarCircle name={group.name} size={38} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Sub style={{ fontSize: 11 }}>
                          {es.community.membersCount(group.memberCount)}
                          {group.postsToday
                            ? ` · ${es.community.postsToday(group.postsToday)}`
                            : ''}
                        </Sub>
                      </View>
                    </View>
                    {group.status === 'PENDING' ? (
                      <Chip label={es.community.inReview} tone="wheat" />
                    ) : group.isOfficial ? (
                      <Chip label={es.common.official} tone="olive" />
                    ) : null}
                  </View>

                  <View style={styles.chips}>
                    <Chip label={categoryName(group.category)} />
                    {group.churchName ? <Chip label={group.churchName} tone="olive" /> : null}
                    {group.city ? <Chip label={group.city} /> : null}
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
                        onPress={() => void join(group)}
                      />
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            ))}

            {!isLoading && groups.length === 0 ? (
              <Card>
                <Sub style={{ textAlign: 'center', paddingVertical: 16 }}>
                  {tab === 'mine' ? es.community.myGroupsEmpty : es.community.suggestedEmpty}
                </Sub>
                {tab === 'mine' ? (
                  <Button
                    label={es.community.seeSuggested}
                    tone="olive"
                    small
                    style={{ alignSelf: 'center' }}
                    onPress={() => setTab('suggested')}
                  />
                ) : null}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Proponer un grupo (RF-COM-02): nombre, descripción y categoría. */}
      <Modal
        visible={proposing}
        transparent
        animationType="slide"
        onRequestClose={() => setProposing(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setProposing(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{es.community.proposeGroup}</Text>
            <Text style={styles.fieldLabel}>{es.community.groupName}</Text>
            <Field
              value={name}
              onChangeText={setName}
              placeholder={es.community.groupName}
              autoCapitalize="sentences"
              maxLength={60}
            />
            <Text style={styles.fieldLabel}>{es.community.groupDescription}</Text>
            <Field
              value={description}
              onChangeText={setDescription}
              placeholder={es.community.groupDescription}
              autoCapitalize="sentences"
              maxLength={600}
              multiline
            />
            <Text style={styles.fieldLabel}>{es.community.categoryLabel}</Text>
            <View style={styles.chips}>
              {GROUP_CATEGORIES.map((category) => (
                <Chip
                  key={category.slug}
                  label={category.name}
                  tone={category.slug === categorySlug ? 'olive' : 'default'}
                  onPress={() => setCategorySlug(category.slug)}
                />
              ))}
            </View>
            <Sub style={{ fontSize: 11, marginTop: 10 }}>{es.community.groupProposed}</Sub>
            {formError ? (
              <View style={{ marginTop: 8 }}>
                <Notice tone="wine" text={formError} />
              </View>
            ) : null}
            <Button
              label={createGroup.isPending ? es.common.loading : es.community.proposeGroup}
              tone="olive"
              style={{ marginTop: 12 }}
              disabled={createGroup.isPending}
              onPress={() => void propose()}
            />
            <Button
              label={es.common.cancel}
              tone="ghost"
              style={{ marginTop: 8 }}
              onPress={() => setProposing(false)}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  groupName: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(24,28,44,.4)' },
  sheet: {
    backgroundColor: colors.linen,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 32,
  },
  sheetTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, marginBottom: 6 },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
    marginBottom: 6,
  },
});
