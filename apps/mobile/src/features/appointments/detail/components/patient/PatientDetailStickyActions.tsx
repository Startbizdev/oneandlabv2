import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarClock, MessageCircle } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useAppColors } from '@/theme/use-app-colors';
import { iconSize, spacing, useStyles, type Theme } from '@/theme';

interface Props {
  onOpenMessages?: () => void;
  onEditSchedule?: () => void;
}

/** Barre fixe en bas de la fiche patient — n’affiche que les actions disponibles. */
export function PatientDetailStickyActions({ onOpenMessages, onEditSchedule }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();

  if (!onOpenMessages && !onEditSchedule) return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing[3]) }]}>
      {onOpenMessages ? (
        <View style={styles.slot}>
          <Button
            title="Messages"
            variant={onEditSchedule ? 'outline' : 'primary'}
            fullWidth
            onPress={onOpenMessages}
            accessibilityLabel="Ouvrir la messagerie avec votre soignant"
            leftIcon={
              <MessageCircle
                size={iconSize.md}
                color={onEditSchedule ? c.textLink : c.onPrimary}
                strokeWidth={2.25}
              />
            }
          />
        </View>
      ) : null}
      {onEditSchedule ? (
        <View style={styles.slot}>
          <Button
            title="Modifier le créneau"
            fullWidth
            onPress={onEditSchedule}
            accessibilityLabel="Modifier la date et le créneau du rendez-vous"
            leftIcon={<CalendarClock size={iconSize.md} color={c.onPrimary} strokeWidth={2.25} />}
          />
        </View>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    bar: {
      flexDirection: 'row' as const,
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    slot: {
      flex: 1,
      minWidth: 0,
    },
  };
}
