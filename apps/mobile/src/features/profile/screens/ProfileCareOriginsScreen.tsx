import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { Users } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SkeletonList } from '@/components/ui/skeletons';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import {
  careOriginsQueryKey,
  fetchCareOrigins,
  setCareOriginHidden,
  type CareOrigin,
} from '../api/care-origins.service';
import { ProfileSubScreenLayout } from './ProfileSubScreenLayout';

export function ProfileCareOriginsScreen() {
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
      <AppText style={styles.lead}>
        Choisissez les professionnels affichés comme donneurs de soins et proposés à l’avenir.
      </AppText>

      {query.isLoading ? (
        <SkeletonList count={3} itemHeight={72} />
      ) : query.isError && !query.data ? (
        <ErrorState
          title="Donneurs de soins indisponibles"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          Icon={Users}
          title="Aucun donneur de soins"
          description="Les professionnels qui vous prennent en charge apparaîtront ici."
        />
      ) : (
        rows.map((item) => {
          const visible = !item.hidden_by_patient;
          const role = item.emploi || 'Professionnel de santé';
          return (
            <View key={item.id} style={styles.row}>
              <View style={styles.texts}>
                <AppText style={styles.name}>{item.display_name}</AppText>
                <AppText style={styles.role}>{role}</AppText>
                <AppText style={styles.status}>{visible ? 'Affiché' : 'Masqué'}</AppText>
              </View>
              <ToggleSwitch
                value={visible}
                onValueChange={(next) => update.mutate({ id: item.id, hidden: !next })}
                accessibilityLabel={`Afficher ${item.display_name}, ${role}`}
              />
            </View>
          );
        })
      )}
    </ProfileSubScreenLayout>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    lead: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      padding: spacing[4],
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: radius.md,
      backgroundColor: c.surface,
    },
    texts: {
      flex: 1,
      minWidth: 0,
      gap: spacing[0.5],
    },
    name: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    role: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    status: {
      ...font.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
  };
}
