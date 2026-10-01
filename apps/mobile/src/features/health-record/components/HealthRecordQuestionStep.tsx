import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { HealthRecordQuestion } from '../api/health-record.service';
import { formatHealthRecordDisplay, unwrapHealthRecordValue } from '../utils/health-record-display';
import { AppText, spacing, useStyles } from '@/theme';

const YES_NO_UNKNOWN = ['yes', 'no', 'unknown'] as const;

function hasStoredValue(value: unknown): boolean {
  const unwrapped = unwrapHealthRecordValue(value);
  if (unwrapped === null || unwrapped === undefined || unwrapped === '') return false;
  if (typeof unwrapped === 'string' && unwrapped.trim().toLowerCase() === 'null') return false;
  if (typeof unwrapped === 'string' && unwrapped.trim().toLowerCase() === '[object object]') return false;
  return true;
}

function formatInitialNumber(value: unknown): string {
  const unwrapped = unwrapHealthRecordValue(value);
  if (!hasStoredValue(unwrapped)) return '';
  if (typeof unwrapped === 'number' && Number.isFinite(unwrapped)) return String(unwrapped);
  if (typeof unwrapped === 'string') return unwrapped;
  return '';
}

interface Props {
  question: HealthRecordQuestion;
  initialValue?: unknown;
  onAnswer: (value: unknown) => void;
  /** Passe à la question suivante sans rien enregistrer (la réponse existante est conservée). */
  onSkip: () => void;
  saving?: boolean;
}

function SecondaryActions({
  hasAnswer,
  saving,
  onSkip,
  onClear,
}: {
  hasAnswer: boolean;
  saving?: boolean;
  onSkip: () => void;
  onClear: () => void;
}) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.secondary}>
      <Button title="Passer" variant="ghost" onPress={onSkip} disabled={saving} />
      {hasAnswer ? (
        <Button title="Effacer ma réponse" variant="ghost" onPress={onClear} disabled={saving} />
      ) : null}
    </View>
  );
}

export function HealthRecordQuestionStep({ question, initialValue, onAnswer, onSkip, saving }: Props) {
  const styles = useStyles(buildStyles);
  const [textValue, setTextValue] = useState('');
  const [numberValue, setNumberValue] = useState('');
  const [numberError, setNumberError] = useState<string | null>(null);
  const hasAnswer = hasStoredValue(initialValue);
  const current = unwrapHealthRecordValue(initialValue);
  const clearAnswer = () => onAnswer(null);

  useEffect(() => {
    setNumberError(null);
    if (question.type === 'number') {
      setNumberValue(formatInitialNumber(initialValue));
      setTextValue('');
      return;
    }
    if (question.type === 'text' || question.type === 'textarea') {
      const unwrapped = unwrapHealthRecordValue(initialValue);
      setTextValue(typeof unwrapped === 'string' ? unwrapped : '');
      setNumberValue('');
      return;
    }
    setTextValue('');
    setNumberValue('');
  }, [question.key, question.type, initialValue]);

  const title = (
    <AppText variant="title" accessibilityRole="header">
      {question.label_fr}
    </AppText>
  );

  const choiceOptions =
    question.type === 'yes_no_unknown'
      ? [...YES_NO_UNKNOWN]
      : question.type === 'enum' && question.options?.length
        ? question.options
        : null;

  if (choiceOptions) {
    return (
      <View style={styles.root}>
        {title}
        <View style={styles.options} accessibilityRole="radiogroup">
          {choiceOptions.map((opt) => (
            <ChoiceCard
              key={opt}
              title={formatHealthRecordDisplay(opt)}
              selected={current === opt}
              disabled={saving}
              onPress={() => onAnswer(opt)}
            />
          ))}
        </View>
        <SecondaryActions hasAnswer={hasAnswer} saving={saving} onSkip={onSkip} onClear={clearAnswer} />
      </View>
    );
  }

  if (question.type === 'number') {
    const handleContinue = () => {
      const trimmed = numberValue.trim();
      if (trimmed === '') {
        onSkip();
        return;
      }
      const parsed = Number(trimmed.replace(',', '.'));
      if (!Number.isFinite(parsed)) {
        setNumberError('Saisissez un nombre (ex. 175).');
        return;
      }
      onAnswer(parsed);
    };

    return (
      <View style={styles.root}>
        {title}
        <Input
          keyboardType="decimal-pad"
          placeholder={question.placeholder ?? 'Ex. 175'}
          value={numberValue}
          onChangeText={(v) => {
            setNumberValue(v);
            setNumberError(null);
          }}
          error={numberError ?? undefined}
          accessibilityLabel={question.label_fr}
        />
        <Button title="Continuer" size="lg" fullWidth loading={saving} onPress={handleContinue} />
        <SecondaryActions hasAnswer={hasAnswer} saving={saving} onSkip={onSkip} onClear={clearAnswer} />
      </View>
    );
  }

  const handleContinueText = () => {
    const trimmed = textValue.trim();
    if (trimmed === '') {
      onSkip();
      return;
    }
    onAnswer(trimmed);
  };

  return (
    <View style={styles.root}>
      {title}
      <Textarea
        placeholder={question.placeholder ?? 'Votre réponse…'}
        value={textValue}
        onChangeText={setTextValue}
        numberOfLines={4}
        accessibilityLabel={question.label_fr}
      />
      <Button title="Continuer" size="lg" fullWidth loading={saving} onPress={handleContinueText} />
      <SecondaryActions hasAnswer={hasAnswer} saving={saving} onSkip={onSkip} onClear={clearAnswer} />
    </View>
  );
}

function buildStyles() {
  return {
    root: { gap: spacing[4] },
    options: { gap: spacing[2] },
    secondary: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'center' as const,
      gap: spacing[2],
    },
  };
}
