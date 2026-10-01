import { forwardRef, useEffect, useState } from 'react';
import { Pressable, type TextInput, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useResendCountdown } from '@/features/auth/hooks/use-resend-countdown';
import { AppText, font, iconSize, spacing, useAppColors, useStyles, type Theme } from '@/theme';

const OTP_LENGTH = 6;

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  /** Appelé au bouton et automatiquement au 6e chiffre. */
  onSubmit: (code: string) => void;
  submitLabel: string;
  loading: boolean;
  /** Renvoie `true` si un nouveau code a bien été envoyé. */
  onResend: () => Promise<boolean>;
  onChangeEmail: () => void;
  alternative?: { label: string; onPress: () => void };
}

export const OtpCodeStep = forwardRef<TextInput, Props>(function OtpCodeStep(
  { value, onChangeText, onSubmit, submitLabel, loading, onResend, onChangeEmail, alternative },
  ref,
) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { remaining, restart } = useResendCountdown();
  const [resending, setResending] = useState(false);

  useEffect(() => {
    restart();
  }, [restart]);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChangeText(digits);
    if (digits.length === OTP_LENGTH && !loading) onSubmit(digits);
  }

  async function handleResend() {
    setResending(true);
    try {
      if (await onResend()) restart();
    } finally {
      setResending(false);
    }
  }

  const resendLabel = remaining > 0 ? `Renvoyer le code dans ${remaining} s` : 'Renvoyer le code';

  return (
    <View style={styles.wrap}>
      <Input
        ref={ref}
        label="Code à 6 chiffres"
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        onSubmitEditing={() => onSubmit(value)}
        placeholder="000000"
        hint="Le code est valable 5 minutes. Pensez à vérifier vos courriers indésirables."
      />
      <Button title={submitLabel} loading={loading} onPress={() => onSubmit(value)} fullWidth size="lg" />
      <Button
        title={resendLabel}
        variant="ghost"
        fullWidth
        loading={resending}
        disabled={remaining > 0 || loading}
        onPress={() => void handleResend()}
      />
      {alternative ? (
        <Button title={alternative.label} variant="ghost" fullWidth onPress={alternative.onPress} />
      ) : null}
      <Pressable
        onPress={onChangeEmail}
        accessibilityRole="button"
        style={styles.linkBtn}
      >
        <Row gap={spacing[2]} align="center" justify="center">
          <ArrowLeft size={iconSize.xs} color={c.textSecondary} strokeWidth={2} />
          <AppText style={styles.linkText}>Changer d&apos;e-mail</AppText>
        </Row>
      </Pressable>
    </View>
  );
});

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: { gap: spacing[3] },
    linkBtn: { minHeight: 44, justifyContent: 'center' as const },
    linkText: { ...font.medium, fontSize: fontSize.sm, color: c.textSecondary },
  };
}
