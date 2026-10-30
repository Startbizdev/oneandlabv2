import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react-native';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { getAssistantSettings, setResultsReading } from '../api/assistant.service';

/** Réglages patient : accord (révocable) pour que Cary lise lui-même son dernier compte rendu d'analyses. */
export function AssistantSettingsSection() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const settings = useQuery({ queryKey: queryKeys.assistant.settings, queryFn: getAssistantSettings });
  const toggle = useMutation({
    mutationFn: setResultsReading,
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.assistant.settings, data);
      toast(data.results_reading ? 'Lecture de vos résultats autorisée' : 'Lecture de vos résultats désactivée', {
        type: 'success',
      });
    },
    onError: () => toast('Réglage impossible. Réessayez.', { type: 'error' }),
  });
  const enabled = toggle.isPending ? Boolean(toggle.variables) : Boolean(settings.data?.results_reading);

  return (
    <SettingsSection
      title="Assistant Cary"
      items={[
        {
          icon: FlaskConical,
          label: 'Lecture de mes résultats',
          description: settings.isError
            ? 'Réglage indisponible pour le moment'
            : 'Cary lit votre dernier compte rendu d’analyses pour vous l’expliquer. Nom et coordonnées masqués.',
          trailing: (
            <ToggleSwitch
              value={enabled}
              disabled={settings.isLoading || settings.isError || toggle.isPending}
              onValueChange={(next) => toggle.mutate(next)}
              accessibilityLabel="Lecture de mes résultats par l’assistant"
            />
          ),
        },
      ]}
    />
  );
}
