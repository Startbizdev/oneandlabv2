import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, FlaskConical } from 'lucide-react-native';
import type { LabResultListItem } from '@oneandlab/shared-types';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { colors, radius, spacing } from '@/theme';
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
}

/** Carte résultat labo — même layout row que NotificationCard (flex + minWidth:0). */
export const LabResultListCard = React.memo(function LabResultListCard({
  item,
  role,
  opening,
  onOpenDocument,
  onOpenAppointment,
}: Props) {
  const time = formatTime(item.created_at ?? item.appointment_scheduled_at);
  const body = formatBody(item, role);

  return (
    <Pressable
      onPress={() => {
        if (opening) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onOpenDocument();
      }}
      disabled={opening}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir les résultats d’analyses. ${body}`}
    >
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <FlaskConical size={18} color={colors.primary} strokeWidth={2} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleLine}>
            <View style={styles.titleWrap}>
              <Text style={styles.title} numberOfLines={2}>
                Résultats d&apos;analyses
              </Text>
            </View>
            {time ? <Text style={styles.time}>{time}</Text> : null}
          </View>
          <Text style={styles.body} numberOfLines={3}>
            {body}
          </Text>
        </View>

        <Pressable
          onPress={onOpenAppointment}
          hitSlop={10}
          style={styles.chevron}
          accessibilityRole="button"
          accessibilityLabel="Voir le rendez-vous"
        >
          <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
        </Pressable>
      </View>
    </Pressable>
  );
});

const ICON = 40;
const CHEVRON = 16;

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.88,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  iconBox: {
    width: ICON,
    height: ICON,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[2],
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[2],
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    letterSpacing: -0.15,
  },
  time: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textTertiary,
    lineHeight: 14,
    flexShrink: 0,
    paddingTop: 1,
  },
  body: {
    marginTop: spacing[1],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.5,
  },
  chevron: {
    width: CHEVRON,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
