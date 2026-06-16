import { ChevronLeft } from 'lucide-react-native';
import { GlassHeaderButton } from '@/components/navigation/GlassHeaderButton';
import { LIQUID_GLASS_HEADER_SYMBOL_SIZE } from '@/components/navigation/nav-chrome-tokens';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  onPress: () => void;
}

/** Retour stack — orb glass circulaire + chevron centré (identique cloche / onglets). */
export function StackHeaderBackButton({ onPress }: Props) {
  const c = useAppColors();

  return (
    <GlassHeaderButton
      symbol="chevron.backward"
      accessibilityLabel="Retour"
      onPress={onPress}
      iconColor={c.primary}
      fallback={
        <ChevronLeft
          size={LIQUID_GLASS_HEADER_SYMBOL_SIZE}
          color={c.primary}
          strokeWidth={2.25}
        />
      }
    />
  );
}
