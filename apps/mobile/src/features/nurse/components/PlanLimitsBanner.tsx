import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/api/client';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import {
  normalizeNursePlanLimits,
  type NursePlanLimitsApi,
} from '@/features/nurse/utils/nurse-plan-limits';
import { scrollSectionEntering } from '@/lib/platform/list-entering-animation';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

export function PlanLimitsBanner() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { data } = useQuery({
    queryKey: queryKeys.planLimits.current,
    queryFn: async () => {
      const res = await api.get<NursePlanLimitsApi>('/plan-limits');
      if (!res.success || !res.data) throw new Error('Limites de votre offre indisponibles');
      return res.data;
    },
  });

  const limits = data ? normalizeNursePlanLimits(data) : null;
  if (!limits?.showQuota || limits.used < Math.ceil(limits.max * 0.8)) return null;

  const { used, max, quotaFull: full } = limits;
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;

  const entering = scrollSectionEntering(0, 350);
  const Shell = entering ? Animated.View : View;

  return (
    <Shell entering={entering} style={styles.card}>
      <Row justify="between" align="center" wrap gap={spacing[2]}>
        <AppText variant="headline">Offre Découverte</AppText>
        <AppText style={[styles.count, full && styles.countFull]}>
          {used} / {max} ce mois-ci
        </AppText>
      </Row>
      <View
        style={styles.trackBg}
        accessibilityRole="progressbar"
        accessibilityLabel="Rendez-vous acceptés ce mois-ci"
        accessibilityValue={{ min: 0, max, now: Math.min(used, max) }}
      >
        <View style={[styles.trackFill, { width: `${pct}%` as `${number}%` }, full && styles.trackFull]} />
      </View>
      <AppText variant="secondary">
        {full
          ? 'Limite mensuelle atteinte. L’offre Pro supprime cette limite.'
          : `Encore ${Math.max(0, max - used)} rendez-vous possibles ce mois-ci.`}
      </AppText>
      <Button
        title="Découvrir l’offre Pro"
        variant={full ? 'primary' : 'outline'}
        size="md"
        onPress={() => router.push('/(nurse)/abonnement')}
        fullWidth
      />
    </Shell>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      padding: spacing[4],
      gap: spacing[3],
    },
    count: {
      ...text.secondary,
      ...font.medium,
      color: c.textSecondary,
    },
    countFull: {
      color: c.warning,
    },
    trackBg: {
      height: spacing[1.5],
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
