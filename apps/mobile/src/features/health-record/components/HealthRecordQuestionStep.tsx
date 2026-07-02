import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Row } from '@/components/layout/primitives';
import type { HealthRecordQuestion } from '../api/health-record.service';
import { HEALTH_RECORD_OPTIONAL_BADGE } from '../utils/health-record-display';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const ENUM_LABELS: Record<string, string> = {
  never: 'Jamais',
  former: 'Ancien fumeur',
  yes: 'Oui',
  no: 'Non',
  unknown: 'Je ne sais pas',
  occasional: 'Occasionnel',
  regular: 'Régulier',
  sedentary: 'Sédentaire',
  moderate: 'Modérée',
  active: 'Active',
};

function hasStoredValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function formatInitialNumber(value: unknown): string {
  if (!hasStoredValue(value)) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value;
  return '';
}

interface Props {
  question: HealthRecordQuestion;
  initialValue?: unknown;
  onAnswer: (value: unknown) => void;
  onSkip?: () => void;
  saving?: boolean;
}

function QuestionHeader({ label, styles }: { label: string; styles: ReturnType<typeof buildStyles> }) {
  return (
    <Row gap={spacing[2]} align="center" wrap style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      <Badge
        label={HEALTH_RECORD_OPTIONAL_BADGE}
        variant="neutral"
        dot={false}
        size="sm"
        shape="square"
      />
    </Row>
  );
}

export function HealthRecordQuestionStep({
  question,
  initialValue,
  onAnswer,
  onSkip,
  saving,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'HealthRecordQuestionStep');
  const [textValue, setTextValue] = useState('');
  const [numberValue, setNumberValue] = useState('');

  useEffect(() => {
    if (question.type === 'number') {
      setNumberValue(formatInitialNumber(initialValue));
      setTextValue('');
      return;
    }
    if (question.type === 'text' || question.type === 'textarea') {
      setTextValue(hasStoredValue(initialValue) ? String(initialValue) : '');
      setNumberValue('');
      return;
    }
    setTextValue('');
    setNumberValue('');
  }, [question.key, question.type, initialValue]);

  if (question.type === 'yes_no_unknown') {
    return (
      <View style={styles.root}>
        <QuestionHeader label={question.label_fr} styles={styles} />
        {hasStoredValue(initialValue) ? (
          <Text style={styles.currentValue}>
            Réponse actuelle : {ENUM_LABELS[String(initialValue)] ?? String(initialValue)}
          </Text>
        ) : null}
        <View style={styles.choices}>
          <Button
            title="Oui"
            variant={initialValue === 'yes' ? 'primary' : 'secondary'}
            onPress={() => onAnswer('yes')}
            disabled={saving}
          />
          <Button
            title="Non"
            variant={initialValue === 'no' ? 'primary' : 'secondary'}
            onPress={() => onAnswer('no')}
            disabled={saving}
          />
          <Button
            title="Je ne sais pas"
            variant={initialValue === 'unknown' ? 'primary' : 'ghost'}
            onPress={() => onAnswer('unknown')}
            disabled={saving}
          />
          <Button title="Passer" variant="ghost" onPress={() => onAnswer(null)} disabled={saving} />
        </View>
      </View>
    );
  }

  if (question.type === 'enum' && question.options?.length) {
    return (
      <View style={styles.root}>
        <QuestionHeader label={question.label_fr} styles={styles} />
        {hasStoredValue(initialValue) ? (
          <Text style={styles.currentValue}>
            Réponse actuelle : {ENUM_LABELS[String(initialValue)] ?? String(initialValue)}
          </Text>
        ) : null}
        <View style={styles.choices}>
          {question.options.map((opt) => (
            <Button
              key={opt}
              title={ENUM_LABELS[opt] ?? opt}
              variant={initialValue === opt ? 'primary' : opt === 'unknown' ? 'ghost' : 'secondary'}
              onPress={() => onAnswer(opt)}
              disabled={saving}
            />
          ))}
          <Button title="Passer" variant="ghost" onPress={() => onAnswer(null)} disabled={saving} />
        </View>
      </View>
    );
  }

  if (question.type === 'number') {
    const handleContinue = () => {
      const trimmed = numberValue.trim();
      if (trimmed === '') {
        onSkip?.();
        return;
      }
      const parsed = Number(trimmed.replace(',', '.'));
      if (!Number.isFinite(parsed)) return;
      onAnswer(parsed);
    };

    return (
      <View style={styles.root}>
        <QuestionHeader label={question.label_fr} styles={styles} />
        <Input
          keyboardType="decimal-pad"
          placeholder={question.placeholder ?? 'Ex. 175'}
          value={numberValue}
          onChangeText={setNumberValue}
        />
        <View style={styles.actions}>
          <Button
            title={saving ? 'Enregistrement…' : 'Continuer'}
            onPress={handleContinue}
            disabled={saving}
          />
          <Button title="Passer" variant="ghost" onPress={() => onAnswer(null)} disabled={saving} />
        </View>
      </View>
    );
  }

  const handleContinueText = () => {
    const trimmed = textValue.trim();
    if (trimmed === '') {
      onSkip?.();
      return;
    }
    onAnswer(trimmed);
  };

  return (
    <View style={styles.root}>
      <QuestionHeader label={question.label_fr} styles={styles} />
      <Textarea
        placeholder={question.placeholder ?? 'Votre réponse…'}
        value={textValue}
        onChangeText={setTextValue}
        numberOfLines={4}
      />
      <View style={styles.actions}>
        <Button
          title={saving ? 'Enregistrement…' : 'Continuer'}
          onPress={handleContinueText}
          disabled={saving}
        />
        <Button title="Passer" variant="ghost" onPress={() => onAnswer(null)} disabled={saving} />
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    root: { gap: spacing[4] },
    labelRow: {
      flexWrap: 'wrap' as const,
    },
    label: {
      flexShrink: 1,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      lineHeight: 28,
    },
    currentValue: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    choices: { gap: spacing[2] },
    actions: { gap: spacing[2] },
  };
}
