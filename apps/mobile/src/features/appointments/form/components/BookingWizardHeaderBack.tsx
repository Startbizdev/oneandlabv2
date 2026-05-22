import { HeaderBackButton } from '@react-navigation/elements';
import { colors } from '@/theme';

interface Props {
  onPress: () => void;
}

/** Retour header stack — même style que ProfileStackBackButton. */
export function BookingWizardHeaderBack({ onPress }: Props) {
  return (
    <HeaderBackButton
      tintColor={colors.primary}
      onPress={onPress}
      accessibilityLabel="Retour"
    />
  );
}
