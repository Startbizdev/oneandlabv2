import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch, View } from 'react-native';
import { api } from '@/api/client';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { AppText, spacing } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { Row } from '@/components/layout/primitives';

type CareOrigin = {
  id: string;
  display_name: string;
  emploi?: string | null;
  hidden_by_patient: boolean;
};

export default function CareOriginsRoute() {
  const colors = useAppColors();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['patient-professional-access'],
    queryFn: async () => {
      const response = await api.get<CareOrigin[]>('/patient/professional-access');
      if (!response.success) throw new Error(response.error ?? 'Chargement impossible');
      return response.data ?? [];
    },
  });
  const update = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      api.patch('/patient/professional-access', { id, hidden }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-professional-access'] }),
  });

  return (
    <ProfileSubScreenLayout hideSave>
      <AppText style={{ color: colors.textSecondary }}>
        Choisissez les professionnels affichés comme donneurs de soins et proposés à l’avenir.
      </AppText>
      {(query.data ?? []).map((item) => (
        <Row
          key={item.id}
          style={{
            padding: spacing[4],
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            backgroundColor: colors.surface,
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText style={{ color: colors.textPrimary }}>{item.display_name}</AppText>
            <AppText style={{ color: colors.textSecondary }}>{item.emploi || 'Professionnel de santé'}</AppText>
          </View>
          <Switch
            value={!item.hidden_by_patient}
            onValueChange={(visible) => update.mutate({ id: item.id, hidden: !visible })}
          />
        </Row>
      ))}
    </ProfileSubScreenLayout>
  );
}
