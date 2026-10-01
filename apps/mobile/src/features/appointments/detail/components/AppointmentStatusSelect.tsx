import { Row } from '@/components/layout/primitives';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { updateAppointment } from '../../api/appointments.service';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

const NURSE_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'canceled'] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  in_progress: 'En cours',
  completed: 'Terminé',
  canceled: 'Annulé',
};

interface Props {
  appointmentId: string;
  currentStatus: string;
  role: string;
}

export function AppointmentStatusSelect({ appointmentId, currentStatus, role }: Props) {
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: (status: string) => updateAppointment(appointmentId, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(appointmentId) });
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast('Statut mis à jour', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateStatus'),
  });

  if (role !== 'nurse' && role !== 'pro') return null;

  return (
    <View style={styles.wrapper}>
      <AppText style={styles.overline}>Statut</AppText>
      <Row wrap gap={spacing[2]}>
        {NURSE_STATUSES.map((s) => {
          const on = currentStatus === s;
          return (
            <Pressable
              key={s}
              onPress={() => mut.mutate(s)}
              disabled={mut.isPending}
              style={[styles.pill, on && styles.pillActive]}
            >
              <AppText style={[styles.pillText, on && styles.pillTextActive]}>
                {STATUS_LABELS[s] ?? s}
              </AppText>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrapper: { gap: spacing[2] },
  overline: {
    ...font.bold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  pillActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  pillText: {
    ...font.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  pillTextActive: { color: c.textInverse },
};
}

