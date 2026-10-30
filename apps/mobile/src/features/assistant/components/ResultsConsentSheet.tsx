import { useQueryClient } from '@tanstack/react-query';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { setResultsReading } from '../api/assistant.service';

type Props = {
  visible: boolean;
  /** Ferme la sheet (avant l'appel réseau). */
  onClose: () => void;
  onDismissed: () => void;
  /** Accord enregistré : la question sur les résultats peut être reposée. */
  onGranted: () => void;
};

/** Patient : accord pour que Cary lise lui-même son dernier compte rendu d'analyses (retirable dans les Réglages). */
export function ResultsConsentSheet({ visible, onClose, onDismissed, onGranted }: Props) {
  const qc = useQueryClient();
  const { show: toast } = useToast();

  const grant = () => {
    onClose();
    setResultsReading(true)
      .then((settings) => {
        qc.setQueryData(queryKeys.assistant.settings, settings);
        toast('Lecture de vos résultats autorisée', { type: 'success' });
        onGranted();
      })
      .catch((e: unknown) => {
        console.warn('[assistant] accord impossible', e);
        toast('Réglage impossible. Réessayez.', { type: 'error' });
      });
  };

  return (
    <ConfirmSheet
      visible={visible}
      title="Autoriser la lecture de vos résultats ?"
      message="Cary lira votre dernier compte rendu d'analyses pour vous l'expliquer. Votre nom et vos coordonnées sont masqués avant l'envoi au service d'IA, qui ne conserve rien. Vous pourrez retirer cet accord à tout moment dans les Réglages."
      confirmLabel="Autoriser"
      tone="primary"
      onConfirm={grant}
      onClose={onClose}
      onDismissed={onDismissed}
    />
  );
}
