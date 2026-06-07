import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarCheck, Clock } from 'lucide-react-native';
import dayjs from 'dayjs';
import { api } from '@/api/client';
import { SkeletonDashboardStats } from '@/components/ui/skeletons';
import { useAuthStore } from '@/store/auth-store';
import { elevation, radius, spacing } from '@/theme';
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

function StatCard({ label, value, icon, accent = colors.primary, index }: StatCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(300).springify()}
      style={[styles.statCard, elevation.xs]}
    >
      <View style={[styles.statIcon, { backgroundColor: accent + '18' }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

export function ProDashboardScreen() {
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(280).springify()} style={styles.header}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name}>{firstName} 👋</Text>
        </Animated.View>

        {/* Stats grid */}
        {statsQ.isLoading ? (
          <SkeletonDashboardStats />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              index={0}
              label="Total RDV"
              value={statsQ.data?.total ?? 0}
              icon={<Activity size={18} color={colors.primary} strokeWidth={2} />}
            />
            <StatCard
              index={1}
              label="En attente"
              value={statsQ.data?.pending ?? 0}
              accent={colors.warning}
              icon={<Clock size={18} color={colors.warning} strokeWidth={2} />}
            />
            <StatCard
              index={2}
              label="Aujourd'hui"
              value={statsQ.data?.today ?? 0}
              accent={colors.success}
              icon={<CalendarCheck size={18} color={colors.success} strokeWidth={2} />}
            />
          </View>
        )}

        {/* Today date */}
        <Animated.View entering={FadeInDown.delay(220).duration(280).springify()} style={[styles.dateCard, elevation.xs]}>
          <Text style={styles.dateDay}>{dayjs().format('dddd')}</Text>
          <Text style={styles.dateLabel}>{dayjs().format('D MMMM YYYY')}</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { flex: 1, backgroundColor: c.background },
  scroll: { flex: 1 },
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
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[2],
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    textTransform: 'capitalize',
  },
  dateLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textSecondary,
    textTransform: 'capitalize',
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_pro_screens_ProDashboardScreen_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
