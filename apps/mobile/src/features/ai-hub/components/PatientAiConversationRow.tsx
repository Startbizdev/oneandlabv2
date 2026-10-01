import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { MoreHorizontal, Pin } from 'lucide-react-native';
import {
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  AppText,
  useStyles,
  font,
  type Theme,
  ICON_STROKE_WIDTH,
} from '@/theme';
import { showConversationRowActions, type ConversationRowAction } from '../utils/conversation-row-actions';

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
  const styles = useStyles(buildStyles);

  const hasActions = Boolean(onTogglePin || onArchive || (deletable && onDelete));

  const openActions = () => {
    if (!hasActions) return;

    const actions: ConversationRowAction[] = [];
    if (onTogglePin) {
      actions.push({ text: pinned ? 'Désépingler' : 'Épingler', onPress: onTogglePin });
    }
    if (onArchive) {
      actions.push({ text: archiveLabel, onPress: onArchive });
    }
    if (deletable && onDelete) {
      actions.push({ text: 'Supprimer', style: 'destructive', onPress: onDelete });
    }

    showConversationRowActions(title, actions);
  };

  return (
    <View style={[styles.row, active && styles.rowActive]}>
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onLongPress={hasActions ? openActions : undefined}
        delayLongPress={420}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={pinned ? `${title}, épinglée` : title}
        accessibilityState={{ selected: active }}
      >
        <AppText variant="body" style={[styles.title, active && styles.titleActive]}>
          {title}
        </AppText>
        {pinned ? (
          <Pin size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
        ) : null}
      </Pressable>
      {hasActions ? (
        <Pressable
          onPress={openActions}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Actions pour ${title}`}
        >
          <MoreHorizontal size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      minWidth: 0,
      borderRadius: radius.md,
      marginBottom: spacing[0.5],
    },
    rowActive: {
      backgroundColor: c.surfaceAlt,
    },
    main: {
      flex: 1,
      minWidth: 0,
      minHeight: MIN_TOUCH_TARGET,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingVertical: spacing[2.5],
      paddingLeft: spacing[3],
      borderRadius: radius.md,
    },
    pressed: {
      opacity: 0.6,
    },
    title: {
      flex: 1,
      minWidth: 0,
    },
    titleActive: {
      ...font.medium,
    },
    more: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: radius.full,
    },
  };
}
