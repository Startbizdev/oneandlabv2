import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { ScreenFab, useScreenFabScrollClearance } from '@/components/ui/ScreenFab';
import { PatientRelativeFormSheet } from '@/features/patient-relatives/components/PatientRelativeFormSheet';
import {
  createPatientRelative,
  fetchPatientRelatives,
  relativeRelationshipType,
  type PatientRelative,
} from '@/features/patient-relatives/api/patient-relatives.service';
import { relationshipLabel } from '@/features/patient-relatives/constants/relationship-types';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { ageFromBirthDate } from '@oneandlab/shared-utils';
import {
  AppText,
  ICON_STROKE_WIDTH,
  avatarSize,
  font,
  iconSize,
  radius,
  spacing,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

function displayName(r: PatientRelative) {
  return `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.id;
}

function relativeMeta(r: PatientRelative): string {
  const rel = relationshipLabel(relativeRelationshipType(r)) || r.relationship;
  const age = ageFromBirthDate(r.birth_date);
  return [rel, age != null ? `${age} an${age > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
}

const RelativeRow = React.memo(function RelativeRow({
  item,
  onPress,
}: {
  item: PatientRelative;
  onPress: () => void;
}) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const name = displayName(item);
  const meta = relativeMeta(item);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${name}, ${meta}` : name}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <ListRowShell
        leading={
          <ProfileAvatar
            profileImageUrl={null}
            seed={item.id ?? name}
            gender={item.gender}
            size={avatarSize.sm}
          />
        }
        body={
          <View style={styles.texts}>
            <AppText style={styles.name}>{name}</AppText>
            {meta ? <AppText variant="caption">{meta}</AppText> : null}
          </View>
        }
        trailing={
          <ChevronRight size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
        }
      />
    </Pressable>
  );
});

export function PatientRelativesScreen() {
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const fabClearance = useScreenFabScrollClearance();
  const router = useRouter();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const relativesQ = useQuery({
    queryKey: ['patient-relatives'],
    queryFn: async () => {
      const res = await fetchPatientRelatives();
      if (!res.success) throw new Error(res.error);
      return res.data ?? [];
    },
  });

  const items = relativesQ.data ?? [];
  const hasRelatives = items.length > 0;

  const createMut = useMutation({
    mutationFn: createPatientRelative,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patient-relatives'] });
      setCreateOpen(false);
      toast('Proche ajouté', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'createRelative'),
  });

  const openCreate = useCallback(() => setCreateOpen(true), []);

  const renderItem = useCallback(
    ({ item }: { item: PatientRelative }) => (
      <RelativeRow item={item} onPress={() => router.push({ pathname: '/(patient)/relatives/[id]', params: { id: item.id } })} />
    ),
    [router],
  );

  return (
    <View style={styles.container} collapsable={false}>
      <QueryFlatList
        query={relativesQ}
        items={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        extraBottom={hasRelatives ? fabClearance + insets.bottom : 0}
        skeletonHeight={72}
        skeletonCount={2}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Aucun proche"
            description="Ajoutez un proche pour réserver à sa place."
            illustration="relatives"
            actionLabel="Ajouter un proche"
            onAction={openCreate}
          />
        }
      />

      {hasRelatives ? (
        <View style={[styles.fabZone, { bottom: insets.bottom }]} pointerEvents="box-none">
          <ScreenFab onPress={openCreate} accessibilityLabel="Ajouter un proche" />
        </View>
      ) : null}

      <PatientRelativeFormSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        saving={createMut.isPending}
        onSubmit={(body) => createMut.mutate(body)}
      />
    </View>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    list: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[4],
      flexGrow: 1,
    },
    separator: { height: spacing[2] },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    cardPressed: { backgroundColor: c.surfaceAlt },
    texts: { gap: spacing[0.5] },
    name: { ...text.body, ...font.semiBold, color: c.textPrimary },
    fabZone: { ...StyleSheet.absoluteFillObject },
  };
}
