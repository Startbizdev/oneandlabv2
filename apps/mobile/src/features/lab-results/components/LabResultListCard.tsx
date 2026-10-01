import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, FlaskConical } from 'lucide-react-native';
import type { LabResultListItem } from '@oneandlab/shared-types';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useAppColors, useStyles, font, type Theme } from '@/theme';

dayjs.locale('fr');

type RoleMode = 'patient' | 'nurse' | 'pro';

function patientName(item: LabResultListItem): string {
  const n = `${item.patient_first_name ?? ''} ${item.patient_last_name ?? ''}`.trim();
  return n || 'Patient';
}

function resultTitle(item: LabResultListItem, role: RoleMode): string {
  if (role !== 'patient') return patientName(item);
  return item.category_name?.trim() || 'Résultats d’analyses';
}

function resultMeta(item: LabResultListItem, role: RoleMode): string {
  const parts: string[] = [];
  if (role !== 'patient' && item.category_name?.trim()) parts.push(item.category_name.trim());
  const shared = item.created_at ? dayjs(item.created_at) : null;
  if (shared?.isValid()) parts.push(`Reçu le ${shared.format('D MMMM YYYY')}`);
  const rdv = item.appointment_scheduled_at ? dayjs(item.appointment_scheduled_at) : null;
  if (rdv?.isValid()) parts.push(`Visite du ${rdv.format('D MMMM')}`);
  return parts.join(' · ');
}

interface Props {
  item: LabResultListItem;
  role: RoleMode;
  opening: boolean;
  onOpenDocument: () => void;
  onOpenAppointment: () => void;
  onAskCary?: () => void;
}

export const LabResultListCard = React.memo(function LabResultListCard({
  item,
  role,
  opening,
  onOpenDocument,
  onOpenAppointment,
  onAskCary,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const title = resultTitle(item, role);
  const meta = resultMeta(item, role);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onOpenDocument();
        }}
        disabled={opening}
        style={({ pressed }) => (pressed ? styles.pressed : null)}
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir le document. ${title}${meta ? `, ${meta}` : ''}`}
        accessibilityState={{ busy: opening }}
      >
        <ListRowShell
          leading={
            <View style={styles.iconBox}>
              <FlaskConical size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          }
          body={
            <View style={styles.texts}>
              <AppText style={styles.title}>{title}</AppText>
              {meta ? <AppText variant="caption">{meta}</AppText> : null}
            </View>
          }
          trailing={
            opening ? (
              <ActivityIndicator color={c.primary} accessibilityLabel="Ouverture du document" />
            ) : (
              <ChevronRight size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
            )
          }
        />
      </Pressable>
      <Row gap={spacing[2]} style={styles.footer}>
        <Button title="Voir la visite" variant="ghost" size="sm" onPress={onOpenAppointment} />
        {onAskCary ? (
          <Button title="Demander à Cary" variant="ghost" size="sm" onPress={onAskCary} />
        ) : null}
      </Row>
    </View>
  );
});

function buildStyles({ colors: c, text }: Theme) {
  return {
    card: {
      alignSelf: 'stretch' as const,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    pressed: { backgroundColor: c.surfaceAlt },
    iconBox: {
      width: spacing[10],
      height: spacing[10],
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    texts: { gap: spacing[0.5] },
    title: { ...text.body, ...font.semiBold, color: c.textPrimary },
    footer: {
      flexWrap: 'wrap' as const,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      paddingHorizontal: spacing[2],
    },
  };
}
