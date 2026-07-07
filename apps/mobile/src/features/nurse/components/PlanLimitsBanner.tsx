import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Cluster, Row } from '@/components/layout/primitives';
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/api/client';
import { Button } from '@/components/ui/Button';
import {
  normalizeNursePlanLimits,
  type NursePlanLimitsApi,
} from '@/features/nurse/utils/nurse-plan-limits';
import { scrollSectionEntering } from '@/lib/platform/list-entering-animation';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function PlanLimitsBanner() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_nurse_components_PlanLimitsBanner_tsx_styles');
  const router = useRouter();
  const { data } = useQuery({
    queryKey: queryKeys.planLimits.current,
    queryFn: async () => {
      const res = await api.get<NursePlanLimitsApi>('/plan-limits');
      return res.data;
    },
  });

  const limits = data ? normalizeNursePlanLimits(data) : null;
  if (!limits?.showQuota) return null;

  const { used, max, quotaFull: full } = limits;
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;

  const entering = scrollSectionEntering(0, 350);
  const Shell = entering ? Animated.View : View;

  return (
    <Shell entering={entering} style={[styles.card, elevation.sm]}>
      <Cluster
        gap={spacing[3]}
        leading={
          <View style={styles.iconWrap}>
            <Zap size={iconSize.sm} color={full ? c.warning : c.primary} strokeWidth={2} />
          </View>
        }
      >
        <Row justify="between" align="center" flex={1}>
          <AppText style={styles.title}>Offre Découverte</AppText>
          <AppText style={[styles.pill, full ? styles.pillFull : styles.pillActive]}>
            {full ? 'Quota atteint' : 'Ce mois-ci'}
          </AppText>
        </Row>
      </Cluster>

      <AppText style={styles.countText}>
        <AppText style={[styles.countBig, full && styles.countBigFull]}>{used}</AppText>
        {' / '}{max} rendez-vous
      </AppText>

      <View style={styles.trackBg}>
        <View
          style={[
            styles.trackFill,
            { width: `${pct}%` as `${number}%` },
            full && styles.trackFull,
          ]}
        />
      </View>

      <Button
        title="Passer en PRO"
        variant={full ? 'primary' : 'outline'}
        size="sm"
        onPress={() => router.push('/(nurse)/abonnement')}
        fullWidth
      />
    </Shell>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  pill: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pillActive: {
    backgroundColor: c.primaryLight,
    color: c.primary,
  },
  pillFull: {
    backgroundColor: c.warningLight,
    color: c.warning,
  },
  countText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  countBig: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.xl,
    color: c.primary,
  },
  countBigFull: {
    color: c.warning,
  },
  trackBg: {
    height: 6,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden' as const,
  },
  trackFill: {
    height: '100%' as const,
    backgroundColor: c.primary,
    borderRadius: radius.full,
  },
  trackFull: {
    backgroundColor: c.warning,
  },
};
}

