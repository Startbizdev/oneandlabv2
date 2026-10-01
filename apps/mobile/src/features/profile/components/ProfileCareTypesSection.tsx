import { Fragment } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { SkeletonList } from '@/components/ui/skeletons';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { CareIcon } from '@/features/categories/components/CareIcon';
import {
  fetchNurseCategoryPreferences,
  updateNurseCategoryPreference,
} from '@/features/profile/api/profile.service';
import type { NurseCategoryPreference } from '@/features/profile/types/profile.types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { spacing, AppText, useStyles } from '@/theme';

/** Soins proposés par l’infirmier : un interrupteur par catégorie, enregistré à chaque bascule. */
export function ProfileCareTypesSection() {
  const settings = useStyles(buildSettingsStyles);
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: queryKeys.profile.nursePreferences,
    queryFn: async () => {
      const res = await fetchNurseCategoryPreferences();
      const rows = res.data ?? [];
      return rows.map((p) => ({
        ...p,
        category_id: p.category_id ?? (p as { id?: string }).id ?? '',
        is_enabled: Boolean(p.is_enabled),
      })) as NurseCategoryPreference[];
    },
  });

  const toggle = useMutation({
    mutationFn: ({ categoryId, enabled }: { categoryId: string; enabled: boolean }) =>
      updateNurseCategoryPreference(categoryId, enabled),
    onSuccess: (_d, vars) => {
      toast(vars.enabled ? 'Soin activé' : 'Soin désactivé', { type: 'success' });
      void qc.invalidateQueries({ queryKey: queryKeys.profile.nursePreferences });
    },
    onError: (e) => handleApiError(e, toast, 'nurse-category-preference'),
  });

  const prefs = q.data ?? [];

  if (q.isLoading) return <SkeletonList count={6} itemHeight={56} gap={spacing[2]} />;
  if (q.isError) {
    return <ErrorState title="Soins indisponibles" error={q.error} onRetry={() => void q.refetch()} />;
  }
  if (prefs.length === 0) {
    return (
      <EmptyState
        illustration="requests"
        title="Aucun soin disponible"
        description="Les catégories de soins apparaîtront ici dès leur ouverture."
      />
    );
  }

  return (
    <View style={settings.section}>
      <View style={settings.sectionCard}>
        {prefs.map((p, index) => (
          <Fragment key={p.category_id}>
            {index > 0 ? <View style={settings.divider} /> : null}
            <ListRowShell
              style={settings.row}
              leading={<CareIcon care={p} variant="well" />}
              body={<AppText style={settings.label}>{p.name ?? p.category_id}</AppText>}
              trailing={
                <ToggleSwitch
                  value={Boolean(p.is_enabled)}
                  disabled={toggle.isPending}
                  accessibilityLabel={p.name ?? 'Ce soin'}
                  onValueChange={(v) => toggle.mutate({ categoryId: p.category_id, enabled: v })}
                />
              }
            />
          </Fragment>
        ))}
      </View>
      <AppText variant="caption" style={styles.footer}>
        Chaque modification est enregistrée automatiquement.
      </AppText>
    </View>
  );
}

function buildStyles() {
  return {
    footer: {
      paddingHorizontal: spacing[1],
    },
  };
}
