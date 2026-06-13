import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, View, type TextInput } from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Input } from '@/components/ui/Input';
import { PrescriptionAppointmentSelectSheet } from './PrescriptionAppointmentSelectSheet';
import {
  prescriptionAppointmentMatchesSearch,
  prescriptionAppointmentSelectSummary,
} from '../utils/prescription-display';
import { groupAppointmentsByBatch } from '@/utils/appointment-batch';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  appointments: Appointment[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  totalCount?: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  label?: string;
  placeholder?: string;
}

/**
 * Combobox RDV — barre de recherche sur le formulaire, bottom sheet avec la liste.
 * Même logique que `PatientSelectSheet` + champ recherche type `AddressAutocomplete`.
 */
export function PrescriptionAppointmentSelectField({
  appointments,
  selectedId,
  onSelect,
  loading = false,
  totalCount,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  label = 'Rendez-vous',
  placeholder = 'Rechercher par date, créneau ou soin…',
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionAppointmentSelectField');
  const inputRef = useRef<TextInput>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [searchIntent, setSearchIntent] = useState(false);

  const sorted = useMemo(
    () =>
      [...appointments].sort(
        (a, b) =>
          new Date(b.scheduled_at ?? b.created_at ?? 0).getTime() -
          new Date(a.scheduled_at ?? a.created_at ?? 0).getTime(),
      ),
    [appointments],
  );

  const grouped = useMemo(() => groupAppointmentsByBatch(sorted), [sorted]);

  const filteredRows = useMemo(() => {
    const q = query.trim();
    if (!q) return grouped;
    return grouped.filter((row) => {
      const apts: Appointment[] =
        row.kind === 'batch' ? row.appointments : [row.appointment];
      return apts.some((a) => prescriptionAppointmentMatchesSearch(a, q));
    });
  }, [grouped, query]);

  const selectedApt = useMemo(
    () => appointments.find((a) => a.id === selectedId) ?? sorted.find((a) => a.id === selectedId),
    [appointments, selectedId, sorted],
  );

  const comboboxValue =
    editing || open || query.length > 0
      ? query
      : selectedApt
        ? prescriptionAppointmentSelectSummary(selectedApt)
        : '';

  const openSheet = useCallback(
    (options?: { preserveQuery?: boolean }) => {
      if (loading) return;
      setEditing(true);
      if (!options?.preserveQuery && !open) setQuery('');
      setOpen(true);
    },
    [loading, open],
  );

  const handleFocus = useCallback(() => {
    if (open) {
      setSearchIntent(true);
      return;
    }
    setSearchIntent(false);
    openSheet();
  }, [open, openSheet]);

  useEffect(() => {
    if (!open) {
      setSearchIntent(false);
      return;
    }
    if (searchIntent || query.length > 0) return;

    const frame = requestAnimationFrame(() => {
      inputRef.current?.blur();
      Keyboard.dismiss();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, query, searchIntent]);

  const handleClose = useCallback(() => {
    setQuery('');
    setEditing(false);
    setSearchIntent(false);
    setOpen(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      setSearchIntent(true);
      setEditing(true);
      setQuery(text);
      if (!open) setOpen(true);
      if (selectedId) onSelect('');
    },
    [onSelect, open, selectedId],
  );

  const handlePick = useCallback(
    (id: string) => {
      onSelect(id);
      setQuery('');
      setEditing(false);
      setSearchIntent(false);
      setOpen(false);
      inputRef.current?.blur();
      Keyboard.dismiss();
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    onSelect('');
    setQuery('');
    setEditing(true);
    setSearchIntent(false);
    setOpen(true);
  }, [onSelect]);

  const openSheetFromTrigger = useCallback(() => {
    setSearchIntent(false);
    openSheet();
  }, [openSheet]);

  const rightIcon = loading ? (
    <ActivityIndicator size="small" color={c.primary} />
  ) : selectedApt && !editing && !open ? (
    <Pressable
      onPress={handleClear}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Effacer le rendez-vous sélectionné"
    >
      <X size={18} color={c.textTertiary} strokeWidth={2} />
    </Pressable>
  ) : (
    <Pressable
      onPress={openSheetFromTrigger}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir la liste des rendez-vous"
    >
      <ChevronDown size={18} color={c.textSecondary} strokeWidth={2} />
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Input
        ref={inputRef}
        label={label}
        value={comboboxValue}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        placeholder={placeholder}
        editable={!loading}
        leftIcon={<Search size={16} color={c.textTertiary} strokeWidth={2} />}
        rightIcon={rightIcon}
        accessibilityLabel={
          selectedApt
            ? `${label}, ${prescriptionAppointmentSelectSummary(selectedApt)}`
            : `${label}, ${placeholder}`
        }
      />

      {selectedApt && !open && !editing ? (
        <Text style={styles.selectedHint} numberOfLines={2}>
          RDV sélectionné — touchez le champ pour changer
        </Text>
      ) : null}

      <PrescriptionAppointmentSelectSheet
        visible={open}
        onClose={handleClose}
        rows={filteredRows}
        selectedId={selectedId}
        onSelect={handlePick}
        loading={loading}
        query={query}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      gap: spacing[1],
      alignSelf: 'stretch' as const,
    },
    selectedHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      paddingHorizontal: spacing[0.5],
    },
  };
}
