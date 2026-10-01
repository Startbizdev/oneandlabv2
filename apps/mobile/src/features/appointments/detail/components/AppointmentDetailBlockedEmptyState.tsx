import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  APPOINTMENT_ALREADY_ACCEPTED,
  appointmentDetailBlockedCopy,
  type AppointmentDetailBlock,
} from '@/features/appointments/hooks/appointment-detail-result';
import { useStyles, type Theme } from '@/theme';


interface Props {
  onBack: () => void;
  block?: AppointmentDetailBlock | null;
  title?: string;
  description?: string;
  emoji?: string;
}

export function AppointmentDetailBlockedEmptyState({
  onBack,
  block = null,
  title,
  description,
  emoji,
}: Props) {
  const styles = useStyles(buildStyles);

  const copy = appointmentDetailBlockedCopy(block);
  return (
    <View style={styles.wrap}>
      <EmptyState
        emoji={emoji ?? copy.emoji}
        emojiSize={64}
        title={title ?? copy.title}
        description={description ?? copy.description}
        actionLabel="Retour"
        onAction={onBack}
      />
    </View>
  );
}

/** @deprecated Utiliser AppointmentDetailBlockedEmptyState */
export function AppointmentAlreadyAcceptedEmptyState({ onBack }: { onBack: () => void }) {
  return (
    <AppointmentDetailBlockedEmptyState onBack={onBack} block={APPOINTMENT_ALREADY_ACCEPTED} />
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
  wrap: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center' as const,
  },
};
}
