import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { colors, radius, spacing } from '@/theme';
import { rdvDetailSectionStyles } from '@/features/appointments/detail/components/layout/rdv-detail-section-styles';

/** Ligne label + valeur (fiche KV, profil, etc.). */
export function SkeletonKvRow({
  labelWidth = '32%',
  valueWidth = '72%',
  style,
}: {
  labelWidth?: number | `${number}%`;
  valueWidth?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.kvRow, style]}>
      <Skeleton height={10} width={labelWidth} borderRadius={radius.xs} />
      <Skeleton height={18} width={valueWidth} borderRadius={radius.sm} />
    </View>
  );
}

/** Placeholder lignes soin pendant chargement catalogue / lot. */
export function SkeletonRdvCarePlaceholder({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.careBlock}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[rdvDetailSectionStyles.sectionRow, i > 0 && rdvDetailSectionStyles.rowBorder]}
        >
          <SkeletonKvRow labelWidth="38%" valueWidth="85%" />
        </View>
      ))}
    </View>
  );
}

/** Carte « Informations du rendez-vous » — structure réelle de la section. */
export function SkeletonRdvInfoCard({
  edgeToEdge = false,
  carePlaceholderCount = 0,
  showContactButtons = true,
}: {
  edgeToEdge?: boolean;
  carePlaceholderCount?: number;
  showContactButtons?: boolean;
}) {
  return (
    <View style={[rdvDetailSectionStyles.card, edgeToEdge && rdvDetailSectionStyles.cardEdge]}>
      <View style={rdvDetailSectionStyles.sectionRow}>
        <SkeletonKvRow labelWidth="22%" valueWidth="92%" />
      </View>
      <View style={[rdvDetailSectionStyles.sectionRow, rdvDetailSectionStyles.rowBorder]}>
        <SkeletonKvRow labelWidth="36%" valueWidth="78%" />
      </View>
      {carePlaceholderCount > 0 ? (
        <SkeletonRdvCarePlaceholder count={carePlaceholderCount} />
      ) : null}
      <View style={[rdvDetailSectionStyles.sectionRow, rdvDetailSectionStyles.rowBorder]}>
        <SkeletonKvRow labelWidth="24%" valueWidth="55%" />
      </View>
      <View style={[rdvDetailSectionStyles.sectionRow, rdvDetailSectionStyles.rowBorder]}>
        <SkeletonKvRow labelWidth="42%" valueWidth="68%" />
      </View>
      {showContactButtons ? (
        <View style={[rdvDetailSectionStyles.sectionRow, rdvDetailSectionStyles.rowBorder, styles.actionsRow]}>
          <View style={styles.buttonRow}>
            <Skeleton height={44} style={styles.buttonCell} borderRadius={radius.md} />
            <Skeleton height={44} style={styles.buttonCell} borderRadius={radius.md} />
            <Skeleton height={44} style={styles.buttonCell} borderRadius={radius.md} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Barre d’onglets segmentés (Informations / Documents…). */
export function SkeletonSegmentBar({ segments = 2 }: { segments?: number }) {
  return (
    <View style={styles.segmentBar}>
      {Array.from({ length: segments }).map((_, i) => (
        <Skeleton key={i} height={40} style={styles.segmentItem} borderRadius={radius.lg} />
      ))}
    </View>
  );
}

/** Ligne intervenant (avatar + texte + mini boutons). */
export function SkeletonEntityRow({ showDivider = false }: { showDivider?: boolean }) {
  return (
    <View style={[styles.entityRow, showDivider && styles.entityDivider]}>
      <Skeleton height={36} width={36} borderRadius={radius.full} />
      <View style={styles.entityText}>
        <Skeleton height={9} width="40%" borderRadius={radius.xs} />
        <Skeleton height={14} width="72%" borderRadius={radius.sm} />
      </View>
      <Skeleton height={28} width={72} borderRadius={radius.sm} />
    </View>
  );
}

export function SkeletonAssigneeCard({ rows = 2 }: { rows?: number }) {
  return (
    <View style={rdvDetailSectionStyles.card}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonEntityRow key={i} showDivider={i < rows - 1} />
      ))}
    </View>
  );
}

/** Ligne action sidebar (icône + titre + chevron). */
export function SkeletonDetailActionRow({ destructive = false }: { destructive?: boolean }) {
  return (
    <View style={[styles.actionRow, destructive && styles.actionRowDestructive]}>
      <Skeleton height={40} width={40} borderRadius={radius.md} />
      <View style={styles.actionText}>
        <Skeleton height={16} width="55%" borderRadius={radius.sm} />
        <Skeleton height={12} width="72%" borderRadius={radius.xs} />
      </View>
    </View>
  );
}

export function SkeletonDetailActionsCard({ count = 2 }: { count?: number }) {
  return (
    <View style={rdvDetailSectionStyles.card}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={i > 0 ? rdvDetailSectionStyles.rowBorder : undefined}>
          <SkeletonDetailActionRow destructive={i === count - 1 && count > 1} />
        </View>
      ))}
    </View>
  );
}

/** Carte liste générique (RDV, patient, notification…). */
export function SkeletonListCard({ height = 116 }: { height?: number }) {
  return (
    <View style={styles.listCard}>
      <Skeleton height={height - spacing[3] * 2} borderRadius={radius.lg} />
    </View>
  );
}

export function SkeletonList({ count = 4, itemHeight = 116, gap = spacing[3] }: {
  count?: number;
  itemHeight?: number;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListCard key={i} height={itemHeight} />
      ))}
    </View>
  );
}

/** Ligne liste Patients staff (avatar 44 + nom + sous-titre + chevron). */
export function SkeletonPatientListRow({ showDivider = true }: { showDivider?: boolean }) {
  return (
    <View>
      <View style={styles.patientRow}>
        <Skeleton height={44} width={44} borderRadius={radius.full} />
        <View style={styles.patientInfo}>
          <Skeleton height={15} width="62%" borderRadius={radius.sm} />
          <Skeleton height={12} width="48%" borderRadius={radius.xs} style={styles.patientSub} />
        </View>
        <Skeleton height={20} width={12} borderRadius={radius.xs} />
      </View>
      {showDivider ? <View style={styles.patientSep} /> : null}
    </View>
  );
}

export function SkeletonPatientList({ count = 8 }: { count?: number }) {
  return (
    <View style={styles.patientList}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPatientListRow key={i} showDivider={i < count - 1} />
      ))}
    </View>
  );
}

/** Écran détail RDV staff (infirmier / pro / préleveur). */
export function SkeletonStaffAppointmentDetail({
  showPhotosTab = false,
  showAssignees = true,
  showActions = true,
}: {
  showPhotosTab?: boolean;
  showAssignees?: boolean;
  showActions?: boolean;
}) {
  const segmentCount = 2 + (showPhotosTab ? 1 : 0);
  return (
    <SkeletonScreen>
      <SkeletonSegmentBar segments={segmentCount} />
      <SkeletonRdvInfoCard edgeToEdge carePlaceholderCount={3} />
      {showAssignees ? <SkeletonAssigneeCard rows={2} /> : null}
      {showActions ? <SkeletonDetailActionsCard count={3} /> : null}
    </SkeletonScreen>
  );
}

/** Écran détail RDV patient. */
export function SkeletonPatientAppointmentDetail({
  showReviewsTab = false,
}: {
  showReviewsTab?: boolean;
}) {
  const segmentCount = 2 + (showReviewsTab ? 1 : 0);
  return (
    <SkeletonScreen>
      <SkeletonSegmentBar segments={segmentCount} />
      <SkeletonRdvInfoCard edgeToEdge carePlaceholderCount={2} showContactButtons />
      <SkeletonAssigneeCard rows={3} />
      <SkeletonDetailActionsCard count={2} />
      <Skeleton height={88} borderRadius={radius.xl} />
    </SkeletonScreen>
  );
}

/** Profil : hero + cartes empilées. */
export function SkeletonProfileScreen({ cards = 2 }: { cards?: number }) {
  return (
    <SkeletonScreen>
      <View style={styles.profileHero}>
        <Skeleton height={56} width={56} borderRadius={radius.full} />
        <View style={styles.profileHeroText}>
          <Skeleton height={20} width="55%" borderRadius={radius.sm} />
          <Skeleton height={14} width="30%" borderRadius={radius.xs} />
        </View>
      </View>
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton height={i === 0 ? 140 : 180} key={i} borderRadius={radius.xl} />
      ))}
    </SkeletonScreen>
  );
}

/** Dashboard stats (pro). */
export function SkeletonDashboardStats() {
  return (
    <View style={styles.statsRow}>
      <Skeleton height={110} style={styles.statCell} borderRadius={radius.xl} />
      <Skeleton height={110} style={styles.statCell} borderRadius={radius.xl} />
      <Skeleton height={110} style={styles.statCell} borderRadius={radius.xl} />
    </View>
  );
}

/** Wizard booking — étape choix des soins (chips + grille 2 colonnes). */
export function SkeletonCareSelectionStep({ count = 8 }: { count?: number }) {
  return (
    <View style={styles.careSelectionRoot}>
      <View style={styles.careSelectionHeader}>
        <View style={styles.careSelectionSegments}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={52} width={68} borderRadius={radius.md} />
          ))}
        </View>
        <View style={styles.careSelectionMeta}>
          <Skeleton height={14} width={120} borderRadius={radius.sm} />
          <Skeleton height={10} width={48} borderRadius={radius.xs} />
        </View>
      </View>
      <View style={styles.careSelectionGrid}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} height={108} style={styles.careSelectionTile} borderRadius={radius.xl} />
        ))}
      </View>
    </View>
  );
}

/** Conteneur écran avec padding standard. */
export function SkeletonScreen({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[3],
    backgroundColor: colors.background,
  },
  kvRow: {
    gap: spacing[1],
  },
  careBlock: {},
  actionsRow: {
    paddingVertical: spacing[3],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[1.5],
  },
  buttonCell: {
    flex: 1,
  },
  segmentBar: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  segmentItem: {
    flex: 1,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
  },
  entityDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  entityText: {
    flex: 1,
    gap: spacing[1],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  actionRowDestructive: {
    backgroundColor: colors.errorLight,
  },
  actionText: {
    flex: 1,
    gap: spacing[1],
  },
  listCard: {
    paddingVertical: spacing[1],
  },
  patientList: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
  },
  patientInfo: {
    flex: 1,
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  patientSub: {
    marginTop: spacing[1.5],
  },
  patientSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: 68,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  profileHeroText: {
    flex: 1,
    gap: spacing[1],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  statCell: {
    flex: 1,
  },
  careSelectionRoot: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  careSelectionHeader: {
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  careSelectionSegments: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  careSelectionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  careSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  careSelectionTile: {
    width: '48%',
  },
});
