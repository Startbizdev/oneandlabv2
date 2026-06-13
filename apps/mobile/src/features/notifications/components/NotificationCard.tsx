import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ListRowShell } from '@/components/ui/ListRowShell';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import type { AppNotification } from '@/features/notifications/api/notifications.service';
import { resolveNotificationDisplayLines } from '@/features/notifications/utils/notification-display-lines';
import {
  formatNotificationTime,
  notificationVisual,
} from '@/features/notifications/utils/notification-card-meta';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  item: AppNotification;
  onPress: () => void;
}

export const NotificationCard = React.memo(function NotificationCard({ item, onPress }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'NotificationCard');

  const { label, message } = resolveNotificationDisplayLines(item);
  const isUnread = !item.read_at;
  const time = formatNotificationTime(item.created_at);
  const { Icon, color, bg } = notificationVisual(item.type);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        isUnread && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
    >
      {isUnread ? <View style={styles.unreadStripe} /> : null}

      <ListRowShell
        leading={
          <View style={[styles.iconBox, { backgroundColor: bg }]}>
            <Icon size={18} color={color} strokeWidth={2} />
          </View>
        }
        body={
          <>
            <Row align="start">
              <View style={styles.titleWrap}>
                <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
                  {label}
                </Text>
              </View>
              {time ? <Text style={styles.time}>{time}</Text> : null}
            </Row>
            {message ? <Text style={styles.body}>{message}</Text> : null}
          </>
        }
        trailing={<ChevronRight size={16} color={c.textTertiary} strokeWidth={2} />}
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
