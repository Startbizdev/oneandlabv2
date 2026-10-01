import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ACCOUNT_DELETION_CONFIRMATION } from '@oneandlab/shared-api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  disableBiometricLogin,
  getBiometricStoredUserId,
  normalizeBiometricUserId,
} from '@/lib/biometric-auth';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { accountDeletionApi } from '../api/account-deletion.service';
import { DeleteAccountInfoCard } from './DeleteAccountInfoCard';

const DELETED_ITEMS = [
  'Votre compte et vos informations personnelles.',
  'Vos documents personnels hors rendez-vous (carte Vitale, mutuelle, pièces déposées), y compris ceux de vos proches.',
  'Les avis que vous avez publiés.',
];

const KEPT_ITEMS = [
  'Les documents transmis pour un rendez-vous et l’historique de vos rendez-vous restent chez les professionnels qui vous ont pris en charge. Ils ne sont plus liés à votre compte.',
];

const BLOCKERS = [
  'Un rendez-vous en attente, confirmé ou en cours (pour vous ou un proche).',
  'Un abonnement encore actif.',
  'Une commande en pharmacie en cours.',
];

async function forgetBiometricLogin(userId: string | undefined) {
  if (!userId) return;
  try {
    if ((await getBiometricStoredUserId()) === normalizeBiometricUserId(userId)) {
      await disableBiometricLogin();
    }
  } catch (err) {
    console.warn('[account-deletion] désactivation biométrie impossible', err);
  }
}

export function DeleteAccountPatientPanel() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { show: toast } = useToast();
  const userId = useAuthStore((s) => s.user?.id);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const confirmed = confirmation.trim() === ACCOUNT_DELETION_CONFIRMATION;

  const onDelete = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);
    setFailure(null);
    try {
      const res = await accountDeletionApi.deleteMyAccount(ACCOUNT_DELETION_CONFIRMATION);
      if (!res.success || !res.data?.deleted) {
        throw new Error(res.error ?? 'La suppression du compte a échoué. Réessayez ou contactez le support.');
      }
    } catch (err) {
      console.warn('[account-deletion] suppression refusée', err);
      setFailure(err);
      setDeleting(false);
      return;
    }

    await forgetBiometricLogin(userId);
    try {
      await clearSession();
    } catch (err) {
      console.warn('[account-deletion] nettoyage de session incomplet', err);
    }
    toast('Compte supprimé', {
      type: 'success',
      message: 'Votre compte et vos données personnelles ont été supprimés.',
    });
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={styles.stack}>
      <DeleteAccountInfoCard title="Ce qui sera supprimé" items={DELETED_ITEMS} />
      <DeleteAccountInfoCard title="Ce qui est conservé" items={KEPT_ITEMS} />
      <DeleteAccountInfoCard title="Suppression impossible en cas de :" items={BLOCKERS} tone="warning" />

      <AppText style={styles.irreversible}>
        Cette action est définitive : votre compte ne pourra pas être récupéré.
      </AppText>

      <Input
        label={`Pour confirmer, saisissez ${ACCOUNT_DELETION_CONFIRMATION}`}
        value={confirmation}
        onChangeText={(v) => {
          setConfirmation(v);
          setFailure(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={ACCOUNT_DELETION_CONFIRMATION}
        editable={!deleting}
      />

      {failure ? (
        <View style={styles.failure} accessibilityRole="alert">
          <AppText style={styles.failureTitle}>Suppression impossible pour le moment</AppText>
          <AppText style={styles.failureText}>{getErrorMessage(failure)}</AppText>
          <View style={styles.failureActions}>
            <Button
              title="Voir mes rendez-vous"
              variant="outline"
              size="sm"
              onPress={() => router.push('/(patient)/(tabs)/appointments')}
            />
            <Button
              title="Contacter le support"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/profile/support' as never)}
            />
          </View>
        </View>
      ) : null}

      <Button
        title="Supprimer définitivement mon compte"
        variant="destructive"
        size="lg"
        fullWidth
        disabled={!confirmed}
        loading={deleting}
        onPress={() => void onDelete()}
      />
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    stack: {
      gap: spacing[4],
    },
    irreversible: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.error,
    },
    failure: {
      backgroundColor: c.errorLight,
      borderRadius: radius.lg,
      padding: spacing[4],
      gap: spacing[2],
    },
    failureTitle: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.error,
    },
    failureText: {
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: c.textPrimary,
    },
    failureActions: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[2],
    },
  };
}
