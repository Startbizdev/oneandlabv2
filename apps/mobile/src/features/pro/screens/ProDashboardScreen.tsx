import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { ScrollView, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarCheck, Clock } from 'lucide-react-native';
import dayjs from 'dayjs';
import { api } from '@/api/client';
import { SkeletonDashboardStats } from '@/components/ui/skeletons';
import { useAuthStore } from '@/store/auth-store';
import { scrollChildEntering, scrollSectionEntering } from '@/lib/platform/list-entering-animation';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function greeting() {
  const h = dayjs().hour();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  index: number;
}

function StatCard({ label, value, icon, accent, index }: StatCardProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'ProDashboardScreen.StatCard');
  const accentColor = accent ?? c.primary;
  const entering = scrollChildEntering(index, 60, 300);
  const Shell = entering ? Animated.View : View;
  return (
    <Shell
      entering={entering}
      style={[styles.statCard, elevation.xs]}
    >
      <View style={[styles.statIcon, { backgroundColor: accentColor + '18' }]}>{icon}</View>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </Shell>
  );
}

export function ProDashboardScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_pro_screens_ProDashboardScreen_tsx_styles');
  const user = useAuthStore((s) => s.user);

  const statsQ = useQuery({
    queryKey: ['pro', 'dashboard-stats'] as const,
    queryFn: async () => {
      const total = await api.get<Record<string, number>>('/appointments?limit=1');
      const pending = await api.get<unknown[]>('/appointments?status=pending&limit=50');
      const today = await api.get<unknown[]>(
        `/appointments?date_from=${dayjs().format('YYYY-MM-DD')}&date_to=${dayjs().format('YYYY-MM-DD')}&limit=50`,
      );
      return {
        total: total.pagination?.total ?? 0,
        pending: pending.data?.length ?? 0,
        today: today.data?.length ?? 0,
      };
    },
  });

  const firstName = user?.first_name ?? user?.email?.split('@')[0] ?? 'Docteur';

  const headerEntering = scrollSectionEntering(0, 280);
  const dateEntering = scrollSectionEntering(220, 280);
  const HeaderShell = headerEntering ? Animated.View : View;
  const DateShell = dateEntering ? Animated.View : View;

  return (
    <View style={styles.container} collapsable={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        collapsable={false}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <HeaderShell entering={headerEntering} style={styles.header}>
          <AppText style={styles.greeting}>{greeting()},</AppText>
          <AppText style={styles.name}>{firstName} 👋</AppText>
        </HeaderShell>

        {/* Stats grid */}
        {statsQ.isLoading ? (
          <SkeletonDashboardStats />
        ) : (
          <Row gap={spacing[3]} style={styles.statsGrid}>
            <StatCard
              index={0}
              label="Total RDV"
              value={statsQ.data?.total ?? 0}
              icon={<Activity size={iconSize.mdSm} color={c.primary} strokeWidth={2} />}
            />
            <StatCard
              index={1}
              label="En attente"
              value={statsQ.data?.pending ?? 0}
              accent={c.warning}
              icon={<Clock size={iconSize.mdSm} color={c.warning} strokeWidth={2} />}
            />
            <StatCard
              index={2}
              label="Aujourd'hui"
              value={statsQ.data?.today ?? 0}
              accent={c.success}
              icon={<CalendarCheck size={iconSize.mdSm} color={c.success} strokeWidth={2} />}
            />
          </Row>
        )}

        {/* Today date */}
        <DateShell entering={dateEntering} style={[styles.dateCard, elevation.xs]}>
          <AppText style={styles.dateDay}>{dayjs().format('dddd')}</AppText>
          <AppText style={styles.dateLabel}>{dayjs().format('D MMMM YYYY')}</AppText>
        </DateShell>
      </ScrollView>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  scroll: { minWidth: 0, flex: 1 },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  header: {
    paddingTop: spacing[2],
  },
  greeting: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    color: c.textSecondary,
  },
  name: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['3xl'],
    color: c.textPrimary,
    letterSpacing: -0.8,
  },
  statsGrid: {},
  statCard: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[2],
    alignItems: 'flex-start' as const,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  dateCard: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[1],
  },
  dateDay: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    color: c.primary,
    textTransform: 'capitalize' as const,
  },
  dateLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textSecondary,
    textTransform: 'capitalize' as const,
  },
};
}

