import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { ListRowShell } from '@/components/ui/ListRowShell';
import type { AppNotification } from '@/features/notifications/api/notifications.service';
import { useAuthStore } from '@/store/auth-store';
import { resolveNotificationDisplayLines } from '@/features/notifications/utils/notification-display-lines';
import { resolveNotificationNavigation } from '@/features/notifications/utils/notification-navigation';
import {
  formatNotificationTime,
  notificationIcon,
} from '@/features/notifications/utils/notification-card-meta';
import { usePharmacyModuleEnabled } from '@/features/pharmacy-orders/hooks/use-pharmacy-module-enabled';
import { radius, spacing, iconSize, ICON_STROKE_WIDTH, AppText, useStyles, font, type Theme } from '@/theme';

const ICON_WELL = 36;
const UNREAD_DOT = 8;

interface Props {
  item: AppNotification;
  /** Première / dernière ligne de son groupe de jour (coins arrondis, séparateur). */
  first: boolean;
  last: boolean;
  onPress: () => void;
}

export const NotificationCard = React.memo(function NotificationCard({ item, first, last, onPress }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const role = useAuthStore((s) => s.user?.role);
  const { isOwnPharmacy } = usePharmacyModuleEnabled();

  const { label, message } = resolveNotificationDisplayLines(item);
  const isUnread = !item.read_at;
  const hasLink = resolveNotificationNavigation(item, role, { isPharmacyAccount: isOwnPharmacy }) !== null;
  const time = formatNotificationTime(item.created_at);
  const Icon = notificationIcon(item.type);
  const pressable = hasLink || isUnread;

  return (
    <Pressable
      onPress={() => {
        if (!pressable) return;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={!pressable}
      style={({ pressed }) => [
        styles.row,
        first && styles.rowFirst,
        last && styles.rowLast,
        pressable && pressed && styles.rowPressed,
      ]}
      accessibilityRole={pressable ? 'button' : 'text'}
      accessibilityLabel={[isUnread ? 'Non lue' : null, label, message, time].filter(Boolean).join(', ')}
      accessibilityHint={
        hasLink ? 'Ouvre le détail' : isUnread ? 'Marque la notification comme lue' : undefined
      }
    >
      {!first ? <View style={styles.divider} /> : null}
      <ListRowShell
        style={styles.shell}
        leading={
          <View style={styles.iconWell}>
            <Icon size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        }
        body={
          <View style={styles.texts}>
            <Row align="start" gap={spacing[2]}>
              <AppText style={[styles.title, isUnread && styles.titleUnread]}>{label}</AppText>
              {time ? <AppText variant="caption" style={styles.time}>{time}</AppText> : null}
            </Row>
            {message ? <AppText variant="secondary">{message}</AppText> : null}
          </View>
        }
        trailing={
          isUnread || hasLink ? (
            <>
              {isUnread ? <View style={styles.unreadDot} /> : null}
              {hasLink ? (
                <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
              ) : null}
            </>
          ) : null
        }
      />
    </Pressable>
  );
});

function buildStyles({ colors: c, text }: Theme) {
  return {
    row: {
      alignSelf: 'stretch' as const,
      backgroundColor: c.surface,
      borderColor: c.cardBorder,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden' as const,
    },
    rowFirst: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    rowLast: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
    },
    rowPressed: {
      backgroundColor: c.surfaceAlt,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing[4] + ICON_WELL + spacing[3],
      backgroundColor: c.borderLight,
    },
    shell: {
      alignItems: 'flex-start' as const,
    },
    iconWell: {
      width: ICON_WELL,
      height: ICON_WELL,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.surfaceAlt,
    },
    texts: {
      gap: spacing[0.5],
    },
    title: {
      ...text.body,
      ...font.medium,
      flex: 1,
      minWidth: 0,
      color: c.textPrimary,
    },
    titleUnread: {
      ...font.semiBold,
    },
    time: {
      flexShrink: 0,
    },
    unreadDot: {
      width: UNREAD_DOT,
      height: UNREAD_DOT,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
  };
}
