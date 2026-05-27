import { ChevronLeft } from 'lucide-react-native';
import {
  HeaderGradientOrbButton,
  HeaderOrbIconSize,
  HeaderOrbIconStroke,
} from '@/components/navigation/HeaderGradientOrbButton';
import { colors } from '@/theme';

interface Props {
  onPress: () => void;
}

/** Retour — anneau gradient + fond verre. */
export function HeaderBackButton({ onPress }: Props) {
  return (
    <HeaderGradientOrbButton
      onPress={onPress}
      accessibilityLabel="Retour"
      variant="glass"
    >
      <ChevronLeft
        size={HeaderOrbIconSize()}
        color={colors.primaryDark}
        strokeWidth={HeaderOrbIconStroke()}
      />
    </HeaderGradientOrbButton>
  );
}
