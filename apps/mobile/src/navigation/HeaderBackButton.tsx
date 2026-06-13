import { ChevronLeft } from 'lucide-react-native';
import {
  HeaderGradientOrbButton,
  HeaderOrbIconSize,
  HeaderOrbIconStroke,
} from '@/components/navigation/HeaderGradientOrbButton';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  onPress: () => void;
}

/** Retour — anneau gradient + fond verre. */
export function HeaderBackButton({ onPress }: Props) {
  const c = useAppColors();

  return (
    <HeaderGradientOrbButton
      onPress={onPress}
      accessibilityLabel="Retour"
      variant="glass"
    >
      <ChevronLeft
        size={HeaderOrbIconSize()}
        color={c.primaryDark}
        strokeWidth={HeaderOrbIconStroke()}
      />
    </HeaderGradientOrbButton>
  );
}
