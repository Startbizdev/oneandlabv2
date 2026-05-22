import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { buildRdvInfoContent } from '../../utils/build-rdv-info-rows';
import { ContactActionBar } from './ContactActionBar';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { rdvDetailSectionStyles } from './rdv-detail-section-styles';

interface Props {
  apt: Appointment;
  viewer?: AuthUser | null;
  onAddressPress?: () => void;
  edgeToEdge?: boolean;
  omitCareFields?: boolean;
}

export function RdvAppointmentInfoSection({
  apt,
  viewer,
  onAddressPress,
  edgeToEdge = false,
  omitCareFields = false,
}: Props) {
  const { rows } = useMemo(
    () => buildRdvInfoContent(apt, viewer, { omitCareFields }),
    [apt, viewer, omitCareFields],
  );

  if (!rows.length) return null;

  return (
    <View style={[rdvDetailSectionStyles.card, edgeToEdge && rdvDetailSectionStyles.cardEdge]}>
      <View>
        {rows.map((row, i) => (
          <View
            key={`${row.kind}-${i}`}
            style={[
              rdvDetailSectionStyles.sectionRow,
              styles.infoRow,
              i > 0 && rdvDetailSectionStyles.rowBorder,
            ]}
          >
            {row.kind === 'actions' ? (
              <ContactActionBar actions={row.actions} />
            ) : row.kind === 'address' ? (
              <>
                <Text style={styles.label}>Adresse</Text>
                <Pressable onPress={onAddressPress} disabled={!onAddressPress}>
                  <Text style={styles.value}>{row.value}</Text>
                </Pressable>
              </>
            ) : row.kind === 'identity' ? (
              <>
                <Text style={styles.label}>Patient</Text>
                <Text style={styles.value}>
                  {[row.firstName, row.lastName].filter(Boolean).join(' ')}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={[styles.value, row.strikethrough && styles.valueMuted]}>
                  {row.value}
                </Text>
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    gap: spacing[1],
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.35,
  },
  valueMuted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
});
