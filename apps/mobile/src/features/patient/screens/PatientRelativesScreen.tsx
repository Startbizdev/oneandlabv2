import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenFab, useScreenFabScrollClearance } from '@/components/ui/ScreenFab';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import {
  EMPTY_PROCHE_IMAGE,
  EMPTY_PROCHE_IMAGE_HEIGHT,
  EMPTY_PROCHE_IMAGE_WIDTH,
} from '@/constants/empty-state-images';
import { SkeletonList } from '@/components/ui/skeletons';
import { PatientRelativeFormSheet } from '@/features/patient-relatives/components/PatientRelativeFormSheet';
import {
  createPatientRelative,
  deletePatientRelative,
  fetchPatientRelatives,
  relativeRelationshipType,
  type PatientRelative,
} from '@/features/patient-relatives/api/patient-relatives.service';
import { relationshipLabel } from '@/features/patient-relatives/constants/relationship-types';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
import { elevation, radius, spacing } from '@/theme';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { fontFamily, fontSize } from '@/theme/typography';

function displayName(r: PatientRelative) {
  return `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.id;
}

interface RelativeCardProps {
  item: PatientRelative;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
}

const RelativeCard = React.memo(function RelativeCard({
  item,
  index,
  onPress,
  onLongPress,
}: RelativeCardProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PatientRelativesScreen.RelativeCard');
  const rel = relationshipLabel(relativeRelationshipType(item)) || item.relationship;
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()}>
      <Pressable onPress={onPress} onLongPress={onLongPress} style={[styles.card, elevation.xs]}>
        <Cluster
          gap={spacing[3]}
          leading={
            <ProfileAvatar
              profileImageUrl={null}
              seed={item.id ?? displayName(item)}
              gender={item.gender}
              size={48}
              style={styles.avatar}
            />
          }
        >
          <View style={styles.info}>
            <Text style={styles.name}>{displayName(item)}</Text>
            {rel ? (
              <Row gap={4} align="center" style={styles.relationPill}>
                <Heart size={10} color={c.error} strokeWidth={2.5} fill={c.error} />
                <Text style={styles.relationText}>{rel}</Text>
              </Row>
            ) : null}
            {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
            {item.email ? (
              <Text style={styles.meta} numberOfLines={1}>
                {item.email}
              </Text>
            ) : null}
            {item.birth_date ? (
              <Text style={styles.birth}>Né(e) le {formatBirthDateFr(item.birth_date)}</Text>
            ) : null}
          </View>
        </Cluster>
      </Pressable>
    </Animated.View>
  );
});

export function PatientRelativesScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_patient_screens_PatientRelativesScreen_tsx_styles');
  const sceneInsets = useTabSceneInsets();
  const fabClearance = useScreenFabScrollClearance();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.list, {
    extraBottom: fabClearance,
  });
  const router = useRouter();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['patient-relatives'],
    queryFn: async () => {
      const res = await fetchPatientRelatives();
      if (!res.success) throw new Error(res.error);
      return res.data ?? [];
    },
  });

  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const createMut = useMutation({
    mutationFn: createPatientRelative,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patient-relatives'] });
      setCreateOpen(false);
      toast('Proche ajouté', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'createRelative'),
  });

  const removeMut = useMutation({
    mutationFn: deletePatientRelative,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patient-relatives'] });
      toast('Proche supprimé', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'deleteRelative'),
  });

  const onDelete = useCallback(
    (r: PatientRelative) => {
      Alert.alert('Supprimer', `Supprimer ${displayName(r)} de vos proches ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeMut.mutate(r.id) },
      ]);
    },
    [removeMut],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: PatientRelative; index: number }) => (
      <RelativeCard
        item={item}
        index={index}
        onPress={() => router.push(`/(patient)/relatives/${item.id}` as never)}
        onLongPress={() => onDelete(item)}
      />
    ),
    [onDelete, router],
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <SkeletonList count={2} itemHeight={80} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <Text style={styles.subtitle}>
              Touchez une carte pour modifier · appui long pour supprimer
            </Text>
          }
          {...spreadTabSceneScrollProps(scrollConfig)}
          contentContainerStyle={scrollConfig.contentContainerStyle}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.primary}
              progressViewOffset={scrollConfig.refreshProgressOffset}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="Aucun proche"
              description="Ajoutez un proche pour prendre rendez-vous en son nom."
              imageSource={EMPTY_PROCHE_IMAGE}
              imageWidth={EMPTY_PROCHE_IMAGE_WIDTH}
              imageHeight={EMPTY_PROCHE_IMAGE_HEIGHT}
            />
          }
        />
      )}

      <ScreenFab
        onPress={() => setCreateOpen(true)}
        accessibilityLabel="Ajouter un proche"
      />

      <PatientRelativeFormSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        saving={createMut.isPending}
        onSubmit={(body) => createMut.mutate(body)}
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textTertiary,
    marginBottom: spacing[2],
  },
  skeletons: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  list: {
    minWidth: 0,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    flexGrow: 1,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    backgroundColor: c.errorLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  info: { gap: spacing[1] },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  relationPill: {
    alignSelf: 'flex-start' as const,
  },
  relationText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  birth: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}

