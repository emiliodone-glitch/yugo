/**
 * Etapas del vínculo, en la conversación.
 *
 * Same rules as the web card and the same hooks underneath: a stage is
 * proposed by one person and only takes effect when the other agrees.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { es, isExclusive, type RelationshipStage } from '@yugo/shared';
import { useProposeStage, useRelationship, useRespondToStage } from '@yugo/app-core';
import { Button, Sub } from './ui';
import { theme } from '../lib/theme';

const { colors, fonts } = theme;

const stageName = (stage: RelationshipStage) => es.relationship.stages[stage];

export function RelationshipStageCard({
  matchId,
  otherName,
}: {
  matchId: string;
  otherName: string;
}) {
  const { data } = useRelationship(matchId, otherName);
  const propose = useProposeStage(matchId);
  const respond = useRespondToStage(matchId);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  const { stage, nextStage, proposal, history } = data;

  return (
    <View style={styles.card} accessibilityLabel={es.relationship.title}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{es.relationship.title}</Text>
          <Text style={styles.stage}>{stageName(stage)}</Text>
          <Sub style={{ fontSize: 11, marginTop: 2 }}>{es.relationship.stageHints[stage]}</Sub>
        </View>
        {history.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((v) => !v)}
            style={{ padding: 4 }}
          >
            <Text style={styles.link}>{es.relationship.history}</Text>
          </Pressable>
        ) : null}
      </View>

      {expanded
        ? history.map((entry) => (
            <View key={entry.createdAt} style={styles.historyRow}>
              <Sub style={{ fontSize: 11 }}>{stageName(entry.toStage)}</Sub>
              <Sub style={{ fontSize: 11 }}>
                {new Date(entry.createdAt).toLocaleDateString('es-DO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Sub>
            </View>
          ))
        : null}

      {/* Their proposal, waiting on us. */}
      {proposal && !proposal.byMe ? (
        <View style={styles.panel}>
          <Text style={styles.panelText}>
            {es.relationship.proposedByThem(otherName, stageName(proposal.stage))}
          </Text>
          {isExclusive(proposal.stage) ? (
            <Sub style={{ fontSize: 11, marginTop: 4 }}>{es.relationship.exclusiveNotice}</Sub>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={es.relationship.accept}
              style={{ flex: 1 }}
              onPress={() => respond.mutate(true)}
            />
            <Button
              label={es.relationship.decline}
              tone="ghost"
              style={{ flex: 1 }}
              onPress={() => respond.mutate(false)}
            />
          </View>
        </View>
      ) : null}

      {/* Ours, waiting on them. */}
      {proposal?.byMe ? (
        <Sub style={{ fontSize: 11.5, marginTop: 10 }}>
          {es.relationship.proposedByYou(stageName(proposal.stage))}
        </Sub>
      ) : null}

      {/* Nothing in flight: we can suggest the next step. */}
      {!proposal && nextStage ? (
        confirming ? (
          <View style={styles.panel}>
            <Text style={styles.panelText}>{es.relationship.bothMustAgree}</Text>
            {isExclusive(nextStage) ? (
              <Sub style={{ fontSize: 11, marginTop: 4 }}>{es.relationship.exclusiveNotice}</Sub>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={es.relationship.propose(stageName(nextStage))}
                style={{ flex: 1 }}
                onPress={() => {
                  propose.mutate(nextStage);
                  setConfirming(false);
                }}
              />
              <Button
                label={es.common.cancel}
                tone="ghost"
                style={{ flex: 1 }}
                onPress={() => setConfirming(false)}
              />
            </View>
          </View>
        ) : (
          <Button
            label={es.relationship.propose(stageName(nextStage))}
            tone="ghost"
            style={{ marginTop: 10 }}
            onPress={() => setConfirming(true)}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.wheat,
    padding: 14,
    marginBottom: 12,
  },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.wheatText,
    textTransform: 'uppercase',
  },
  stage: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginTop: 2 },
  link: { fontSize: 11, color: colors.muted, textDecorationLine: 'underline' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 6,
    marginTop: 6,
  },
  panel: {
    backgroundColor: colors.wheatSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  panelText: { fontFamily: fonts.body, fontSize: 12, color: colors.wheatText, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
