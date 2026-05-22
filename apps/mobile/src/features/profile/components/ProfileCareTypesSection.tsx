import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartPulse } from 'lucide-react-native';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import {
  fetchNurseCategoryPreferences,
  updateNurseCategoryPreference,
} from '@/features/profile/api/profile.service';
import type { NurseCategoryPreference } from '@/features/profile/types/profile.types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  /** Liste seule (écran dédié, sans carte section). */
  bare?: boolean;
}

export function ProfileCareTypesSection({ bare }: Props) {
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
  const updatingId = toggle.isPending ? toggle.variables?.categoryId : null;

  const body = q.isLoading ? (
    <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing[4] }} />
  ) : prefs.length === 0 ? (
    <Text style={[styles.empty, bare && styles.emptyBare]}>
      Aucune catégorie de soins disponible pour le moment.
    </Text>
  ) : (
    <View style={[styles.list, bare && styles.listBare]}>
      {prefs.map((p) => {
        const enabled = Boolean(p.is_enabled);
        const busy = updatingId === p.category_id;
        return (
          <Pressable
            key={p.category_id}
            onPress={() =>
              !busy && toggle.mutate({ categoryId: p.category_id, enabled: !enabled })
            }
            style={[styles.row, enabled && styles.rowEnabled, busy && styles.rowBusy]}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{p.name ?? p.category_id}</Text>
              {p.description ? (
                <Text style={styles.rowDesc} numberOfLines={2}>
                  {p.description}
                </Text>
              ) : null}
              <Text style={[styles.status, enabled ? styles.statusOn : styles.statusOff]}>
                {enabled ? 'Activé' : 'Désactivé'}
              </Text>
            </View>
            <Switch
              value={enabled}
              disabled={busy}
              onValueChange={(v) => toggle.mutate({ categoryId: p.category_id, enabled: v })}
              trackColor={{ false: colors.border, true: colors.primaryMid }}
              thumbColor={enabled ? colors.primary : colors.textTertiary}
            />
          </Pressable>
        );
      })}
    </View>
  );

  if (bare) return body;

  return (
    <ProfileSection
      title="Types de soins acceptés"
      description="Activez ou désactivez les soins que vous proposez"
      Icon={HeartPulse}
    >
      {body}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing[2],
  },
  emptyBare: { paddingVertical: spacing[6] },
  list: { gap: spacing[2] },
  listBare: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
  },
  rowEnabled: {
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
  },
  rowBusy: { opacity: 0.6 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  rowDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
  status: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  statusOn: { color: colors.primary },
  statusOff: { color: colors.textTertiary },
});
