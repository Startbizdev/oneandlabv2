import { useState } from 'react';
import { Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { iconSize } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { formatNir, maskNir, normalizeNir } from '@/features/profile/utils/nir';

interface Props {
  /** Valeur normalisée (sans espaces). */
  value: string;
  onChange: (normalized: string) => void;
  error?: string | null;
}

/** N° de sécurité sociale : masqué par défaut, affiché par groupes (« 1 85 05 78 006 084 91 »). */
export function NirInput({ value, onChange, error }: Props) {
  const c = useAppColors();
  const [revealed, setRevealed] = useState(false);
  const plain = revealed || !value;
  const Icon = plain ? EyeOff : Eye;

  return (
    <Input
      label="N° de sécurité sociale (NIR)"
      value={plain ? formatNir(value) : maskNir(value)}
      onChangeText={(text) => {
        setRevealed(true);
        onChange(normalizeNir(text));
      }}
      editable={plain}
      keyboardType="default"
      autoCapitalize="characters"
      autoCorrect={false}
      autoComplete="off"
      maxLength={21}
      error={error ?? undefined}
      hint="Utilisé uniquement pour la prise en charge de vos actes. 15 caractères, clé comprise."
      rightIcon={
        value ? (
          <Pressable
            onPress={() => setRevealed(!plain)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={plain ? 'Masquer le numéro de sécurité sociale' : 'Afficher le numéro de sécurité sociale'}
          >
            <Icon size={iconSize.sm} color={c.textSecondary} strokeWidth={2} />
          </Pressable>
        ) : undefined
      }
    />
  );
}
