import { ChevronLeft } from 'lucide-react-native';
import { GlassHeaderButton } from '@/components/navigation/GlassHeaderButton';
import {
  LIQUID_GLASS_HEADER_SYMBOL_SIZE,
} from '@/components/navigation/nav-chrome-tokens';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  onPress: () => void;
}

/** Retour header onglets flottants — GlassView (pas pour stacks). */
export function HeaderBackButton({ onPress }: Props) {
  const c = useAppColors();

  return (
    <GlassHeaderButton
      symbol="chevron.backward"
      accessibilityLabel="Retour"
      onPress={onPress}
      iconColor={c.primaryDark}
      fallback={
        <ChevronLeft
          size={LIQUID_GLASS_HEADER_SYMBOL_SIZE}
          color={c.primaryDark}
          strokeWidth={2.25}
        />
      }
    />
  );
}
