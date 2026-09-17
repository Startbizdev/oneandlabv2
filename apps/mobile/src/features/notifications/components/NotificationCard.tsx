import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ListRowShell } from '@/components/ui/ListRowShell';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import type { AppNotification } from '@/features/notifications/api/notifications.service';
import { useAuthStore } from '@/store/auth-store';
import { resolveNotificationDisplayLines } from '@/features/notifications/utils/notification-display-lines';
import { notificationIsNavigable } from '@/features/notifications/utils/notification-navigation';
import {
  formatNotificationTime,
  notificationVisual,
} from '@/features/notifications/utils/notification-card-meta';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  item: AppNotification;
  onPress: () => void;
}

export const NotificationCard = React.memo(function NotificationCard({ item, onPress }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'NotificationCard');
  const role = useAuthStore((s) => s.user?.role);

  const { label, message } = resolveNotificationDisplayLines(item);
  const isUnread = !item.read_at;
  const hasLink = notificationIsNavigable(item, role);
  const time = formatNotificationTime(item.created_at);
  const { Icon, color, bg } = notificationVisual(item.type);

  return (
    <Pressable
      onPress={() => {
        if (!hasLink) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={!hasLink}
      style={({ pressed }) => [
        styles.card,
        isUnread && styles.cardUnread,
        !hasLink && styles.cardStatic,
        hasLink && pressed && styles.cardPressed,
      ]}
      accessibilityRole={hasLink ? 'button' : 'text'}
    >
      {isUnread ? <View style={styles.unreadStripe} /> : null}

      <ListRowShell
        leading={
          <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <Icon size={iconSize.mdSm} color={color} strokeWidth={2} />
          </View>
        }
        body={
          <>
            <Row align="start">
              <View style={styles.titleWrap}>
                <AppText style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
                  {label}
                </AppText>
              </View>
              {time ? <AppText style={styles.time}>{time}</AppText> : null}
            </Row>
            {message ? <AppText style={styles.body}>{message}</AppText> : null}
          </>
        }
        trailing={
          hasLink ? (
            <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />
          ) : null
        }
      />
    </Pressable>
  );
});

function buildStyles(c: AppColors) {
  return {
    card: {
      alignSelf: 'stretch' as const,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
      overflow: 'hidden' as const,
    },
    cardUnread: {
      backgroundColor: c.primaryLight,
    },
    cardPressed: {
      opacity: 0.88,
    },
    cardStatic: {
      opacity: 1,
    },
    unreadStripe: {
      position: 'absolute' as const,
      left: 0,
      top: spacing[3],
      bottom: spacing[3],
      width: 3,
      borderTopRightRadius: radius.full,
      borderBottomRightRadius: radius.full,
      backgroundColor: c.primary,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[2],
  },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      letterSpacing: -0.15,
    },
    titleUnread: {
      fontFamily: fontFamily.bold,
    },
    time: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: 14,
      flexShrink: 0,
      paddingTop: 1,
    },
    body: {
      marginTop: spacing[1],
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.5,
    },
  };
}
