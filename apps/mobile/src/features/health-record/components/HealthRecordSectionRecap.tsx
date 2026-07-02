import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Text, View } from 'react-native';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { Row } from '@/components/layout/primitives';
import type { HealthRecordRecapSection } from '../api/health-record.service';
import { isHealthRecordValueFilled } from '../utils/health-record-display';
import { HealthRecordFieldRow } from './HealthRecordFieldRow';
import { HealthRecordSectionProgress } from './HealthRecordSectionProgress';
import { HealthRecordSectionEmoji } from './HealthRecordSectionEmoji';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  section: HealthRecordRecapSection;
  onEdit?: (sectionId: string) => void;
  /** Dans la carte sections du récap — sans bordure externe. */
  embedded?: boolean;
}

export function HealthRecordSectionRecap({ section, onEdit, embedded }: Props) {
  const styles = useThemedStyles(buildStyles, 'HealthRecordSectionRecap');
  const items = section.items.filter((item) => item?.key);
  const filled = items.filter((i) => isHealthRecordValueFilled(i.display)).length;
  const total = items.length;

  return (
    <View style={embedded ? styles.embedded : styles.card}>
      {onEdit ? (
        <View style={styles.headerBlock}>
          <ProfileNavRow
            leading={<HealthRecordSectionEmoji sectionId={section.id} />}
            title={section.label_fr}
            subtitle={`${filled}/${total} renseigné${filled > 1 ? 's' : ''}`}
            onPress={() => onEdit(section.id)}
          />
          <HealthRecordSectionProgress filled={filled} total={total} />
        </View>
      ) : (
        <View style={styles.headerOnly}>
          <Row gap={spacing[2]} align="center">
            <HealthRecordSectionEmoji sectionId={section.id} />
            <Text style={styles.title}>{section.label_fr}</Text>
          </Row>
          <HealthRecordSectionProgress filled={filled} total={total} />
        </View>
      )}

      <View style={styles.items}>
        {items.slice(0, 4).map((item) => (
          <HealthRecordFieldRow
            key={item.key}
            label={item.label_fr?.trim() || item.key}
            display={item.display}
          />
        ))}
        {total > 4 ? (
          <Text style={styles.moreHint} accessibilityRole="text">
            + {total - 4} autre{total - 4 > 1 ? 's' : ''} — appuyez pour voir la section
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      marginBottom: spacing[3],
    },
    embedded: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    headerBlock: {
      marginBottom: spacing[3],
    },
    headerOnly: {
      gap: spacing[1],
      marginBottom: spacing[3],
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    items: {
      gap: spacing[3],
    },
    moreHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      paddingTop: spacing[0.5],
    },
  };
}
