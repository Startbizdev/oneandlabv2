import { Fragment } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { ROLE_LABELS } from '@oneandlab/shared-constants';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SkeletonList } from '@/components/ui/skeletons';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { spacing, AppText, useStyles, type Theme } from '@/theme';
import {
  careOriginsQueryKey,
  fetchCareOrigins,
  setCareOriginHidden,
  type CareOrigin,
} from '../api/care-origins.service';
import { ProfileSubScreenLayout } from './ProfileSubScreenLayout';

export function ProfileCareOriginsScreen() {
  const settings = useStyles(buildSettingsStyles);
  const styles = useStyles(buildStyles);
  const queryClient = useQueryClient();
  const { show: toast } = useToast();

  const query = useQuery({ queryKey: careOriginsQueryKey, queryFn: fetchCareOrigins });

  const update = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => setCareOriginHidden(id, hidden),
    onMutate: async ({ id, hidden }) => {
      await queryClient.cancelQueries({ queryKey: careOriginsQueryKey });
      const previous = queryClient.getQueryData<CareOrigin[]>(careOriginsQueryKey);
      queryClient.setQueryData<CareOrigin[]>(careOriginsQueryKey, (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, hidden_by_patient: hidden } : row)),
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(careOriginsQueryKey, context.previous);
      handleApiError(err, toast, 'careOrigins.update', 'Préférence non enregistrée. Réessayez.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: careOriginsQueryKey }),
  });

  const rows = query.data ?? [];

  return (
    <ProfileSubScreenLayout hideSave>
      {query.isLoading ? (
        <SkeletonList count={3} itemHeight={64} />
      ) : query.isError && !query.data ? (
        <ErrorState
          title="Donneurs de soins indisponibles"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          illustration="patients"
          title="Aucun donneur de soins"
          description="Les professionnels qui vous prennent en charge apparaîtront ici."
        />
      ) : (
        <View style={settings.section}>
          <View style={settings.sectionCard}>
            {rows.map((item, index) => {
              const role =
                item.emploi?.trim() ||
                (item.role && item.role !== 'pro' ? ROLE_LABELS[item.role] : null) ||
                'Professionnel de santé';
              return (
                <Fragment key={item.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ListRowShell
                    style={settings.row}
                    body={
                      <View style={settings.texts}>
                        <AppText style={settings.label}>{item.display_name}</AppText>
                        <AppText variant="caption">{role}</AppText>
                      </View>
                    }
                    trailing={
                      <ToggleSwitch
                        value={!item.hidden_by_patient}
                        onValueChange={(next) => update.mutate({ id: item.id, hidden: !next })}
                        accessibilityLabel={`Afficher ${item.display_name}, ${role}`}
                      />
                    }
                  />
                </Fragment>
              );
            })}
          </View>
          <AppText variant="caption" style={styles.footer}>
            Les professionnels activés sont affichés comme donneurs de soins et proposés à l’avenir.
          </AppText>
        </View>
      )}
    </ProfileSubScreenLayout>
  );
}

function buildStyles(theme: Theme) {
  return {
    divider: {
      ...buildSettingsStyles(theme).divider,
      marginLeft: spacing[4],
    },
    footer: {
      paddingHorizontal: spacing[1],
    },
  };
}
