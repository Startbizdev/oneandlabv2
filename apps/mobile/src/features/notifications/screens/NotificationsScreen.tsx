import React, { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { formatBellNotificationLines } from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { markNotificationRead } from '@/features/notifications/api/notifications.service';
import { useNotificationPolling } from '@/features/notifications/hooks/use-notification-polling';
import type { AppNotification } from '@/features/notifications/api/notifications.service';
import { useAuthStore } from '@/store/auth-store';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface NotifCardProps {
  item: AppNotification;
  index: number;
  onPress: () => void;
}

const NotifCard = React.memo(function NotifCard({ item, index, onPress }: NotifCardProps) {
  const { label, message } = formatBellNotificationLines(item.title, item.message);
  const isUnread = !item.read_at;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(280).springify()}>
      <Pressable
        onPress={onPress}
        style={[styles.card, elevation.xs, isUnread && styles.cardUnread]}
      >
        {isUnread && <View style={styles.unreadDot} />}
        <View style={[styles.iconWrap, isUnread && styles.iconWrapUnread]}>
          <Bell size={16} color={isUnread ? colors.primary : colors.textTertiary} strokeWidth={2} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifLabel, isUnread && styles.notifLabelUnread]}>{label}</Text>
          {message ? <Text style={styles.notifMessage}>{message}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

export function NotificationsScreen() {
  const router = useRouter();
  const { data, refetch, isRefetching } = useNotificationPolling();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.notifications.list(10) }),
  });

  const onPress = useCallback(
    (n: AppNotification) => {
      if (!n.read_at) markRead.mutate(n.id);
      if (n.appointment_id) {
        if (role === 'nurse') router.push(`/(nurse)/appointment/${n.appointment_id}`);
        else if (role === 'preleveur') router.push(`/(preleveur)/appointment/${n.appointment_id}`);
        else if (role === 'pro') router.push(`/(pro)/appointment/${n.appointment_id}`);
        else if (role === 'patient') router.push(`/(patient)/appointment/${n.appointment_id}`);
      }
    },
    [role, router, markRead],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        renderItem={({ item, index }) => (
          <NotifCard item={item} index={index} onPress={() => onPress(item)} />
        )}
        keyExtractor={(item: AppNotification) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            Icon={Bell}
            title="Aucune notification"
            description="Vos notifications apparaîtront ici."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: {
    padding: spacing[4],
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    position: 'relative',
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryMid,
  },
  unreadDot: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapUnread: {
    backgroundColor: colors.primaryMid,
  },
  notifContent: { flex: 1, gap: 3 },
  notifLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.4,
  },
  notifLabelUnread: {
    color: colors.primaryDark,
  },
  notifMessage: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
});
