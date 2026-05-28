import { Fragment, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react-native';
import type { StaffHubPatientItem, StaffHubSearchItem } from '@oneandlab/shared-types';
import { ScreenFab } from '@/components/ui/ScreenFab';
import { tabHeaderNotificationRight } from '@/navigation/HeaderNotificationButton';
import { queryKeys } from '@/lib/query-keys';
import { deletePatient } from '../api/patients.service';
import { fetchStaffPatientHubSearch } from '../api/staff-hub-search.service';
import type { PatientRow } from '../api/fetch-all-patients';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonPatientList } from '@/components/ui/skeletons';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { CreatePatientModal } from '../components/CreatePatientModal';
import { StaffPatientHubListRow } from '../components/StaffPatientHubListRow';
import { staffHubItemRoute } from '../utils/staff-hub-navigation';
import { useAuthStore } from '@/store/auth-store';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function hubPatientToRow(item: StaffHubPatientItem): PatientRow {
  return {
    id: item.patient_id,
    first_name: item.first_name,
    last_name: item.last_name,
    email: item.email,
    phone: item.phone ?? undefined,
    birth_date: item.birth_date ?? undefined,
    gender: item.gender ?? undefined,
    profile_image_url: item.profile_image_url ?? undefined,
    created_by: item.created_by ?? undefined,
  };
}

interface Props {
  rolePrefix?: '/(nurse)' | '/(pro)';
}

export function PatientsListScreen({ rolePrefix = '/(nurse)' }: Props) {
  const navigation = useNavigation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = rolePrefix === '/(pro)' ? 'pro' : 'nurse';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: tabHeaderNotificationRight(),
    });
  }, [navigation]);

  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const hubQ = useQuery({
    queryKey: queryKeys.patients.hubSearch(debouncedSearch.trim()),
    queryFn: async () => {
      const res = await fetchStaffPatientHubSearch(debouncedSearch.trim());
      if (!res.success) throw new Error(res.error ?? 'Recherche impossible');
      return res.data?.items ?? [];
    },
    staleTime: 15_000,
  });

  const items = hubQ.data ?? [];
  const isLoading = hubQ.isLoading;
  const isRefetching = hubQ.isRefetching;
  const refetch = hubQ.refetch;

  const removeMut = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.patients.all });
      toast('Patient supprimé', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'deletePatient'),
  });

  const openPatientMenu = useCallback(
    (p: PatientRow) => {
      const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient';
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

  const onItemPress = useCallback(
    (item: StaffHubSearchItem) => {
      router.push(staffHubItemRoute(item, rolePrefix, role) as never);
    },
    [router, rolePrefix, role],
  );

  const renderItem = useCallback(
    (item: StaffHubSearchItem) => (
      <StaffPatientHubListRow
        item={item}
        onPress={() => onItemPress(item)}
        onLongPress={
          item.kind === 'patient' ? () => openPatientMenu(hubPatientToRow(item)) : undefined
        }
      />
    ),
    [onItemPress, openPatientMenu],
  );

  const headerLabel = useMemo(() => {
    const q = search.trim();
    if (q) {
      return `${items.length} résultat${items.length > 1 ? 's' : ''}`;
    }
    return `${items.length} patient${items.length > 1 ? 's' : ''}`;
  }, [items.length, search]);

  return (
    <View style={styles.screen}>
      <AppointmentsListFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Patient, document, échange…"
      />

      {isLoading ? (
        <SkeletonPatientList count={8} />
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            Icon={Users}
            title={search.trim() ? 'Aucun résultat' : 'Votre liste de patients est vide'}
            description={
              search.trim()
                ? 'Essayez un autre nom, un type de document ou un mot-clé.'
                : 'Ajoutez votre premier patient avec le bouton + en bas à droite pour gérer ses rendez-vous, documents et échanges.'
            }
          />
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          <View style={styles.listCard}>
            <Text style={styles.sectionKicker}>{headerLabel}</Text>
            {items.map((item, index) => (
              <Fragment key={item.id}>
                {index > 0 ? <View style={styles.rowDivider} /> : null}
                {renderItem(item)}
              </Fragment>
            ))}
          </View>
        </ScrollView>
      )}

      <ScreenFab
        onPress={() => setCreateOpen(true)}
        accessibilityLabel="Ajouter un patient"
      />

      <CreatePatientModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void qc.invalidateQueries({ queryKey: queryKeys.patients.all });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[24],
    flexGrow: 1,
  },
  listCard: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  sectionKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3.5],
    paddingBottom: spacing[2],
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
});
