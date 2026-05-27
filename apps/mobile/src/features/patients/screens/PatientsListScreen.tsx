import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react-native';
import { ageFromBirthDate } from '@oneandlab/shared-utils';
import { ScreenFab } from '@/components/ui/ScreenFab';
import { tabHeaderNotificationRight } from '@/navigation/HeaderNotificationButton';
import { queryKeys } from '@/lib/query-keys';
import { deletePatient, fetchPatients } from '../api/patients.service';
import type { PatientRow } from '../api/fetch-all-patients';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonPatientList } from '@/components/ui/skeletons';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { CreatePatientModal } from '../components/CreatePatientModal';
import { useAuthStore } from '@/store/auth-store';
import { patientListSubtitle, patientRecordEmailLine } from '../utils/patient-contact-display';
import { colors, spacing } from '@/theme';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { fontFamily, fontSize } from '@/theme/typography';

function displayName(p: PatientRow) {
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient';
}

interface Props {
  rolePrefix?: '/(nurse)' | '/(pro)';
}

export function PatientsListScreen({ rolePrefix = '/(nurse)' }: Props) {
  const navigation = useNavigation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: tabHeaderNotificationRight(),
    });
  }, [navigation]);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.patients.list(),
    queryFn: async () => {
      const res = await fetchPatients(1, 100);
      if (!res.success) throw new Error(res.error);
      return (res.data ?? []) as PatientRow[];
    },
  });

  const filtered = (data ?? []).filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      displayName(p).toLowerCase().includes(q) ||
      patientRecordEmailLine(p).toLowerCase().includes(q) ||
      patientListSubtitle(p).toLowerCase().includes(q) ||
      (p.phone ?? '').includes(q)
    );
  });

  const removeMut = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.patients.all });
      toast('Patient supprimé', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'deletePatient'),
  });

  const openMenu = useCallback(
    (p: PatientRow) => {
      const name = displayName(p);
      const canDelete = p.created_by === user?.id;
      const actions = [
        { text: 'Voir le profil', onPress: () => router.push(`${rolePrefix}/patient/${p.id}` as never) },
        {
          text: 'Créer un RDV',
          onPress: () =>
            router.push(`${rolePrefix}/appointments/new?patient_id=${p.id}` as never),
        },
        ...(canDelete
          ? [
              {
                text: 'Supprimer',
                style: 'destructive' as const,
                onPress: () => removeMut.mutate(p.id),
              },
            ]
          : []),
        { text: 'Annuler', style: 'cancel' as const },
      ];
      if (Platform.OS === 'ios') {
        const labels = actions.map((a) => a.text);
        const destructive = canDelete ? labels.length - 2 : -1;
        ActionSheetIOS.showActionSheetWithOptions(
          { options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: destructive },
          (i) => actions[i]?.onPress?.(),
        );
      } else {
        Alert.alert(name, undefined, actions);
      }
    },
    [router, user?.id, removeMut, rolePrefix],
  );

  const renderItem = useCallback(
    ({ item }: { item: PatientRow }) => {
      const age = ageFromBirthDate(item.birth_date);
      const sub = patientListSubtitle(item);

      return (
        <Pressable
          onPress={() => router.push(`${rolePrefix}/patient/${item.id}` as never)}
          onLongPress={() => openMenu(item)}
          delayLongPress={400}
        >
          <View style={styles.row}>
            <ProfileAvatar
              profileImageUrl={item.profile_image_url}
              seed={item.id ?? displayName(item)}
              gender={item.gender}
              size={44}
              style={styles.avatar}
            />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName(item)}
                {age != null ? (
                  <Text style={styles.age}>{` · ${age} ans`}</Text>
                ) : null}
              </Text>
              {sub ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {sub}
                </Text>
              ) : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
      );
    },
    [router, rolePrefix, openMenu],
  );

  return (
    <View style={styles.screen}>
      <AppointmentsListFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Nom, email, téléphone…"
      />

      {isLoading ? (
        <SkeletonPatientList count={8} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            Icon={Users}
            title="Aucun patient"
            description="Ajoutez un patient avec le bouton + en bas à droite."
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentInsetAdjustmentBehavior="automatic"
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.count}>
              {filtered.length} patient{filtered.length > 1 ? 's' : ''}
            </Text>
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}

      <ScreenFab
        onPress={() => setCreateOpen(true)}
        accessibilityLabel="Ajouter un patient"
      />

      <CreatePatientModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void qc.invalidateQueries({ queryKey: queryKeys.patients.all });
          toast('Patient créé', { type: 'success' });
        }}
        onExistingPatient={() => {
          void qc.invalidateQueries({ queryKey: queryKeys.patients.all });
          toast('Ce patient est déjà dans votre liste', { type: 'info' });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'visible',
  },
  count: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing[24],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
  },
  avatar: {
    flexShrink: 0,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  age: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textTertiary,
  },
  sub: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.textTertiary,
    fontFamily: fontFamily.regular,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: 68,
  },
});
