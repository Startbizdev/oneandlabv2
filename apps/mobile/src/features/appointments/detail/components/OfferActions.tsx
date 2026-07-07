import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { updateAppointment } from '../../api/appointments.service';
import {spacing, iconSize } from '@/theme';

export function OfferActions({ appointmentId, onDone }: { appointmentId: string; onDone?: () => void }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'OfferActions');
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
    <Row gap={spacing[3]} style={styles.row}>
      <View style={styles.btn}>
        <Button
          title="Accepter"
          loading={mut.isPending}
          leftIcon={<Check size={iconSize.sm} color={c.textInverse} strokeWidth={2.5} />}
          onPress={() => mut.mutate('confirmed')}
          fullWidth
        />
      </View>
      <View style={styles.btn}>
        <Button
          title="Refuser"
          variant="outline"
          loading={mut.isPending}
          leftIcon={<X size={iconSize.sm} color={c.error} strokeWidth={2.5} />}
          onPress={() => mut.mutate('refused')}
          fullWidth
        />
      </View>
    </Row>
  );
}

function buildStyles(_c: AppColors) {
  return {
    row: {
      minWidth: 0,
    },
    btn: { minWidth: 0, flex: 1 },
  };
}
