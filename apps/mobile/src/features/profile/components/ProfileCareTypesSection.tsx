import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { SkeletonList } from '@/components/ui/skeletons';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartPulse } from 'lucide-react-native';
import { careCategoryEmojiForCategory } from '@oneandlab/shared-utils';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import {
  fetchNurseCategoryPreferences,
  updateNurseCategoryPreference,
} from '@/features/profile/api/profile.service';
import type { NurseCategoryPreference } from '@/features/profile/types/profile.types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { palette, radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  /** Liste seule (écran dédié, sans carte section). */
  bare?: boolean;
}

function preferenceEmoji(p: NurseCategoryPreference): string {
  return careCategoryEmojiForCategory({
    name: p.name ?? '',
    icon: p.icon ?? null,
    type: p.type === 'blood_test' ? 'blood_test' : 'nursing',
  });
}

export function ProfileCareTypesSection({ bare }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileCareTypesSection_tsx_styles');
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
    <SkeletonList count={6} itemHeight={48} gap={spacing[2]} />
  ) : prefs.length === 0 ? (
    <AppText style={[styles.empty, bare && styles.emptyBare]}>
      Aucune catégorie de soins disponible pour le moment.
    </AppText>
  ) : (
    <View style={[styles.list, bare && styles.listBare]}>
      {prefs.map((p) => {
        const enabled = Boolean(p.is_enabled);
        const busy = updatingId === p.category_id;
        return (
          <Cluster
            key={p.category_id}
            gap={spacing[3]}
            leading={
              <View style={[styles.emojiTile, enabled && styles.emojiTileEnabled]}>
                <AppText style={styles.emoji} accessibilityElementsHidden>
                  {preferenceEmoji(p)}
                </AppText>
              </View>
            }
            actions={
              <ToggleSwitch
                value={enabled}
                disabled={busy}
                onValueChange={(v) => toggle.mutate({ categoryId: p.category_id, enabled: v })}
              />
            }
            style={[styles.row, enabled && styles.rowEnabled, busy && styles.rowBusy]}
          >
            <AppText
              style={[styles.rowTitle, !enabled && styles.rowTitleOff]}
              numberOfLines={1}
            >
              {p.name ?? p.category_id}
            </AppText>
          </Cluster>
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

function buildStyles(c: AppColors) {
  return {
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textTertiary,
    textAlign: 'center' as const,
    paddingVertical: spacing[2],
  },
  emptyBare: { paddingVertical: spacing[6] },
  list: { gap: spacing[2] },
  listBare: { paddingTop: spacing[1] },
  row: {
    alignSelf: 'stretch' as const,
    width: '100%' as const,
    minHeight: 52,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
  },
  rowEnabled: {
    borderColor: palette.brand[200],
    backgroundColor: c.primaryLight,
  },
  rowBusy: { opacity: 0.55 },
  emojiTile: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: c.surfaceSubtle,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  emojiTileEnabled: {
    backgroundColor: c.surface,
    borderColor: palette.brand[200],
  },
  emoji: {
    fontSize: fontSize.lg,
    lineHeight: 24,
  },
  rowTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  rowTitleOff: {
    color: c.textSecondary,
  },
};
}

