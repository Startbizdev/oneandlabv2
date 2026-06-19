import type { AppColors } from '@/theme/colors';

import { useThemedStyles } from '@/theme/use-themed-styles';

import { useAppColors } from '@/theme/use-app-colors';

import { Fragment, useCallback, useMemo, useRef, useState } from 'react';

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

import { useRouter } from 'expo-router';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Users } from 'lucide-react-native';

import type { StaffHubPatientItem, StaffHubSearchItem } from '@oneandlab/shared-types';

import { useScreenFabScrollClearance } from '@/components/ui/ScreenFab';

import {

  buildTabSceneScrollConfig,

  spreadTabSceneScrollProps,

  useTabSceneInsets,

} from '@/components/navigation/liquid-glass-header-inset';

import { queryKeys } from '@/lib/query-keys';

import { deletePatient } from '../api/patients.service';

import { fetchStaffPatientHubSearch } from '../api/staff-hub-search.service';

import type { PatientRow } from '../api/fetch-all-patients';

import { EmptyState } from '@/components/ui/EmptyState';

import { SkeletonPatientList } from '@/components/ui/skeletons';

import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';

import { useToast } from '@/providers/ToastProvider';

import { handleApiError } from '@/lib/errors/handle-api-error';

import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';

import { CreatePatientModal } from '../components/CreatePatientModal';

import { StaffPatientHubListRow } from '../components/StaffPatientHubListRow';

import { staffHubItemRoute } from '../utils/staff-hub-navigation';

import { useAuthStore } from '@/store/auth-store';

import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

import { radius, spacing } from '@/theme';

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

  createOpen: boolean;

  onCreateOpenChange: (open: boolean) => void;

}



export function PatientsListScreen({

  rolePrefix = '/(nurse)',

  createOpen,

  onCreateOpenChange: setCreateOpen,

}: Props) {

  const c = useAppColors();

  const styles = useThemedStyles(buildStyles, 'PatientsListScreen');

  const sceneInsets = useTabSceneInsets();

  const fabClearance = useScreenFabScrollClearance();

  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.listContent, {

    extraBottom: fabClearance,

  });

  const router = useRouter();

  const user = useAuthStore((s) => s.user);

  const role = rolePrefix === '/(pro)' ? 'pro' : 'nurse';



  const { show: toast } = useToast();

  const qc = useQueryClient();

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

  const { refreshing, onRefresh } = useManualRefresh(hubQ.refetch);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnPop(scrollRef);



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

      <ScrollView

        ref={scrollRef}

        style={styles.list}

        {...spreadTabSceneScrollProps(scrollConfig)}

        contentContainerStyle={scrollConfig.contentContainerStyle}

        showsVerticalScrollIndicator={false}

        refreshControl={

          <RefreshControl

            refreshing={refreshing}

            onRefresh={onRefresh}

            tintColor={c.primary}

            progressViewOffset={scrollConfig.refreshProgressOffset}

          />

        }

      >

        <AppointmentsListFilterBar

          embedded

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

          <View style={styles.listCard}>

            <Text style={styles.sectionKicker}>{headerLabel}</Text>

            {items.map((item, index) => (

              <Fragment key={item.id}>

                {index > 0 ? <View style={styles.rowDivider} /> : null}

                {renderItem(item)}

              </Fragment>

            ))}

          </View>

        )}

      </ScrollView>

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



function buildStyles(c: AppColors) {

  return {

    screen: {

      minWidth: 0,

      flex: 1,

      backgroundColor: c.background,

    },

    list: {

      minWidth: 0,

      flex: 1,

    },

    listContent: {

      minWidth: 0,

      paddingHorizontal: spacing[4],

      paddingTop: spacing[2],

      paddingBottom: spacing[4],

      flexGrow: 1,

    },

    listCard: {

      width: '100%' as const,

      alignSelf: 'stretch' as const,

      backgroundColor: c.surface,

      borderRadius: radius.xl,

      borderWidth: StyleSheet.hairlineWidth,

      borderColor: c.cardBorder,

      overflow: 'hidden' as const,

    },

    sectionKicker: {

      fontFamily: fontFamily.semiBold,

      fontSize: fontSize.xs,

      color: c.textTertiary,

      letterSpacing: 0.6,

      textTransform: 'uppercase' as const,

      paddingHorizontal: spacing[4],

      paddingTop: spacing[3.5],

      paddingBottom: spacing[2],

    },

    rowDivider: {

      height: StyleSheet.hairlineWidth,

      backgroundColor: c.borderLight,

      marginLeft: spacing[4] + 40 + spacing[3],

    },

    emptyWrap: {

      minWidth: 0,

      flexGrow: 1,

      justifyContent: 'center' as const,

      paddingVertical: spacing[6],

    },

  };

}

