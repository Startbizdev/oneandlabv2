import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { spacing, AppText, useStyles, type Theme } from '@/theme';
import type { IdentityInfoLine } from '../utils/patient-profile-display';

/** Section « Informations » d'une fiche (identité, adresse, contact) ; rien quand aucune ligne. */
export function PatientInfoCard({ lines }: { lines: IdentityInfoLine[] }) {
  const styles = useStyles(buildStyles);
  const sectionStyles = useStyles(buildSettingsStyles);
  if (lines.length === 0) return null;

  return (
    <View style={sectionStyles.section}>
      <AppText style={sectionStyles.sectionTitle} accessibilityRole="header">
        Informations
      </AppText>
      <Card padding="none">
        {lines.map((line, index) => (
          <Fragment key={line.label}>
            {index > 0 ? <View style={styles.rowDivider} /> : null}
            <View style={styles.infoRow}>
              <AppText variant="caption">{line.label}</AppText>
              <AppText variant="body">{line.value}</AppText>
              {line.secondary ? <AppText variant="secondary">{line.secondary}</AppText> : null}
            </View>
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    infoRow: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      gap: spacing[0.5],
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
      marginLeft: spacing[4],
    },
  };
}
