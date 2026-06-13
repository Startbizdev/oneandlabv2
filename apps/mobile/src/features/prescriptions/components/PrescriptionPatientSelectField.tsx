import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, View, type TextInput } from 'react-native';
import { ChevronDown, PenLine, Search, X } from 'lucide-react-native';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { Input } from '@/components/ui/Input';
import { PrescriptionPatientSelectSheet } from './PrescriptionPatientSelectSheet';
import {
  patientDisplayName,
  patientPickerOptionFromRow,
} from '@/features/patients/utils/patient-contact-display';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  patients: PatientRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  onEditPatient?: (id: string) => void;
  loading?: boolean;
  totalCount?: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  label?: string;
  placeholder?: string;
}

export function PrescriptionPatientSelectField({
  patients,
  selectedId,
  onSelect,
  onEditPatient,
  loading = false,
  totalCount,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  label = 'Patient',
  placeholder = 'Rechercher un patient…',
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionPatientSelectField');
  const inputRef = useRef<TextInput>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [searchIntent, setSearchIntent] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedId),
    [patients, selectedId],
  );

  const comboboxValue =
    editing || open || query.length > 0
      ? query
      : selectedPatient
        ? patientDisplayName(selectedPatient)
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
  ) : selectedPatient && onEditPatient ? (
    <Pressable
      onPress={() => onEditPatient(selectedPatient.id)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Modifier la fiche patient"
    >
      <PenLine size={18} color={c.primary} strokeWidth={2} />
    </Pressable>
  ) : selectedPatient && !editing && !open ? (
    <Pressable
      onPress={handleClear}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Effacer le patient sélectionné"
    >
      <X size={18} color={c.textTertiary} strokeWidth={2} />
    </Pressable>
  ) : (
    <Pressable
      onPress={openSheetFromTrigger}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir la liste des patients"
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
          selectedPatient
            ? `${label}, ${patientDisplayName(selectedPatient)}`
            : `${label}, ${placeholder}`
        }
      />

      {selectedPatient && !open && !editing ? (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedHint} numberOfLines={2}>
            Patient sélectionné — touchez le champ pour changer
          </Text>
          {onEditPatient ? (
            <Pressable
              onPress={() => onEditPatient(selectedPatient.id)}
              style={styles.editLink}
              accessibilityRole="button"
              accessibilityLabel="Modifier la fiche patient"
            >
              <PenLine size={14} color={c.primary} strokeWidth={2} />
              <Text style={styles.editLinkText}>Modifier la fiche</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <PrescriptionPatientSelectSheet
        visible={open}
        onClose={handleClose}
        patients={patients}
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
    selectedRow: {
      gap: spacing[1],
      paddingHorizontal: spacing[0.5],
    },
    selectedHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
    editLink: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1],
    },
    editLinkText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.primary,
    },
  };
}
