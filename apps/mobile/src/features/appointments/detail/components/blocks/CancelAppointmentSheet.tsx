import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarX2 } from 'lucide-react-native';
import {
  cancellationReasonRequiresPhoto,
  staffCancellationCanSubmit,
} from '@oneandlab/shared-constants';
import type { Appointment } from '@oneandlab/shared-types';
import { Cluster, Row } from '@/components/layout/primitives';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { patientDisplayName } from '@/utils/appointment-detail-display';
import { cancelAppointment } from '../../api/appointment-detail.service';
import {
  StaffCancellationFields,
  type StaffCancellationValues,
} from './StaffCancellationFields';
import {
  carePhotoPickErrorMessage,
  pickCarePhoto,
} from '@/lib/uploads/pick-care-photo';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  visible: boolean;
  /** RDV à annuler (côté soignant / pro : motif obligatoire). */
  target: Appointment;
  onDone: () => void;
  onClose: () => void;
}

const EMPTY_STAFF: StaffCancellationValues = { reason: '', comment: '' };

/** Annulation côté soignant / pro — l’annulation patient passe par `PatientCancelAppointmentSheet`. */
export function CancelAppointmentSheet({ visible, target, onDone, onClose }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [staff, setStaff] = useState<StaffCancellationValues>(EMPTY_STAFF);
  const [sheetVisible, setSheetVisible] = useState(false);
  const pickingPhotoRef = useRef(false);
  const canSubmitStaff = staffCancellationCanSubmit(staff.reason, staff.comment);
  const targetLabel = patientDisplayName(target);

  useEffect(() => {
    if (visible) {
      setSheetVisible(true);
    } else {
      setSheetVisible(false);
      pickingPhotoRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setStaff(EMPTY_STAFF);
    }
  }, [visible]);

  function patchStaff(patch: Partial<StaffCancellationValues>) {
    setStaff((prev) => {
      const next = { ...prev, ...patch };
      if (patch.reason != null && !cancellationReasonRequiresPhoto(patch.reason)) {
        next.photoUri = undefined;
        next.photoName = undefined;
        next.photoMimeType = undefined;
      }
      return next;
    });
  }

  const handleSheetDismissed = useCallback(() => {
    if (!pickingPhotoRef.current) return;
    pickingPhotoRef.current = false;

    void (async () => {
      try {
        const picked = await pickCarePhoto();
        if (picked) {
          patchStaff({
            photoUri: picked.uri,
            photoName: picked.fileName,
            photoMimeType: picked.mimeType,
          });
        }
      } catch (e) {
        toast(carePhotoPickErrorMessage(e), { type: 'warning' });
      } finally {
        if (visible) setSheetVisible(true);
      }
    })();
  }, [toast, visible]);

  const beginPhotoPick = useCallback(() => {
    pickingPhotoRef.current = true;
    setSheetVisible(false);
  }, []);

  const mut = useMutation({
    mutationFn: () =>
      cancelAppointment(target.id, {
        reason: staff.reason,
        comment: staff.comment.trim(),
        photoUri: staff.photoUri,
        photoName: staff.photoName,
        photoMimeType: staff.photoMimeType,
      }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast(r.error ?? 'Annulation impossible', { type: 'error' });
        return;
      }
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast('Rendez-vous annulé', { type: 'success' });
      onDone();
    },
    onError: (e) => handleApiError(e, toast, 'cancelAppointment'),
  });

  const footer = (
    <View style={styles.footer}>
      <Button
        title="Confirmer l'annulation"
        variant="destructive"
        size="lg"
        fullWidth
        loading={mut.isPending}
        disabled={!canSubmitStaff}
        onPress={() => mut.mutate()}
      />
      <Button title="Retour" variant="outline" size="lg" fullWidth onPress={onClose} />
    </View>
  );

  return (
    <SheetModal
      visible={sheetVisible}
      presentKey={target.id}
      onClose={onClose}
      onDismissed={handleSheetDismissed}
      title="Annuler le rendez-vous"
      subtitle="Indiquez la raison avant de confirmer l’annulation."
      footer={footer}
    >
      <View style={styles.summaryCard}>
        <Cluster
          gap={spacing[2]}
          align="center"
          style={styles.warningStrip}
          leading={<AlertTriangle size={iconSize.sm} color={c.error} strokeWidth={2.25} />}
        >
          <AppText style={styles.warningText}>Cette action est irréversible.</AppText>
        </Cluster>

        {targetLabel ? (
          <>
            <View style={styles.summaryDivider} />
            <Cluster
              gap={spacing[3]}
              align="center"
              style={styles.targetRow}
              leading={
                <View style={styles.targetIcon}>
                  <CalendarX2 size={iconSize.sm} color={c.primary} strokeWidth={2.25} />
                </View>
              }
            >
              <View style={styles.targetCopy}>
                <AppText style={styles.targetKicker}>Rendez-vous concerné</AppText>
                <AppText style={styles.targetName} numberOfLines={2}>
                  {targetLabel}
                </AppText>
              </View>
            </Cluster>
          </>
        ) : null}
      </View>

      <View style={styles.formSection}>
        <AppText style={styles.formTitle}>Motif d'annulation</AppText>
        <StaffCancellationFields values={staff} onChange={patchStaff} onPickPhoto={beginPhotoPick} />
      </View>
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
    backgroundColor: c.surface,
  },
  warningStrip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: c.errorLight,
  },
  warningText: {
    ...font.semiBold,
    fontSize: fontSize.xs,
    color: c.error,
    lineHeight: fontSize.xs * 1.45,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
  },
  targetRow: {
    padding: spacing[3],
  },
  targetIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  targetCopy: {
    gap: 2,
  },
  targetKicker: {
    ...font.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  targetName: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  formSection: {
    gap: spacing[3],
  },
  formTitle: {
    ...font.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  footer: {
    gap: spacing[2],
  },
};
}

