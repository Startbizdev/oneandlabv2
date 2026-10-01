import { View } from 'react-native';
import { AppText, useStyles } from '@/theme';
import { buildBaseStyles } from './tutorial-illustration-base-styles';
import { buildStaffSceneStyles } from './tutorial-illustration-staff-styles';
import { FeatureRow, StatusPill } from './tutorial-illustration-parts';

const QR_FILLED_CELLS = [0, 1, 2, 6, 7, 8, 14, 16, 20, 22, 28, 30, 34, 36, 42, 43, 44, 48];

export function DemandesScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildStaffSceneStyles);
  return (
    <View style={base.gap3}>
      <FeatureRow
        avatar="📍"
        title="Nouvelle demande"
        subtitle="Pansement · 2 km · Aujourd'hui"
        pill={{ label: 'Urgent', tone: 'warning' }}
        accent
      />
      <View style={[base.mutedPanel, styles.demandesPanel]}>
        <View style={styles.demandesHeader}>
          <View style={styles.demandesAvatar} />
          <View style={styles.demandesLine} />
        </View>
        <View style={styles.demandesMap} />
      </View>
      <View style={base.rowGap2_5}>
        <View style={styles.actionPrimary}>
          <AppText style={base.badgeTextXs}>Accepter</AppText>
        </View>
        <View style={styles.actionSecondary}>
          <AppText style={styles.actionSecondaryText}>Refuser</AppText>
        </View>
      </View>
    </View>
  );
}

export function CalendarScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildStaffSceneStyles);
  return (
    <View style={base.gap3}>
      <View style={base.rowBetween}>
        <AppText style={base.titleSm}>Semaine</AppText>
        <AppText style={styles.calendarMonth}>Juin</AppText>
      </View>
      <View style={base.rowGap1_5}>
        {['L', 'M', 'M', 'J', 'V'].map((day, i) => (
          <View key={`${day}-${i}`} style={styles.dayCol}>
            <AppText style={styles.dayLabel}>{day}</AppText>
            <View style={[styles.dayCell, i === 2 ? styles.dayCellActive : styles.dayCellIdle]}>
              <AppText style={[styles.dayNumber, i === 2 && base.textInverse]}>{10 + i}</AppText>
            </View>
          </View>
        ))}
      </View>
      <FeatureRow
        avatar="09"
        title="Soin à domicile"
        subtitle="M. Dupont · 45 min"
        pill={{ label: 'Planifié', tone: 'primary' }}
        accent
      />
    </View>
  );
}

export function PatientsScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildStaffSceneStyles);
  return (
    <View style={base.gap3}>
      <View style={[base.mutedPanel, styles.searchRow]}>
        <AppText style={base.emojiSm}>🔍</AppText>
        <AppText style={styles.searchPlaceholder}>Rechercher un patient…</AppText>
      </View>
      <FeatureRow avatar="JD" title="Jean Dupont" subtitle="Dernière visite · hier" accent />
      <FeatureRow avatar="MC" title="Marie Claire" subtitle="Suivi post-opératoire" />
    </View>
  );
}

export function QrScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildStaffSceneStyles);
  return (
    <View style={base.centerGap4}>
      <View style={base.relative}>
        <View style={[styles.qrCorner, styles.qrCornerTopLeft]} />
        <View style={[styles.qrCorner, styles.qrCornerTopRight]} />
        <View style={[styles.qrCorner, styles.qrCornerBottomLeft]} />
        <View style={[styles.qrCorner, styles.qrCornerBottomRight]} />
        <View style={styles.qrFrame}>
          <View style={styles.qrGrid}>
            {Array.from({ length: 49 }).map((_, i) => (
              <View
                key={i}
                style={[styles.qrCell, QR_FILLED_CELLS.includes(i) && styles.qrCellFilled]}
              />
            ))}
          </View>
        </View>
      </View>
      <View style={base.centerGap1}>
        <AppText style={base.titleSm}>Scanner le patient</AppText>
        <AppText style={base.subtitleXs}>Identification rapide sur place</AppText>
      </View>
    </View>
  );
}

export function PrescriptionsScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildStaffSceneStyles);
  return (
    <View style={base.gap3}>
      <View style={[base.mutedPanel, styles.prescriptionPanel]}>
        <View style={[base.rowBetween, styles.prescriptionHeader]}>
          <AppText style={styles.prescriptionTitle}>Ordonnance</AppText>
          <StatusPill label="Validée" tone="success" />
        </View>
        <View style={base.gap2}>
          <View style={[styles.textLine, styles.textLineAccent]} />
          <View style={[styles.textLine, styles.textLine90]} />
          <View style={[styles.textLine, styles.textLine75]} />
          <View style={styles.signature} />
        </View>
      </View>
      <View style={styles.sentRow}>
        <View style={styles.checkBadge}>
          <AppText style={base.badgeTextXs}>✓</AppText>
        </View>
        <AppText style={styles.sentText}>Envoyée au patient</AppText>
      </View>
    </View>
  );
}

export function TourneeScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildStaffSceneStyles);
  return (
    <View style={base.gap3}>
      <View style={styles.mapCard}>
        <View style={styles.mapArea}>
          <View style={styles.mapPinStart} />
          <View style={styles.mapRoute} />
          <View style={styles.mapPinEnd} />
          <View style={styles.mapTrack} />
        </View>
      </View>
      <FeatureRow
        avatar="→"
        title="Prochain passage"
        subtitle="10h30 · M. Martin · 1,2 km"
        pill={{ label: 'Dans 25 min', tone: 'primary' }}
        accent
      />
      <View style={base.rowGap2}>
        {['Carte', 'Itinéraire', 'Appeler'].map((action, i) => (
          <View
            key={action}
            style={[styles.tourAction, i === 1 ? styles.tourActionActive : styles.tourActionIdle]}
          >
            <AppText style={[styles.tourActionText, i === 1 && base.textInverse]}>{action}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
