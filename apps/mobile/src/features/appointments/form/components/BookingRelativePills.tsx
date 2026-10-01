import { Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import type { PatientRelative } from '@/features/patient-relatives/api/patient-relatives.service';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, font, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';

interface Props {
  /** Libellé du titulaire du compte (« Pour moi », « Titulaire »). */
  selfLabel: string;
  relatives: PatientRelative[];
  selectedId: string | null;
  onSelect: (relativeId: string | null) => void;
  addLabel: string;
  onAdd: () => void;
}

function relativeLabel(r: PatientRelative): string {
  return `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Proche';
}

/** Choix du bénéficiaire : titulaire ou un proche, plus l'ajout d'un proche. */
export function BookingRelativePills({ selfLabel, relatives, selectedId, onSelect, addLabel, onAdd }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const options = [
    { id: null, label: selfLabel },
    ...relatives.map((r) => ({ id: r.id, label: relativeLabel(r) })),
  ];

  return (
    <Row wrap gap={spacing[2]} align="center">
      {options.map((option) => {
        const on = selectedId === option.id;
        return (
          <Pressable
            key={option.id ?? 'self'}
            onPress={() => onSelect(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={option.label}
            style={[styles.pill, on && styles.pillActive]}
          >
            <AppText style={[styles.pillText, on && styles.pillTextActive]}>{option.label}</AppText>
          </Pressable>
        );
      })}
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Ajouter un proche"
        style={[styles.pill, styles.addPill]}
      >
        <Row gap={spacing[1]} align="center">
          <Plus size={iconSize.xs} color={c.primary} strokeWidth={2.5} />
          <AppText style={styles.addText}>{addLabel}</AppText>
        </Row>
      </Pressable>
    </Row>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    pill: {
      minHeight: 44,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    pillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    pillText: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    pillTextActive: { color: c.onPrimary },
    addPill: {
      borderColor: c.primaryMid,
      borderStyle: 'dashed' as const,
      backgroundColor: 'transparent',
    },
    addText: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.primary,
    },
  };
}
