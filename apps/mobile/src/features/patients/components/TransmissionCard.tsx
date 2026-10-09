import { View } from 'react-native';
import type { PatientTransmission } from '@oneandlab/shared-types';
import { transmissionAuthorLine, transmissionTimeLabel } from '@oneandlab/shared-utils';
import { Row } from '@/components/layout/primitives';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText, font, spacing, useStyles, type Theme } from '@/theme';
import { TransmissionCareItemChips } from './TransmissionCareItemChips';

interface Props {
  transmission: PatientTransmission;
  onEdit: (transmission: PatientTransmission) => void;
}

export function TransmissionCard({ transmission, onEdit }: Props) {
  const styles = useStyles(buildStyles);
  const time = transmissionTimeLabel(transmission);

  return (
    <Card padding="md">
      <View style={styles.body}>
        <Row gap={spacing[2]} align="start">
          <AppText style={styles.author} numberOfLines={2}>
            {transmissionAuthorLine(transmission.author)}
          </AppText>
          {time ? <AppText variant="caption">{time}</AppText> : null}
        </Row>
        {transmission.for_doctor ? <Badge label="Pour le médecin" variant="warning" dot={false} /> : null}
        <AppText variant="body" selectable>
          {transmission.body}
        </AppText>
        {transmission.care_items.length > 0 ? <TransmissionCareItemChips items={transmission.care_items} /> : null}
        {transmission.edited_at || transmission.can_edit ? (
          <Row gap={spacing[2]} align="center" style={styles.footer}>
            <AppText variant="caption" style={styles.footerText}>
              {transmission.edited_at ? 'Modifiée' : ''}
            </AppText>
            {transmission.can_edit ? (
              <Button
                title="Modifier"
                size="sm"
                variant="ghost"
                accessibilityLabel="Modifier la transmission"
                onPress={() => onEdit(transmission)}
              />
            ) : null}
          </Row>
        ) : null}
      </View>
    </Card>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    body: { gap: spacing[2], minWidth: 0 },
    author: { ...font.semiBold, flex: 1, minWidth: 0, fontSize: fontSize.sm, color: c.textPrimary },
    footer: { minWidth: 0 },
    footerText: { flex: 1, minWidth: 0 },
  };
}
