import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FileText, History } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function HubRow({
  Icon,
  title,
  subtitle,
  badge,
  onPress,
  topBorder,
}: {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
  topBorder?: boolean;
}) {
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.row, topBorder && styles.rowBorder]}>
        <View style={styles.iconWrap}>
          <Icon size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>{subtitle}</Text>
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

interface Props {
  documentsCount: number;
  historyCount?: number;
  onDocuments: () => void;
  onHistory: () => void;
}

export function PatientDetailHubCard({
  documentsCount,
  historyCount,
  onDocuments,
  onHistory,
}: Props) {
  return (
    <View style={styles.card}>
      <HubRow
        Icon={FileText}
        title="Documents"
        subtitle="Pièces jointes, dépôt et téléchargement"
        badge={documentsCount > 0 ? String(documentsCount) : undefined}
        onPress={onDocuments}
      />
      <HubRow
        Icon={History}
        title="Historique"
        subtitle="Vos rendez-vous passés pour ce dossier"
        badge={historyCount != null && historyCount > 0 ? String(historyCount) : undefined}
        onPress={onHistory}
        topBorder
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  rowTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  rowSub: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.textInverse,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.textTertiary,
  },
});
