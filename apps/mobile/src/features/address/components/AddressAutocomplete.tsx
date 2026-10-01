import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { useFormScroll } from '@/components/layout/form-scroll-context';
import { searchAddresses, type AddressSuggestion } from '../api/address.service';
import type { AddressPayload } from '@/features/appointments/form/types';
import { elevation, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

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
  const styles = useStyles(buildStyles);

  const [query, setQuery] = useState(value?.label ?? '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
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
      setSearchFailed(false);
      return;
    }
    setLoading(true);
    setSearchFailed(false);
    try {
      const res = await searchAddresses(text, 10);
      if (!res.success) {
        console.warn('[address-autocomplete] recherche refusée', res.error);
        setSearchFailed(true);
      }
      setSuggestions(res.success && res.data ? res.data : []);
      setOpen(true);
    } catch (err) {
      console.warn('[address-autocomplete] recherche impossible', err);
      setSuggestions([]);
      setSearchFailed(true);
      setOpen(true);
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
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onChange(null);
    setQuery('');
    setSuggestions([]);
    setSearchFailed(false);
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
          textContentType="fullStreetAddress"
          autoComplete="street-address"
          autoCorrect={false}
          leftIcon={<MapPin size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
          rightIcon={
            loading ? (
              <ActivityIndicator size="small" color={c.primary} accessibilityLabel="Recherche d'adresses en cours" />
            ) : value || query ? (
              <Pressable
                onPress={clear}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Effacer l'adresse"
                style={styles.clearBtn}
              >
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
              accessibilityRole="button"
              accessibilityLabel={[s.label, s.postcode, s.city].filter(Boolean).join(', ')}
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

      {open && !loading && searchFailed ? (
        <View style={styles.errorRow}>
          <AppText accessibilityRole="alert" style={styles.errorText}>
            Recherche d&apos;adresse indisponible. Vérifiez votre connexion.
          </AppText>
          <Pressable
            onPress={() => void runSearch(query)}
            accessibilityRole="button"
            accessibilityLabel="Relancer la recherche d'adresse"
            style={styles.retryBtn}
          >
            <AppText style={styles.retryText}>Réessayer</AppText>
          </Pressable>
        </View>
      ) : null}

      {open && query.length >= 3 && !loading && !searchFailed && suggestions.length === 0 ? (
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

function buildStyles({ colors: c, fontSize }: Theme) {
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
    ...font.medium,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  suggestionMeta: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  noResult: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    paddingHorizontal: spacing[1],
  },
  clearBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  errorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    paddingHorizontal: spacing[1],
  },
  errorText: {
    minWidth: 0,
    flex: 1,
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.error,
  },
  retryBtn: {
    minHeight: 44,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing[2],
  },
  retryText: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
};
}
