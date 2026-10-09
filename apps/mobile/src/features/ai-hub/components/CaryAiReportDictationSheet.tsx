import { useState } from 'react';
import { View } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { TRANSMISSION_BODY_MAX_LENGTH, type AiReport } from '@oneandlab/shared-types';
import { Button } from '@/components/ui/Button';
import { SheetModal } from '@/components/ui/SheetModal';
import { Textarea } from '@/components/ui/Textarea';
import { AppText, ICON_STROKE_WIDTH, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { dictateAiReport, updateAiReport, validateAiReport } from '../api/ai-reports.service';
import { useDeviceSpeechRecognition } from '../hooks/use-device-speech-recognition';
import { formatCount } from '../utils/ai-chat-errors';
import { AI_REPORT_MAX_LENGTH, aiReportErrorMessage, isAiReportLocked } from '../utils/ai-report-errors';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Sheet entièrement fermée après `visible={false}` (enchaînement vers une autre sheet). */
  onDismissed?: () => void;
  patientId: string;
  appointmentId?: string;
  /** Compte rendu validé : « Créer une transmission avec ce texte » (absent : pas de proposition). */
  onCreateTransmission?: (report: AiReport) => void;
}

/** Soignant : dictée d'un compte rendu, mis en forme par Cary, corrigé puis validé (`/ai/reports`). */
export function CaryAiReportDictationSheet({
  visible,
  onClose,
  onDismissed,
  patientId,
  appointmentId,
  onCreateTransmission,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const dictation = useDeviceSpeechRecognition();
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState<AiReport | null>(null);
  const [edited, setEdited] = useState('');
  /** Le serveur a répondu 409 : compte rendu déjà validé ou publié, plus modifiable. */
  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState<'generate' | 'validate' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const validated = Boolean(report) && (report?.status !== 'draft' || locked);
  const editedText = edited.trim();

  const close = () => {
    dictation.stop();
    setTranscript('');
    setReport(null);
    setEdited('');
    setLocked(false);
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

  const generate = async () => {
    const text = transcript.trim();
    if (!text || pending) return;
    dictation.stop();
    setPending('generate');
    setError(null);
    try {
      const draft = await dictateAiReport({ patient_id: patientId, appointment_id: appointmentId, transcript: text });
      setReport(draft);
      setEdited(draft.content_text);
    } catch (err) {
      console.warn('[cary-ai] compte rendu non généré', err);
      setError(aiReportErrorMessage(err, 'dictate'));
    } finally {
      setPending(null);
    }
  };

  /** Enregistre la correction (`PATCH`) si le texte a changé, puis valide. */
  const validate = async () => {
    if (!report || pending || !editedText) return;
    setPending('validate');
    setError(null);
    try {
      let current = report;
      if (editedText !== report.content_text) {
        current = await updateAiReport(report.id, editedText);
        setReport(current);
      }
      setReport(await validateAiReport(current.id));
    } catch (err) {
      console.warn('[cary-ai] compte rendu non validé', err);
      setError(aiReportErrorMessage(err, 'validate'));
      if (isAiReportLocked(err)) setLocked(true);
    } finally {
      setPending(null);
    }
  };

  const transmissionTooLong = (report?.content_text.length ?? 0) > TRANSMISSION_BODY_MAX_LENGTH;
  const footer = !report ? (
    <Button
      title="Générer le compte rendu"
      fullWidth
      loading={pending === 'generate'}
      disabled={!transcript.trim()}
      onPress={() => void generate()}
    />
  ) : validated ? (
    <View style={styles.actions}>
      {onCreateTransmission && !transmissionTooLong ? (
        <Button title="Créer une transmission avec ce texte" fullWidth onPress={() => onCreateTransmission(report)} />
      ) : null}
      <Button title="Terminer" variant={onCreateTransmission && !transmissionTooLong ? 'ghost' : 'primary'} fullWidth onPress={close} />
    </View>
  ) : (
    <View style={styles.actions}>
      <Button
        title="Valider le compte rendu"
        fullWidth
        loading={pending === 'validate'}
        disabled={!editedText}
        onPress={() => void validate()}
      />
      <Button
        title="Reprendre la dictée"
        variant="ghost"
        fullWidth
        disabled={pending !== null}
        onPress={() => {
          setReport(null);
          setError(null);
        }}
      />
    </View>
  );

  return (
    <SheetModal
      visible={visible}
      onClose={close}
      onDismissed={onDismissed}
      title="Compte rendu"
      subtitle={
        !report ? 'Dictez ou saisissez vos observations.' : validated ? 'Compte rendu validé.' : 'Relisez et corrigez avant de valider.'
      }
      snapPoints={['92%']}
      dismissible={pending === null}
      footer={footer}
    >
      {report && validated ? (
        <View style={styles.compose}>
          <View style={styles.report}>
            <AppText variant="body" selectable>
              {report.content_text}
            </AppText>
          </View>
          {onCreateTransmission && transmissionTooLong ? (
            <AppText variant="caption" color={c.textSecondary}>
              {`Trop long pour une transmission (${formatCount(TRANSMISSION_BODY_MAX_LENGTH)} caractères maximum).`}
            </AppText>
          ) : null}
        </View>
      ) : report ? (
        <Textarea
          value={edited}
          onChangeText={setEdited}
          maxLength={AI_REPORT_MAX_LENGTH}
          accessibilityLabel="Compte rendu à relire"
          editable={pending === null}
        />
      ) : (
        <View style={styles.compose}>
          <Textarea
            value={transcript}
            onChangeText={setTranscript}
            placeholder="Observations, soins réalisés, consignes…"
            accessibilityLabel="Texte du compte rendu"
            editable={pending === null}
          />
          {dictation.interimTranscript ? (
            <AppText variant="caption" color={c.textSecondary}>
              {dictation.interimTranscript}
            </AppText>
          ) : null}
          {dictation.available ? (
            <Button
              title={dictation.recognizing ? 'Arrêter la dictée' : 'Dicter'}
              variant="secondary"
              disabled={pending !== null}
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
    report: { backgroundColor: c.surfaceAlt, borderRadius: radius.lg, padding: spacing[4] },
    actions: { gap: spacing[2] },
    error: { color: c.error, marginTop: spacing[3] },
  };
}
