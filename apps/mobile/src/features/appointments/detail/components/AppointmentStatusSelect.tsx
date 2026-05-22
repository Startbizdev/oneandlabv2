import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { updateAppointment } from '../../api/appointments.service';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
  const { show: toast } = useToast();
  const qc = useQueryClient();

  if (role !== 'nurse' && role !== 'pro') return null;

  const mut = useMutation({
    mutationFn: (status: string) => updateAppointment(appointmentId, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(appointmentId) });
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast('Statut mis à jour', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateStatus'),
  });

  return (
    <View style={styles.wrapper}>
      <Text style={styles.overline}>Statut</Text>
      <View style={styles.pillRow}>
        {NURSE_STATUSES.map((s) => {
          const on = currentStatus === s;
          return (
            <Pressable
              key={s}
              onPress={() => mut.mutate(s)}
              disabled={mut.isPending}
              style={[styles.pill, on && styles.pillActive]}
            >
              <Text style={[styles.pillText, on && styles.pillTextActive]}>
                {STATUS_LABELS[s] ?? s}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[2] },
  overline: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  pillTextActive: { color: colors.textInverse },
});
