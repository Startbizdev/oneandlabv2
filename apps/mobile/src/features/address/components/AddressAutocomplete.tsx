import { colors } from '@/theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { searchAddresses, type AddressSuggestion } from '../api/address.service';
import type { AddressPayload } from '@/features/appointments/form/types';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  value: AddressPayload | null;
  complement?: string;
  onChange: (address: AddressPayload | null) => void;
  onComplementChange?: (v: string) => void;
  label?: string;
  error?: string;
}

export function AddressAutocomplete({
  value,
  complement = '',
  onChange,
  onComplementChange,
  label = 'Adresse',
  error,
}: Props) {
  const [query, setQuery] = useState(value?.label ?? '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value?.label) setQuery(value.label);
  }, [value?.label]);

  const runSearch = useCallback(async (text: string) => {
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await searchAddresses(text, 10);
      setSuggestions(res.success && res.data ? res.data : []);
      setOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onQueryChange = (text: string) => {
    setQuery(text);
    if (value) onChange(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => void runSearch(text), 300);
  };

  const select = (s: AddressSuggestion) => {
    onChange({
      label: s.label,
      lat: s.lat,
      lng: s.lng,
      city: s.city,
      postal_code: s.postcode,
    });
    setQuery(s.label);
    setSuggestions([]);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputWrap}>
        <Input
          label={label}
          value={query}
          onChangeText={onQueryChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Tapez au moins 3 caractères…"
          editable={!value}
          leftIcon={<MapPin size={16} color={colors.textTertiary} strokeWidth={2} />}
          rightIcon={
            loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : value ? (
              <Pressable onPress={clear} hitSlop={8}>
                <X size={16} color={colors.textTertiary} strokeWidth={2} />
              </Pressable>
            ) : null
          }
          error={error}
        />
      </View>

      {open && suggestions.length > 0 ? (
        <View style={[styles.dropdown, elevation.md]}>
          {suggestions.map((s, i) => (
            <Pressable
              key={`${s.label}-${i}`}
              onPress={() => select(s)}
              style={[styles.suggestion, i === 0 && styles.suggestionFirst]}
            >
              <Text style={styles.suggestionLabel}>{s.label}</Text>
              {s.postcode || s.city ? (
                <Text style={styles.suggestionMeta}>
                  {[s.postcode, s.city].filter(Boolean).join(' ')}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {open && query.length >= 3 && !loading && suggestions.length === 0 ? (
        <Text style={styles.noResult}>Aucune adresse trouvée</Text>
      ) : null}

      {value && onComplementChange ? (
        <Input
          label="Complément d'adresse (optionnel)"
          value={complement}
          onChangeText={onComplementChange}
          placeholder="Appartement, étage…"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[2] },
  inputWrap: { position: 'relative' },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    maxHeight: 220,
  },
  suggestion: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 2,
  },
  suggestionFirst: { borderTopWidth: 0 },
  suggestionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  suggestionMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  noResult: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    paddingHorizontal: spacing[1],
  },
});
