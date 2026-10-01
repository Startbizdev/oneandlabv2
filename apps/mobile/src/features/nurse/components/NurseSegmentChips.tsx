import { ScrollView } from 'react-native';
import { FilterOptionChips } from '@/components/ui/FilterOptionChips';
import { NURSE_SEGMENT_OPTIONS, type NurseSegment } from '@/constants/appointments-list-filters';
import { spacing, useStyles } from '@/theme';

type Props = {
  value: NurseSegment;
  onChange: (segment: NurseSegment) => void;
};

/** Statuts de la liste infirmier visibles d'un coup d'œil (mêmes valeurs que la feuille de filtres). */
export function NurseSegmentChips({ value, onChange }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <FilterOptionChips options={NURSE_SEGMENT_OPTIONS} value={value} onChange={onChange} />
    </ScrollView>
  );
}

function buildStyles() {
  return {
    scroll: { flexGrow: 0, marginBottom: spacing[2] },
    content: { paddingRight: spacing[4] },
  };
}
