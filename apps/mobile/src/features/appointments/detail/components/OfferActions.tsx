import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { updateAppointment } from '../../api/appointments.service';
import { colors, spacing } from '@/theme';

export function OfferActions({ appointmentId, onDone }: { appointmentId: string; onDone?: () => void }) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (status: string) => updateAppointment(appointmentId, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('Rendez-vous mis à jour', { type: 'success' });
      onDone?.();
    },
    onError: (e: Error) => toast('Erreur', { message: e.message, type: 'error' }),
  });

  return (
    <View style={styles.row}>
      <View style={styles.btn}>
        <Button
          title="Accepter"
          loading={mut.isPending}
          leftIcon={<Check size={16} color={colors.textInverse} strokeWidth={2.5} />}
          onPress={() => mut.mutate('confirmed')}
          fullWidth
        />
      </View>
      <View style={styles.btn}>
        <Button
          title="Refuser"
          variant="outline"
          loading={mut.isPending}
          leftIcon={<X size={16} color={colors.error} strokeWidth={2.5} />}
          onPress={() => mut.mutate('refused')}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  btn: { flex: 1 },
});
