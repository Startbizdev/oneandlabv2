import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { radius, spacing } from '@/theme';
import { getRdvDetailSectionStyles } from '@/features/appointments/detail/components/layout/rdv-detail-section-styles';

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
  const styles = useThemedStyles(buildStyles, 'components_ui_skeleton_presets_tsx_styles');
  return (
    <View style={[styles.kvRow, style]}>
      <Skeleton height={10} width={labelWidth} borderRadius={radius.xs} />
      <Skeleton height={18} width={valueWidth} borderRadius={radius.sm} />
    </View>
  );
}

const SKELETON_CTX = 'skeleton-presets';

/** Placeholder lignes soin pendant chargement catalogue / lot. */
export function SkeletonRdvCarePlaceholder({ count = 3 }: { count?: number }) {
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
  return (
    <View style={styles.careBlock}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[getRdvDetailSectionStyles().sectionRow, i > 0 && getRdvDetailSectionStyles().rowBorder]}
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
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
  return (
    <View style={[getRdvDetailSectionStyles().card, edgeToEdge && getRdvDetailSectionStyles().cardEdge]}>
      <View style={getRdvDetailSectionStyles().sectionRow}>
        <SkeletonKvRow labelWidth="22%" valueWidth="92%" />
      </View>
      <View style={[getRdvDetailSectionStyles().sectionRow, getRdvDetailSectionStyles().rowBorder]}>
        <SkeletonKvRow labelWidth="36%" valueWidth="78%" />
      </View>
      {carePlaceholderCount > 0 ? (
        <SkeletonRdvCarePlaceholder count={carePlaceholderCount} />
      ) : null}
      <View style={[getRdvDetailSectionStyles().sectionRow, getRdvDetailSectionStyles().rowBorder]}>
        <SkeletonKvRow labelWidth="24%" valueWidth="55%" />
      </View>
      <View style={[getRdvDetailSectionStyles().sectionRow, getRdvDetailSectionStyles().rowBorder]}>
        <SkeletonKvRow labelWidth="42%" valueWidth="68%" />
      </View>
      {showContactButtons ? (
        <View style={[getRdvDetailSectionStyles().sectionRow, getRdvDetailSectionStyles().rowBorder, styles.actionsRow]}>
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

/** Barre d’onglets segmentés (Infos / Documents / Échange). */
export function SkeletonSegmentBar({ segments = 2 }: { segments?: number }) {
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
  return (
    <View style={styles.segmentBarHost}>
      <View style={styles.segmentBar}>
        {Array.from({ length: segments }).map((_, i) => (
          <Skeleton key={i} height={56} style={styles.segmentItem} borderRadius={radius.md} />
        ))}
      </View>
    </View>
  );
}

/** Ligne intervenant (avatar + texte + mini boutons). */
export function SkeletonEntityRow({ showDivider = false }: { showDivider?: boolean }) {
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
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
    <View style={getRdvDetailSectionStyles().card}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonEntityRow key={i} showDivider={i < rows - 1} />
      ))}
    </View>
  );
}

/** Ligne action sidebar (icône + titre + chevron). */
export function SkeletonDetailActionRow({ destructive = false }: { destructive?: boolean }) {
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
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
    <View style={getRdvDetailSectionStyles().card}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={i > 0 ? getRdvDetailSectionStyles().rowBorder : undefined}>
          <SkeletonDetailActionRow destructive={i === count - 1 && count > 1} />
        </View>
      ))}
    </View>
  );
}

/** Carte liste générique (RDV, patient, notification…). */
export function SkeletonListCard({ height = 116 }: { height?: number }) {
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
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
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
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
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
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
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
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
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
  return (
    <View style={styles.statsRow}>
      <Skeleton height={110} style={styles.statCell} borderRadius={radius.xl} />
      <Skeleton height={110} style={styles.statCell} borderRadius={radius.xl} />
      <Skeleton height={110} style={styles.statCell} borderRadius={radius.xl} />
    </View>
  );
}

/** Wizard booking — étape choix des soins (chips + liste cartes). */
export function SkeletonCareSelectionStep({ count = 6 }: { count?: number }) {
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
  return (
    <View style={styles.careSelectionRoot}>
      <View style={styles.careSelectionProgress}>
        <Skeleton height={12} width={100} borderRadius={radius.sm} />
        <Skeleton height={5} borderRadius={radius.full} />
      </View>
      <View style={styles.careSelectionHeader}>
        <View style={styles.careSelectionSegments}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={52} width={128} borderRadius={radius.full} />
          ))}
        </View>
        <View style={styles.careSelectionMeta}>
          <Skeleton height={20} width={160} borderRadius={radius.sm} />
          <Skeleton height={14} width="72%" borderRadius={radius.sm} />
        </View>
      </View>
      <View style={styles.careSelectionList}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} height={88} borderRadius={radius.xl} />
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
  const styles = useThemedStyles(buildStyles, SKELETON_CTX);
  return <View style={[styles.screen, style]}>{children}</View>;
}

function buildStyles(c: AppColors) {
  return {
  screen: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[3],
    backgroundColor: c.background,
  },
  kvRow: {
    gap: spacing[1],
  },
  careBlock: {},
  actionsRow: {
    paddingVertical: spacing[3],
  },
  buttonRow: {
    minWidth: 0,
    flexDirection: 'row' as const,
    gap: spacing[1.5],
  },
  buttonCell: {
    minWidth: 0,
    flex: 1,
  },
  segmentBarHost: {
    width: '100%' as const,
    alignSelf: 'stretch' as const,
  },
  segmentBar: {
    minWidth: 0,
    width: '100%' as const,
    flexDirection: 'row' as const,
    gap: spacing[1],
    padding: spacing[0.5],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceSubtle,
  },
  segmentItem: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  entityRow: {
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2.5],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
  },
  entityDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderLight,
  },
  entityText: {
    minWidth: 0,
    flex: 1,
    gap: spacing[1],
  },
  actionRow: {
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  actionRowDestructive: {
    backgroundColor: c.errorLight,
  },
  actionText: {
    minWidth: 0,
    flex: 1,
    gap: spacing[1],
  },
  listCard: {
    paddingVertical: spacing[1],
  },
  patientList: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  patientRow: {
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: c.surface,
  },
  patientInfo: {
    minWidth: 0,
    flex: 1,
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  patientSub: {
    marginTop: spacing[1.5],
  },
  patientSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
    marginLeft: 68,
  },
  profileHero: {
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
  },
  profileHeroText: {
    minWidth: 0,
    flex: 1,
    gap: spacing[1],
  },
  statsRow: {
    minWidth: 0,
    flexDirection: 'row' as const,
    gap: spacing[2],
  },
  statCell: {
    minWidth: 0,
    flex: 1,
  },
  careSelectionRoot: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.bookingCanvas,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  careSelectionProgress: {
    gap: spacing[2],
  },
  careSelectionHeader: {
    gap: spacing[3],
  },
  careSelectionSegments: {
    minWidth: 0,
    flexDirection: 'row' as const,
    gap: spacing[2],
  },
  careSelectionMeta: {
    gap: spacing[1.5],
  },
  careSelectionList: {
    gap: spacing[2.5],
  },
};
}

