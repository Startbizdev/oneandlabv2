import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import * as Haptics from 'expo-haptics';
import { MessageSquare, Trash2 } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

interface Props {
  title: string;
  active?: boolean;
  deletable?: boolean;
  onPress: () => void;
  onDelete?: () => void;
}

/** Ligne conversation Cary — carte compacte, une ligne, tokens app. */
export function PatientAiConversationRow({
  title,
  active = false,
  deletable = true,
  onPress,
  onDelete,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert('Supprimer la conversation', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete();
        },
      },
    ]);
  };

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        active ? styles.cardActive : styles.cardIdle,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {active ? <View style={styles.activeStripe} /> : null}

      <Cluster
        gap={spacing[2.5]}
        style={styles.row}
        leading={
          <View style={[styles.iconBox, active ? styles.iconBoxActive : styles.iconBoxIdle]}>
            <MessageSquare
              size={17}
              color={active ? c.primary : c.textSecondary}
              strokeWidth={2}
            />
          </View>
        }
        actions={
          deletable && onDelete ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                handleDelete();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Supprimer la conversation"
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
            >
              <Trash2 size={16} color={c.textTertiary} strokeWidth={2} />
            </Pressable>
          ) : null
        }
      >
        <Text
          style={[styles.title, active && styles.titleActive]}
          numberOfLines={1}
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
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden' as const,
      marginBottom: spacing[1.5],
    },
    cardIdle: {
      backgroundColor: c.surface,
      borderColor: c.borderLight,
    },
    cardActive: {
      backgroundColor: c.primaryLight,
      borderColor: c.primaryMid,
    },
    cardPressed: {
      opacity: 0.9,
    },
    activeStripe: {
      position: 'absolute' as const,
      left: 0,
      top: spacing[2],
      bottom: spacing[2],
      width: 3,
      borderTopRightRadius: radius.full,
      borderBottomRightRadius: radius.full,
      backgroundColor: c.primary,
    },
    row: {
      paddingVertical: spacing[2.5],
      paddingHorizontal: spacing[3],
    },
    iconBox: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    iconBoxIdle: {
      backgroundColor: c.surfaceAlt,
    },
    iconBoxActive: {
      backgroundColor: c.surface,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.2),
      color: c.textPrimary,
      letterSpacing: -0.15,
    },
    titleActive: {
      color: c.primaryDark,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    deleteBtnPressed: {
      opacity: 0.65,
      backgroundColor: c.surfaceAlt,
    },
  };
}
