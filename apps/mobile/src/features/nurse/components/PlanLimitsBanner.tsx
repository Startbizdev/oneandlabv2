import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function PlanLimitsBanner() {
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

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()} style={[styles.card, elevation.sm]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Zap size={16} color={full ? colors.warning : colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Animated.Text style={styles.title}>Offre Découverte</Animated.Text>
          <Animated.Text style={[styles.pill, full ? styles.pillFull : styles.pillActive]}>
            {full ? 'Quota atteint' : 'Ce mois-ci'}
          </Animated.Text>
        </View>
      </View>

      <Animated.Text style={styles.countText}>
        <Animated.Text style={[styles.countBig, full && styles.countBigFull]}>{used}</Animated.Text>
        {' / '}{max} rendez-vous
      </Animated.Text>

      <View style={styles.trackBg}>
        <Animated.View
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  pill: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xs'],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pillActive: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
  },
  pillFull: {
    backgroundColor: colors.warningLight,
    color: colors.warning,
  },
  countText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  countBig: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.xl,
    color: colors.primary,
  },
  countBigFull: {
    color: colors.warning,
  },
  trackBg: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  trackFull: {
    backgroundColor: colors.warning,
  },
});
