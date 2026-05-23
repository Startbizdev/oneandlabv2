import { HeaderBackButton } from '@/navigation/HeaderBackButton';

interface Props {
  onPress: () => void;
}

/** Retour header stack — même style que ProfileStackBackButton. */
export function BookingWizardHeaderBack({ onPress }: Props) {
  return <HeaderBackButton onPress={onPress} />;
}
