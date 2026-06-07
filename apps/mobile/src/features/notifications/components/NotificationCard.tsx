import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

/**
 * Carte notification — layout row strict (doc RN flexbox) :
 * [icône fixe] [colonne texte flex:1 minWidth:0] [chevron fixe]
 * `minWidth: 0` sur la colonne texte est indispensable pour le retour à la ligne.
 */
export const NotificationCard = React.memo(function NotificationCard({ item, onPress }: Props) {
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

      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Icon size={18} color={color} strokeWidth={2} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleLine}>
            <View style={styles.titleWrap}>
              <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
                {label}
              </Text>
            </View>
            {time ? <Text style={styles.time}>{time}</Text> : null}
          </View>
          {message ? (
            <Text style={styles.body}>{message}</Text>
          ) : null}
        </View>

        <View style={styles.chevron}>
          <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
});

const ICON = 40;
const CHEVRON = 16;

function buildStyles(c: AppColors) {
  return {
  card: {
    alignSelf: 'stretch',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: c.primaryLight,
  },
  cardPressed: {
    opacity: 0.88,
  },
  unreadStripe: {
    position: 'absolute',
    left: 0,
    top: spacing[3],
    bottom: spacing[3],
    width: 3,
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
    backgroundColor: c.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  iconBox: {
    width: ICON,
    height: ICON,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[2],
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  chevron: {
    width: CHEVRON,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_notifications_components_NotificationCard_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
