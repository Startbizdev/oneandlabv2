import React, { useCallback } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Users } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  deletePatientRelative,
  fetchPatientRelatives,
  type PatientRelative,
} from '@/features/patient-relatives/api/patient-relatives.service';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function displayName(r: PatientRelative) {
  return `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.id;
}

function initials(r: PatientRelative) {
  const f = r.first_name?.[0] ?? '';
  const l = r.last_name?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

interface RelativeCardProps {
  item: PatientRelative;
  index: number;
  onLongPress: () => void;
}

const RelativeCard = React.memo(function RelativeCard({ item, index, onLongPress }: RelativeCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()}>
      <Pressable onLongPress={onLongPress} style={[styles.card, elevation.xs]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(item)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{displayName(item)}</Text>
          {item.relationship ? (
            <View style={styles.relationPill}>
              <Heart size={10} color={colors.error} strokeWidth={2.5} fill={colors.error} />
              <Text style={styles.relationText}>{item.relationship}</Text>
            </View>
          ) : null}
          {item.birth_date ? (
            <Text style={styles.birth}>Né(e) le {formatBirthDateFr(item.birth_date)}</Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

export function PatientRelativesScreen() {
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['patient-relatives'],
    queryFn: async () => {
      const res = await fetchPatientRelatives();
      if (!res.success) throw new Error(res.error);
      return res.data ?? [];
    },
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
      <RelativeCard item={item} index={index} onLongPress={() => onDelete(item)} />
    ),
    [onDelete],
  );

  const ListHeader = useCallback(
    () => (
      <Text style={styles.subtitle}>Maintenez appuyé sur une carte pour supprimer</Text>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.skeletons}>
          <Skeleton height={80} borderRadius={radius.xl} />
          <Skeleton height={80} borderRadius={radius.xl} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <EmptyState
              Icon={Users}
              title="Aucun proche"
              description="Ajoutez un proche depuis le site web pour prendre rendez-vous en son nom."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing[2],
  },
  skeletons: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  list: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.error,
    letterSpacing: 0.5,
  },
  info: { flex: 1, gap: spacing[1] },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  relationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  relationText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  birth: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
