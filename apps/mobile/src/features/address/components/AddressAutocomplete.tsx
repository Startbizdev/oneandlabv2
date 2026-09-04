import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { useFormScroll } from '@/components/layout/form-scroll-context';
import { searchAddresses, type AddressSuggestion } from '../api/address.service';
import type { AddressPayload } from '@/features/appointments/form/types';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_address_components_AddressAutocomplete_tsx_AddressAutocomplete_styles');

  const [query, setQuery] = useState(value?.label ?? '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<View>(null);
  const formScroll = useFormScroll();

  const scrollSuggestionsIntoView = useCallback(() => {
    const scroll = formScroll?.scrollRef.current;
    const wrapper = wrapperRef.current;
    if (!scroll || !wrapper) return;

    wrapper.measureInWindow((_x, y, _w, h) => {
      const windowH = Dimensions.get('window').height;
      const keyboardH = Keyboard.metrics()?.height ?? (Platform.OS === 'ios' ? 320 : 280);
      const visibleBottom = windowH - keyboardH - 24;
      const blockBottom = y + h;
      if (blockBottom > visibleBottom) {
        const delta = blockBottom - visibleBottom;
        scroll.scrollTo({
          y: (formScroll.scrollYRef.current ?? 0) + delta,
          animated: true,
        });
      }
    });
  }, [formScroll]);

  useEffect(() => {
    if (!open || suggestions.length === 0) return;
    const frame = requestAnimationFrame(() => {
      scrollSuggestionsIntoView();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, suggestions.length, scrollSuggestionsIntoView]);

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
    <View ref={wrapperRef} style={styles.wrapper} collapsable={false}>
      <View style={styles.inputWrap}>
        <Input
          label={label}
          value={query}
          onChangeText={onQueryChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Tapez au moins 3 caractères…"
          editable={!value}
          leftIcon={<MapPin size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
          rightIcon={
            loading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : value ? (
              <Pressable onPress={clear} hitSlop={8}>
                <X size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />
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
              <AppText style={styles.suggestionLabel}>{s.label}</AppText>
              {s.postcode || s.city ? (
                <AppText style={styles.suggestionMeta}>
                  {[s.postcode, s.city].filter(Boolean).join(' ')}
                </AppText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {open && query.length >= 3 && !loading && suggestions.length === 0 ? (
        <AppText style={styles.noResult}>Aucune adresse trouvée</AppText>
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

function buildStyles(c: AppColors) {
  return {
  wrapper: { gap: spacing[2] },
  inputWrap: { position: 'relative' as const },
  dropdown: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
    maxHeight: 220,
  },
  suggestion: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    gap: 2,
  },
  suggestionFirst: { borderTopWidth: 0 },
  suggestionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  suggestionMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  noResult: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    paddingHorizontal: spacing[1],
  },
};
}
