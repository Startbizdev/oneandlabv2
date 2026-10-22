import { TRANSMISSION_BODY_MAX_LENGTH } from '@oneandlab/shared-types';
import type { TransmissionPrefill } from '@oneandlab/shared-utils';
import { useState } from 'react';
import { View } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { SheetModal } from '@/components/ui/SheetModal';
import { Textarea } from '@/components/ui/Textarea';
import { useDeviceSpeechRecognition } from '@/lib/speech/use-device-speech-recognition';
import { AppText, ICON_STROKE_WIDTH, iconSize, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { dictate } from '../api/assistant.service';
import { transmissionPrefill } from '../utils/assistant-actions';
import { assistantErrorMessage, DICTATION_MAX_LENGTH } from '../utils/assistant-errors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  patientId: string;
  appointmentId?: string;
  /** Ouvre la saisie de transmission existante, une fois cette sheet fermée. */
  onCreateTransmission: (prefill: TransmissionPrefill) => void;
};

/** Soignant : dictée → texte mis en forme par Cary (rien n'est enregistré) → transmission à relire et valider. */
export function DictationSheet({ visible, onClose, onDismissed, patientId, appointmentId, onCreateTransmission }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const dictation = useDeviceSpeechRecognition();
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    dictation.stop();
    setTranscript('');
    setResult(null);
    setError(null);
    onClose();
  };

  const toggleDictation = () => {
    if (dictation.recognizing) {
      dictation.stop();
      return;
    }
    void dictation.start((text) => setTranscript((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text)));
  };

  const format = async () => {
    const text = transcript.trim();
    if (!text || pending) return;
    dictation.stop();
    setPending(true);
    setError(null);
    try {
      setResult(await dictate({ transcript: text, patient_id: patientId, ...(appointmentId ? { appointment_id: appointmentId } : {}) }));
    } catch (err) {
      console.warn('[assistant] dictée non mise en forme', err);
      setError(assistantErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const footer =
    result === null ? (
      <Button
        title="Mettre en forme"
        fullWidth
        loading={pending}
        disabled={!transcript.trim() || transcript.length > DICTATION_MAX_LENGTH}
        onPress={() => void format()}
      />
    ) : (
      <View style={styles.actions}>
        <Button
          title="Créer une transmission"
          fullWidth
          disabled={!result.trim()}
          onPress={() => onCreateTransmission(transmissionPrefill(result, appointmentId))}
        />
        <Button title="Reprendre la dictée" variant="ghost" fullWidth onPress={() => setResult(null)} />
      </View>
    );

  return (
    <SheetModal
      visible={visible}
      onClose={close}
      onDismissed={onDismissed}
      title="Compte rendu"
      subtitle={result === null ? 'Dictez ou saisissez vos observations.' : 'Relisez et corrigez avant de créer la transmission.'}
      dismissible={!pending}
      footer={footer}
    >
      {result !== null ? (
        <Textarea
          value={result}
          onChangeText={setResult}
          maxLength={TRANSMISSION_BODY_MAX_LENGTH}
          accessibilityLabel="Texte de la transmission"
        />
      ) : (
        <View style={styles.compose}>
          <Textarea
            value={transcript}
            onChangeText={setTranscript}
            maxLength={DICTATION_MAX_LENGTH}
            placeholder="Observations, soins réalisés, consignes…"
            accessibilityLabel="Texte dicté"
            editable={!pending}
          />
          {dictation.interimTranscript ? (
            <AppText variant="caption" accessibilityLiveRegion="polite">
              {dictation.interimTranscript}
            </AppText>
          ) : null}
          {dictation.available ? (
            <Button
              title={dictation.recognizing ? 'Arrêter la dictée' : 'Dicter'}
              variant="secondary"
              disabled={pending}
              leftIcon={
                dictation.recognizing ? (
                  <Square size={iconSize.sm} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
                ) : (
                  <Mic size={iconSize.sm} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
                )
              }
              onPress={toggleDictation}
            />
          ) : null}
        </View>
      )}
      {error || dictation.error ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {error ?? dictation.error}
        </AppText>
      ) : null}
    </SheetModal>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    compose: { gap: spacing[3] },
    actions: { gap: spacing[2] },
    error: { color: c.error, marginTop: spacing[3] },
  };
}
