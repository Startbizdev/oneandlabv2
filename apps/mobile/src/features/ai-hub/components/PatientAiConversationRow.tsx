import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import * as Haptics from 'expo-haptics';
import { MessageSquare } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

interface Props {
  title: string;
  active?: boolean;
  onPress: () => void;
}

/** Ligne conversation Cary — carte compacte, une ligne, tokens app. */
export function PatientAiConversationRow({ title, active = false, onPress }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

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
      >
        <View style={styles.textCol}>
          <Text
            style={[styles.title, active && styles.titleActive]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </View>
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
      marginBottom: spacing[2],
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
      top: spacing[2.5],
      bottom: spacing[2.5],
      width: 3,
      borderTopRightRadius: radius.full,
      borderBottomRightRadius: radius.full,
      backgroundColor: c.primary,
    },
    row: {
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3.5],
    },
    iconBox: {
      width: 36,
      height: 36,
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
    textCol: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm),
      color: c.textPrimary,
      letterSpacing: -0.15,
    },
    titleActive: {
      color: c.primaryDark,
    },
  };
}
