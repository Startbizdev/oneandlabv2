import { useEffect, useState } from 'react';
import { View } from 'react-native';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TRANSMISSION_BODY_MAX_LENGTH, type PatientTransmission } from '@oneandlab/shared-types';
import {
  appointmentDayFrance,
  initialTransmissionDraft,
  passageItemsToPreselect,
  toggleCareItem,
  transmissionCareOptions,
  transmissionInputFromDraft,
  withOccurredOn,
  type TransmissionPrefill,
} from '@oneandlab/shared-utils';
import { Button } from '@/components/ui/Button';
import { buildFieldStyles } from '@/components/ui/field-styles';
import { SheetModal } from '@/components/ui/SheetModal';
import { Textarea } from '@/components/ui/Textarea';
import { ConsentCheckbox } from '@/features/auth/components/ConsentCheckbox';
import { IsoDatePicker } from '@/features/nurse-passage/components/IsoDatePicker';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { AppText, spacing, useStyles, type Theme } from '@/theme';
import {
  createPatientTransmission,
  fetchTransmissionCareItems,
  updatePatientTransmission,
} from '../api/patient-transmissions.service';
import { TransmissionCareItemChips } from './TransmissionCareItemChips';

interface Props {
  visible: boolean;
  onClose: () => void;
  patientId: string;
  /** Fiche passage (`appointmentId`, `occurredOn`) ou dictée Cary (`body`). */
  prefill?: TransmissionPrefill;
  /** Modification par son auteur (moins de 24 h). */
  transmission?: PatientTransmission | null;
  onSaved?: (transmission: PatientTransmission) => void;
}

/** Saisie d'une transmission : jour du soin, soins réalisés, texte, mention « Pour le médecin ». */
export function TransmissionEntrySheet({ visible, onClose, patientId, prefill, transmission, onSaved }: Props) {
  const styles = useStyles(buildStyles);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const today = appointmentDayFrance(new Date());
  const [draft, setDraft] = useState(() => initialTransmissionDraft(today, transmission, prefill));
  const [openedFor, setOpenedFor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (visible !== openedFor) {
    setOpenedFor(visible);
    if (visible) {
      setDraft(initialTransmissionDraft(today, transmission, prefill));
      setError(null);
    }
  }

  const careQ = useQuery({
    queryKey: queryKeys.patients.transmissionCareItems(patientId, draft.occurredOn),
    queryFn: () => fetchTransmissionCareItems(patientId, draft.occurredOn),
    enabled: visible && Boolean(patientId),
  });

  const autoSelectId = draft.autoSelectAppointmentId;
  useEffect(() => {
    if (!autoSelectId || !careQ.data) return;
    const preselected = passageItemsToPreselect(careQ.data, autoSelectId);
    setDraft((d) => ({ ...d, selected: preselected, autoSelectAppointmentId: null }));
  }, [autoSelectId, careQ.data]);

  const saveMut = useMutation({
    mutationFn: () => {
      const input = transmissionInputFromDraft(draft, careQ.data);
      return transmission
        ? updatePatientTransmission(patientId, transmission.id, input)
        : createPatientTransmission(patientId, input);
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: queryKeys.patients.transmissions(patientId) });
      toast(transmission ? 'Transmission modifiée' : 'Transmission enregistrée', { type: 'success' });
      onSaved?.(saved);
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Enregistrement impossible. Réessayez.')),
  });

  const options = transmissionCareOptions(careQ.data, draft.selected);
  const showsCatalog = Boolean(careQ.data) && careQ.data?.passage_items.length === 0;
  const canSave = draft.body.trim().length > 0 && !saveMut.isPending;

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={transmission ? 'Modifier la transmission' : 'Nouvelle transmission'}
      snapPoints={['92%']}
      dismissible={!saveMut.isPending}
      footer={
        <Button title="Enregistrer" fullWidth loading={saveMut.isPending} disabled={!canSave} onPress={() => saveMut.mutate()} />
      }
    >
      <IsoDatePicker
        label="Jour du soin"
        value={draft.occurredOn}
        maximumDate={dayjs(today).toDate()}
        onChange={(iso) => setDraft((d) => withOccurredOn(d, iso > today ? today : iso))}
      />

      <View style={styles.section}>
        <AppText style={styles.label}>Soins réalisés</AppText>
        {showsCatalog ? <AppText variant="caption">Aucun passage ce jour-là : choisissez dans le catalogue.</AppText> : null}
        {careQ.isLoading ? <AppText variant="caption">Chargement des soins…</AppText> : null}
        {careQ.isError ? (
          <View style={styles.inlineError}>
            <AppText variant="caption">{getErrorMessage(careQ.error, 'Soins indisponibles')}</AppText>
            <Button title="Réessayer" size="sm" variant="ghost" onPress={() => void careQ.refetch()} />
          </View>
        ) : null}
        {options.length > 0 ? (
          <TransmissionCareItemChips
            items={options}
            selected={draft.selected}
            onToggle={(item) => setDraft((d) => ({ ...d, selected: toggleCareItem(d.selected, item) }))}
          />
        ) : null}
      </View>

      <Textarea
        label="Transmission"
        value={draft.body}
        onChangeText={(body) => setDraft((d) => ({ ...d, body }))}
        placeholder="Observations, évolution, consignes…"
        maxLength={TRANSMISSION_BODY_MAX_LENGTH}
      />

      <ConsentCheckbox
        checked={draft.forDoctor}
        onToggle={(forDoctor) => setDraft((d) => ({ ...d, forDoctor }))}
        label="Pour le médecin : le médecin du dossier est notifié"
      />

      {error ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </SheetModal>
  );
}

function buildStyles(theme: Theme) {
  const c = theme.colors;
  return {
    label: buildFieldStyles(theme).label,
    section: { gap: spacing[2], minWidth: 0 },
    inlineError: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing[2], flexWrap: 'wrap' as const },
    error: { color: c.error },
  };
}
