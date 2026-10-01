import { View } from 'react-native';
import { FilterOptionChips } from '@/components/ui/FilterOptionChips';
import { spacing, AppText, useStyles } from '@/theme';

const OPTIONS = [
  { label: 'Sans préférence', value: 'any' },
  { label: 'Une femme', value: 'female' },
  { label: 'Un homme', value: 'male' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function PreferredNurseGenderButtons({ value, onChange }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.wrap}>
      <AppText variant="headline" accessibilityRole="header">
        Infirmier ou infirmière ?
      </AppText>
      <FilterOptionChips options={OPTIONS} value={value || 'any'} onChange={onChange} />
    </View>
  );
}

function buildStyles() {
  return {
    wrap: { gap: spacing[2] },
  };
}
