import { useState } from 'react';
import { View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/providers/ToastProvider';
import { usePushPermissionActivation } from '../hooks/use-push-permission-activation';
import { AppText, font, iconSize, radius, spacing, useAppColors, useStyles, type Theme } from '@/theme';

interface Props {
  isPatient: boolean;
  onDone: () => void;
}

/** Explication affichée avant la fenêtre système de permission push. */
export function PushPermissionPrompt({ isPatient, onDone }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const { activate, decline } = usePushPermissionActivation();
  const [loading, setLoading] = useState(false);

  async function onActivate() {
    setLoading(true);
    try {
      await activate();
    } catch (e) {
      toast('Activation incomplète', {
        message: e instanceof Error ? e.message : 'Vous pourrez réessayer depuis les paramètres.',
        type: 'error',
      });
    } finally {
      setLoading(false);
      onDone();
    }
  }

  function onLater() {
    decline();
    onDone();
  }

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Bell size={iconSize['2xl']} color={c.primary} strokeWidth={2} />
        </View>
        <AppText accessibilityRole="header" style={styles.title}>
          {isPatient ? 'Suivez vos visites en temps réel' : 'Ne manquez aucune demande'}
        </AppText>
        <AppText style={styles.text}>
          {isPatient
            ? 'Recevez la confirmation de votre rendez-vous et l’arrivée du soignant, sans avoir à ouvrir l’application.'
            : 'Soyez prévenu des nouveaux rendez-vous, des messages et des changements importants.'}
        </AppText>
        <AppText style={styles.hint}>Vous pourrez changer d’avis à tout moment dans les paramètres.</AppText>
      </View>
      <View style={styles.actions}>
        <Button
          title="Activer les notifications"
          size="lg"
          fullWidth
          loading={loading}
          onPress={() => void onActivate()}
        />
        <Button title="Plus tard" variant="ghost" fullWidth disabled={loading} onPress={onLater} />
      </View>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: spacing[6],
      paddingBottom: spacing[2],
      justifyContent: 'space-between' as const,
    },
    body: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[4],
    },
    iconWrap: {
      width: 88,
      height: 88,
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: spacing[2],
    },
    title: {
      ...font.heading,
      fontSize: fontSize.xl,
      lineHeight: fontSize.xl * 1.2,
      color: c.textPrimary,
      textAlign: 'center' as const,
    },
    text: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: fontSize.base * 1.5,
      color: c.textSecondary,
      textAlign: 'center' as const,
    },
    hint: {
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: c.textTertiary,
      textAlign: 'center' as const,
    },
    actions: { gap: spacing[2] },
  };
}
