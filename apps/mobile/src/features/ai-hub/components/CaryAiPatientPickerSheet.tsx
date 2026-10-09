import { useState } from 'react';
import { View } from 'react-native';
import { Search } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { SheetModal } from '@/components/ui/SheetModal';
import { SkeletonList } from '@/components/ui/skeletons';
import { StaffPatientHubListRow } from '@/features/patients/components/StaffPatientHubListRow';
import { useStaffHubPatientSearch } from '@/features/patients/hooks/use-staff-hub-patient-search';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { ICON_STROKE_WIDTH, iconSize, spacing, useStyles } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (patientId: string) => void;
}

/** Soignant : patient sur lequel porte la conversation Cary (recherche du hub patients). */
export function CaryAiPatientPickerSheet({ visible, onClose, onPick }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const query = useStaffHubPatientSearch(debounced);
  const patients = query.data ?? [];

  const close = () => {
    setSearch('');
    onClose();
  };

  return (
    <SheetModal visible={visible} onClose={close} title="Choisir un patient" snapPoints={['92%']}>
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher un patient"
        autoCorrect={false}
        leftIcon={<Search size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
      />
      {query.isLoading ? (
        <SkeletonList count={4} itemHeight={64} gap={spacing[2]} />
      ) : query.isError && !query.data ? (
        <ErrorState title="Patients indisponibles" error={query.error} onRetry={() => void query.refetch()} />
      ) : patients.length === 0 ? (
        <EmptyState
          illustration="patients"
          title="Aucun patient"
          description={search.trim() ? 'Modifiez votre recherche.' : undefined}
        />
      ) : (
        <View style={styles.list}>
          {patients.map((item) => (
            <StaffPatientHubListRow
              key={item.patient_id}
              item={item}
              onPress={() => {
                setSearch('');
                onPick(item.patient_id);
              }}
            />
          ))}
        </View>
      )}
    </SheetModal>
  );
}

function buildStyles() {
  return { list: { gap: spacing[1] } };
}
