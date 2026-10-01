import { useState } from 'react';
import { Image, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { useToast } from '@/providers/ToastProvider';
import { usePushPermissionActivation } from '../hooks/use-push-permission-activation';
import { AppText, spacing, useStyles } from '@/theme';

const ILLUSTRATION_SIZE = 184;

interface Props {
  isPatient: boolean;
  onDone: () => void;
}

/** Explication affichée avant la fenêtre système de permission push. */
export function PushPermissionPrompt({ isPatient, onDone }: Props) {
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
        <Image
          source={ILLUSTRATIONS.notifications}
          style={styles.illustration}
          resizeMode="contain"
          accessible={false}
        />
        <AppText variant="title" accessibilityRole="header" style={styles.centered}>
          {isPatient ? 'Suivez vos visites en temps réel' : 'Ne manquez aucune demande'}
        </AppText>
        <AppText variant="secondary" style={styles.centered}>
          {isPatient
            ? 'Confirmation du rendez-vous et arrivée du soignant, sans ouvrir l’application.'
            : 'Nouveaux rendez-vous, messages et changements importants.'}
        </AppText>
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

function buildStyles() {
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
      gap: spacing[3],
    },
    illustration: {
      width: ILLUSTRATION_SIZE,
      height: ILLUSTRATION_SIZE,
      marginBottom: spacing[2],
    },
    centered: {
      textAlign: 'center' as const,
    },
    actions: { gap: spacing[2] },
  };
}
