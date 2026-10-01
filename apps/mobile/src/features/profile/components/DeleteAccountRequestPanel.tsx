import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ACCOUNT_DELETION_REASON_MAX_LENGTH } from '@oneandlab/shared-api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { useAuthStore } from '@/store/auth-store';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { accountDeletionApi } from '../api/account-deletion.service';
import { DeleteAccountInfoCard } from './DeleteAccountInfoCard';

const PROCESS_ITEMS = [
  'Votre demande est envoyée à l’équipe support de Cary, qui la traite elle-même.',
  'Nous vous répondons par e-mail à l’adresse de votre compte.',
  'Votre compte reste actif jusqu’à son traitement.',
];

/** Comptes professionnels : la suppression passe par une demande traitée par l’équipe. */
export function DeleteAccountRequestPanel() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const email = useAuthStore((s) => s.user?.email);
  const [reason, setReason] = useState('');

  const send = useMutation({
    mutationFn: async () => {
      const trimmed = reason.trim();
      const res = await accountDeletionApi.requestAccountDeletion(trimmed === '' ? undefined : trimmed);
      if (!res.success) {
        throw new Error(res.error ?? 'La demande n’a pas pu être envoyée. Réessayez ou contactez le support.');
      }
    },
    onError: (err) => console.warn('[account-deletion] demande non envoyée', err),
  });

  if (send.isSuccess) {
    return (
      <EmptyState
        illustration="success"
        title="Demande envoyée"
        description={
          email
            ? `Notre équipe traite votre demande et vous écrira à ${email}. Votre compte reste actif d’ici là.`
            : 'Notre équipe traite votre demande et vous écrira par e-mail. Votre compte reste actif d’ici là.'
        }
        actionLabel="Retour"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <View style={styles.stack}>
      <DeleteAccountInfoCard title="Comment ça se passe" items={PROCESS_ITEMS} />

      <Textarea
        label="Motif (facultatif)"
        value={reason}
        onChangeText={setReason}
        placeholder="Dites-nous pourquoi vous souhaitez partir, si vous le souhaitez."
        numberOfLines={4}
        maxLength={ACCOUNT_DELETION_REASON_MAX_LENGTH}
        hint={`${reason.length} / ${ACCOUNT_DELETION_REASON_MAX_LENGTH} caractères`}
        editable={!send.isPending}
      />

      {send.isError ? (
        <AppText style={styles.error} accessibilityRole="alert">
          {getErrorMessage(send.error)}
        </AppText>
      ) : null}

      <Button
        title="Envoyer la demande de suppression"
        variant="destructive"
        size="lg"
        fullWidth
        loading={send.isPending}
        onPress={() => send.mutate()}
      />
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    stack: {
      gap: spacing[4],
    },
    error: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.error,
    },
  };
}
