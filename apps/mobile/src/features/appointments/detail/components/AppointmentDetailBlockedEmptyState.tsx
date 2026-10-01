import { View } from 'react-native';
import { CalendarX2, CircleAlert, Lock, UserCheck, type LucideIcon } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  APPOINTMENT_ACCESS_DENIED,
  APPOINTMENT_ALREADY_ACCEPTED,
  APPOINTMENT_UNAVAILABLE,
  appointmentDetailBlockedCopy,
  type AppointmentDetailBlock,
} from '@/features/appointments/hooks/appointment-detail-result';
import { useStyles, type Theme } from '@/theme';

interface Props {
  onBack: () => void;
  block?: AppointmentDetailBlock | null;
  title?: string;
  description?: string;
}

const BLOCK_ICON: Record<AppointmentDetailBlock, LucideIcon> = {
  [APPOINTMENT_ALREADY_ACCEPTED]: UserCheck,
  [APPOINTMENT_UNAVAILABLE]: CalendarX2,
  [APPOINTMENT_ACCESS_DENIED]: Lock,
};

export function AppointmentDetailBlockedEmptyState({
  onBack,
  block = null,
  title,
  description,
}: Props) {
  const styles = useStyles(buildStyles);

  const copy = appointmentDetailBlockedCopy(block);
  return (
    <View style={styles.wrap}>
      <EmptyState
        Icon={block ? BLOCK_ICON[block] : CircleAlert}
        title={title ?? copy.title}
        description={description ?? copy.description}
        actionLabel="Retour"
        onAction={onBack}
      />
    </View>
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
