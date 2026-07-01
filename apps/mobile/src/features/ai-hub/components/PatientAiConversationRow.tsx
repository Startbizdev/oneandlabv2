import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { Cluster } from '@/components/layout/primitives';
import * as Haptics from 'expo-haptics';
import { MessageSquare, Pin } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';
import { showConversationRowActions } from '../utils/conversation-row-actions';

interface Props {
  title: string;
  active?: boolean;
  pinned?: boolean;
  deletable?: boolean;
  onPress: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onArchive?: () => void;
  archiveLabel?: string;
}

export function PatientAiConversationRow({
  title,
  active = false,
  pinned = false,
  deletable = true,
  onPress,
  onDelete,
  onTogglePin,
  onArchive,
  archiveLabel = 'Archiver',
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PatientAiConversationRow');

  const canLongPress = Boolean(onTogglePin || onArchive || (deletable && onDelete));

  const handleLongPress = () => {
    if (!canLongPress) return;

    const actions = [];
    if (onTogglePin) {
      actions.push({
        text: pinned ? 'Désépingler' : 'Épingler',
        onPress: onTogglePin,
      });
    }
    if (onArchive) {
      actions.push({ text: archiveLabel, onPress: onArchive });
    }
    if (deletable && onDelete) {
      actions.push({
        text: 'Supprimer',
        style: 'destructive' as const,
        onPress: onDelete,
      });
    }

    showConversationRowActions(title, actions);
  };

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={canLongPress ? handleLongPress : undefined}
      delayLongPress={420}
      style={({ pressed }) => [
        styles.card,
        active && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityHint={canLongPress ? 'Maintenir pour épingler, archiver ou supprimer' : undefined}
    >
      <Cluster
        gap={spacing[2.5]}
        align="start"
        style={styles.row}
        leading={
          <View style={[styles.bubble, active ? styles.bubbleActive : styles.bubbleIdle]}>
            <MessageSquare
              size={16}
              color={active ? c.primary : c.textSecondary}
              strokeWidth={2}
            />
            {pinned ? (
              <View style={styles.pinBadge}>
                <Pin size={9} color={c.primary} strokeWidth={2.5} fill={c.primary} />
              </View>
            ) : null}
          </View>
        }
      >
        <Text
          style={[styles.title, active && styles.titleActive]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      </Cluster>
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      alignSelf: 'stretch' as const,
      borderRadius: radius.lg,
      marginBottom: spacing[0.5],
    },
    cardActive: {
      backgroundColor: c.surfaceAlt,
    },
    cardPressed: {
      backgroundColor: c.surfaceAlt,
      opacity: 0.92,
    },
    row: {
      paddingVertical: spacing[2.5],
      paddingHorizontal: spacing[3],
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    bubble: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    bubbleIdle: {
      backgroundColor: c.surfaceAlt,
    },
    bubbleActive: {
      backgroundColor: c.primaryLight,
    },
    pinBadge: {
      position: 'absolute' as const,
      top: -3,
      right: -3,
      width: 14,
      height: 14,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.45),
      color: c.textPrimary,
      letterSpacing: -0.1,
      paddingTop: 4,
    },
    titleActive: {
      fontFamily: fontFamily.medium,
      color: c.textPrimary,
    },
  };
}
