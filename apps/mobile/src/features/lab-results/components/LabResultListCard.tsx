import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import * as Haptics from 'expo-haptics';
import { ChevronRight, FlaskConical } from 'lucide-react-native';
import type { LabResultListItem } from '@oneandlab/shared-types';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

type RoleMode = 'patient' | 'nurse' | 'pro';

function patientName(item: LabResultListItem): string {
  const n = `${item.patient_first_name ?? ''} ${item.patient_last_name ?? ''}`.trim();
  return n || 'Patient';
}

function formatTime(iso?: string | null): string {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid() ? d.format('D MMM') : '';
}

function formatBody(item: LabResultListItem, role: RoleMode): string {
  const lines: string[] = [];
  if (role !== 'patient') {
    lines.push(patientName(item));
  }
  if (item.category_name?.trim()) {
    lines.push(item.category_name.trim());
  }
  const rdv = item.appointment_scheduled_at;
  if (rdv) {
    const d = dayjs(rdv);
    if (d.isValid()) {
      lines.push(`RDV ${d.format('dddd D MMMM YYYY')}`);
    }
  }
  const file = item.file_name?.trim();
  if (file) {
    lines.push(file);
  }
  return lines.join(' · ') || 'Document PDF';
}

interface Props {
  item: LabResultListItem;
  role: RoleMode;
  opening: boolean;
  onOpenDocument: () => void;
  onOpenAppointment: () => void;
  onAskCary?: () => void;
}

/** Carte résultat labo — même layout row que NotificationCard (flex + minWidth:0). */
export const LabResultListCard = React.memo(function LabResultListCard({
  item,
  role,
  opening,
  onOpenDocument,
  onOpenAppointment,
  onAskCary,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_lab_results_components_LabResultListCard_tsx_styles');

  const time = formatTime(item.created_at ?? item.appointment_scheduled_at);
  const body = formatBody(item, role);

  return (
    <Pressable
      onPress={() => {
        if (opening) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onOpenDocument();
      }}
      onLongPress={
        onAskCary
          ? () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAskCary();
            }
          : undefined
      }
      disabled={opening}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir les résultats d’analyses. ${body}`}
    >
      <Cluster
        gap={spacing[3]}
        style={styles.row}
        leading={
          <View style={styles.iconBox}>
            <FlaskConical size={18} color={c.primary} strokeWidth={2} />
          </View>
        }
        actions={
          <Pressable
            onPress={onOpenAppointment}
            hitSlop={10}
            style={styles.chevron}
            accessibilityRole="button"
            accessibilityLabel="Voir le rendez-vous"
          >
            <ChevronRight size={16} color={c.textTertiary} strokeWidth={2} />
          </Pressable>
        }
      >
        <View style={styles.content}>
          <Row align="start">
            <View style={styles.titleWrap}>
              <Text style={styles.title} numberOfLines={2}>
                Résultats d&apos;analyses
              </Text>
            </View>
            {time ? <Text style={styles.time}>{time}</Text> : null}
          </Row>
          <Text style={styles.body} numberOfLines={3}>
            {body}
          </Text>
        </View>
      </Cluster>
    </Pressable>
  );
});

const ICON = 40;
const CHEVRON = 16;

function buildStyles(c: AppColors) {
  return {
  card: {
    alignSelf: 'stretch' as const,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
  },
  cardPressed: {
    opacity: 0.88,
  },
  row: {
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  iconBox: {
    width: ICON,
    height: ICON,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing[3],
    flexShrink: 0,
  },
  content: {
    marginRight: spacing[2],
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[2],
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    letterSpacing: -0.15,
  },
  time: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    lineHeight: 14,
    flexShrink: 0,
    paddingTop: 1,
  },
  body: {
    marginTop: spacing[1],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.5,
  },
  chevron: {
    width: CHEVRON,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
};
}

