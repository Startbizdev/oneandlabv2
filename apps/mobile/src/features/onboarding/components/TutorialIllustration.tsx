import type { ReactNode } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { TutorialIllustrationKey } from '@oneandlab/onboarding';
import { AppText, font, hexToRgba, palette, radius, spacing, useStyles, type Theme } from '@/theme';

type Props = {
  illustration: TutorialIllustrationKey;
};

type PillTone = 'primary' | 'success' | 'warning';

const WELCOME_GRADIENT = [palette.cyan[400], palette.brand[500], palette.cyan[600]] as const;

const QR_FILLED_CELLS = [0, 1, 2, 6, 7, 8, 14, 16, 20, 22, 28, 30, 34, 36, 42, 43, 44, 48];

function IllustrationCanvas({ children }: { children: ReactNode }) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.canvas}>
      <View style={styles.canvasHaloWrap}>
        <View style={styles.canvasHalo} />
      </View>
      <View style={styles.canvasOrbLeft} />
      <View style={styles.canvasOrbRight} />
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function StatusPill({ label, tone = 'primary' }: { label: string; tone?: PillTone }) {
  const styles = useStyles(buildStyles);
  const containerStyle =
    tone === 'success' ? styles.pillSuccess : tone === 'warning' ? styles.pillWarning : styles.pillPrimary;
  const textStyle =
    tone === 'success'
      ? styles.pillTextSuccess
      : tone === 'warning'
        ? styles.pillTextWarning
        : styles.pillTextPrimary;

  return (
    <View style={[styles.pill, containerStyle]}>
      <AppText style={[styles.pillText, textStyle]}>{label}</AppText>
    </View>
  );
}

function Avatar({ label, accent }: { label: string; accent?: boolean }) {
  const styles = useStyles(buildStyles);
  return (
    <View style={[styles.avatar, accent && styles.avatarAccent]}>
      <AppText style={[styles.avatarText, accent && styles.textInverse]}>{label}</AppText>
    </View>
  );
}

function FeatureRow({
  avatar,
  title,
  subtitle,
  pill,
  accent,
}: {
  avatar: string;
  title: string;
  subtitle: string;
  pill?: { label: string; tone?: PillTone };
  accent?: boolean;
}) {
  const styles = useStyles(buildStyles);
  return (
    <View style={[styles.featureRow, accent && styles.featureRowAccent]}>
      <Avatar label={avatar} accent={accent} />
      <View style={styles.featureRowBody}>
        <AppText style={styles.titleSm} numberOfLines={1}>
          {title}
        </AppText>
        <AppText style={styles.subtitleXs} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {pill ? <StatusPill label={pill.label} tone={pill.tone} /> : null}
    </View>
  );
}

function ChatBubble({
  text,
  side,
  ai,
}: {
  text: string;
  side: 'left' | 'right';
  ai?: boolean;
}) {
  const styles = useStyles(buildStyles);
  const isRight = side === 'right';
  return (
    <View style={[styles.bubbleWrap, isRight ? styles.alignEnd : styles.alignStart]}>
      {ai ? (
        <View style={styles.bubbleAiHeader}>
          <View style={styles.bubbleAiBadge}>
            <AppText style={styles.bubbleAiBadgeText}>C</AppText>
          </View>
          <AppText style={styles.captionPrimary}>Cary</AppText>
        </View>
      ) : null}
      <View style={[styles.bubble, isRight ? styles.bubbleRight : styles.bubbleLeft]}>
        <AppText style={[styles.bubbleText, isRight && styles.textInverse]}>{text}</AppText>
      </View>
    </View>
  );
}

function IllustrationBody({ illustration }: Props) {
  const styles = useStyles(buildStyles);
  switch (illustration) {
    case 'welcome':
      return (
        <View style={styles.centerGap5}>
          <View style={styles.relative}>
            <View style={styles.welcomeHalo} />
            <LinearGradient
              colors={WELCOME_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeLogo}
            >
              <AppText style={styles.welcomeLogoText}>C</AppText>
            </LinearGradient>
            <View style={styles.welcomeDot} />
          </View>
          <View style={styles.centerGap2}>
            <View style={styles.welcomeLinePrimary} />
            <View style={styles.welcomeLineMuted} />
          </View>
          <View style={styles.rowGap2}>
            {['Soins', 'RDV', 'Proches'].map((tag) => (
              <View key={tag} style={styles.welcomeTag}>
                <AppText style={[styles.pillText, styles.pillTextPrimary]}>{tag}</AppText>
              </View>
            ))}
          </View>
        </View>
      );

    case 'appointments':
      return (
        <View style={styles.gap3}>
          <View style={styles.rowBetween}>
            <AppText style={styles.titleSm}>Mes rendez-vous</AppText>
            <StatusPill label="2 à venir" tone="primary" />
          </View>
          <FeatureRow
            avatar="🩹"
            title="Pansement"
            subtitle="Demain · 14h30 · Domicile"
            pill={{ label: 'Confirmé', tone: 'success' }}
            accent
          />
          <FeatureRow
            avatar="🧪"
            title="Prélèvement"
            subtitle="Vendredi · 09h00"
            pill={{ label: 'En attente', tone: 'warning' }}
          />
        </View>
      );

    case 'book':
      return (
        <View style={styles.gap4}>
          <AppText style={styles.titleSm}>Choisir un soin</AppText>
          <View style={styles.rowWrapGap2}>
            {[
              { emoji: '🩹', label: 'Pansement', active: true },
              { emoji: '🧪', label: 'Prélèvement', active: false },
              { emoji: '💗', label: 'Suivi', active: false },
            ].map((item) => (
              <View key={item.label} style={[styles.careChip, item.active && styles.careChipActive]}>
                <AppText style={styles.emojiXl}>{item.emoji}</AppText>
                <AppText style={[styles.careChipLabel, item.active && styles.pillTextPrimary]}>
                  {item.label}
                </AppText>
              </View>
            ))}
          </View>
          <View style={styles.rowCenterGap2}>
            {[1, 2, 3].map((step) => (
              <View key={step} style={[styles.progressStep, step <= 2 && styles.progressStepDone]} />
            ))}
          </View>
          <View style={styles.primaryCta}>
            <AppText style={styles.primaryCtaText}>Continuer la réservation</AppText>
          </View>
        </View>
      );

    case 'relatives':
      return (
        <View style={styles.gap3}>
          <AppText style={styles.titleSm}>Mes proches</AppText>
          <FeatureRow
            avatar="M"
            title="Marie Dupont"
            subtitle="Enfant · Carte Vitale à jour"
            pill={{ label: 'Actif', tone: 'success' }}
            accent
          />
          <View style={styles.addRow}>
            <View style={styles.docIcon}>
              <AppText style={styles.emojiLg}>📄</AppText>
            </View>
            <View style={styles.flexGap1}>
              <AppText style={styles.titleSm}>Documents</AppText>
              <AppText style={styles.subtitleXs}>Ordonnance · Mutuelle</AppText>
            </View>
            <View style={styles.plusBadge}>
              <AppText style={styles.badgeTextXs}>+</AppText>
            </View>
          </View>
        </View>
      );

    case 'ai':
      return (
        <View style={styles.gap3}>
          <ChatBubble text="Bonjour ! Comment puis-je vous aider pour votre prochain soin ?" side="left" ai />
          <ChatBubble text="Je voudrais prendre un RDV pour ma mère" side="right" />
          <View style={styles.suggestion}>
            <View style={styles.suggestionHeader}>
              <AppText style={styles.emojiXs}>✨</AppText>
              <AppText style={styles.captionPrimary}>Suggestion Cary</AppText>
            </View>
            <AppText style={styles.bubbleText}>
              Pansement à domicile demain 14h — voulez-vous confirmer ?
            </AppText>
          </View>
        </View>
      );

    case 'notifications':
      return (
        <View style={styles.gap4}>
          <View style={styles.rowCenterGap3}>
            <View style={styles.bellBox}>
              <AppText style={styles.emojiXl}>🔔</AppText>
              <View style={styles.bellDot} />
            </View>
            <View style={styles.flexGap1}>
              <AppText style={styles.titleSm}>Notifications</AppText>
              <AppText style={styles.subtitleXs}>Restez informé en temps réel</AppText>
            </View>
          </View>
          <View style={[styles.mutedPanel, styles.notifPanel]}>
            <View style={styles.notifItem}>
              <View style={styles.notifDot} />
              <View style={styles.flexGap1}>
                <AppText style={styles.notifTitle}>RDV confirmé</AppText>
                <AppText style={styles.notifBody}>Votre pansement est prévu demain à 14h30</AppText>
              </View>
            </View>
            <View style={styles.hairline} />
            <View style={[styles.notifItem, styles.notifItemMuted]}>
              <View style={[styles.notifDot, styles.notifDotMuted]} />
              <View style={styles.flexGap1}>
                <AppText style={styles.notifTitleMuted}>Rappel J-1</AppText>
                <AppText style={styles.notifBodyMuted}>Envoyé la veille du soin</AppText>
              </View>
            </View>
          </View>
        </View>
      );

    case 'demandes':
      return (
        <View style={styles.gap3}>
          <FeatureRow
            avatar="📍"
            title="Nouvelle demande"
            subtitle="Pansement · 2 km · Aujourd'hui"
            pill={{ label: 'Urgent', tone: 'warning' }}
            accent
          />
          <View style={[styles.mutedPanel, styles.demandesPanel]}>
            <View style={styles.demandesHeader}>
              <View style={styles.demandesAvatar} />
              <View style={styles.demandesLine} />
            </View>
            <View style={styles.demandesMap} />
          </View>
          <View style={styles.rowGap2_5}>
            <View style={styles.actionPrimary}>
              <AppText style={styles.badgeTextXs}>Accepter</AppText>
            </View>
            <View style={styles.actionSecondary}>
              <AppText style={styles.actionSecondaryText}>Refuser</AppText>
            </View>
          </View>
        </View>
      );

    case 'calendar':
      return (
        <View style={styles.gap3}>
          <View style={styles.rowBetween}>
            <AppText style={styles.titleSm}>Semaine</AppText>
            <AppText style={styles.calendarMonth}>Juin</AppText>
          </View>
          <View style={styles.rowGap1_5}>
            {['L', 'M', 'M', 'J', 'V'].map((day, i) => (
              <View key={`${day}-${i}`} style={styles.dayCol}>
                <AppText style={styles.dayLabel}>{day}</AppText>
                <View style={[styles.dayCell, i === 2 ? styles.dayCellActive : styles.dayCellIdle]}>
                  <AppText style={[styles.dayNumber, i === 2 && styles.textInverse]}>{10 + i}</AppText>
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

    case 'patients':
      return (
        <View style={styles.gap3}>
          <View style={[styles.mutedPanel, styles.searchRow]}>
            <AppText style={styles.emojiSm}>🔍</AppText>
            <AppText style={styles.searchPlaceholder}>Rechercher un patient…</AppText>
          </View>
          <FeatureRow avatar="JD" title="Jean Dupont" subtitle="Dernière visite · hier" accent />
          <FeatureRow avatar="MC" title="Marie Claire" subtitle="Suivi post-opératoire" />
        </View>
      );

    case 'qr':
      return (
        <View style={styles.centerGap4}>
          <View style={styles.relative}>
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
          <View style={styles.centerGap1}>
            <AppText style={styles.titleSm}>Scanner le patient</AppText>
            <AppText style={styles.subtitleXs}>Identification rapide sur place</AppText>
          </View>
        </View>
      );

    case 'prescriptions':
      return (
        <View style={styles.gap3}>
          <View style={[styles.mutedPanel, styles.prescriptionPanel]}>
            <View style={[styles.rowBetween, styles.prescriptionHeader]}>
              <AppText style={styles.prescriptionTitle}>Ordonnance</AppText>
              <StatusPill label="Validée" tone="success" />
            </View>
            <View style={styles.gap2}>
              <View style={[styles.textLine, styles.textLineAccent]} />
              <View style={[styles.textLine, styles.textLine90]} />
              <View style={[styles.textLine, styles.textLine75]} />
              <View style={styles.signature} />
            </View>
          </View>
          <View style={styles.sentRow}>
            <View style={styles.checkBadge}>
              <AppText style={styles.badgeTextXs}>✓</AppText>
            </View>
            <AppText style={styles.sentText}>Envoyée au patient</AppText>
          </View>
        </View>
      );

    case 'tournee':
      return (
        <View style={styles.gap3}>
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
          <View style={styles.rowGap2}>
            {['Carte', 'Itinéraire', 'Appeler'].map((action, i) => (
              <View
                key={action}
                style={[styles.tourAction, i === 1 ? styles.tourActionActive : styles.tourActionIdle]}
              >
                <AppText style={[styles.tourActionText, i === 1 && styles.textInverse]}>{action}</AppText>
              </View>
            ))}
          </View>
        </View>
      );

    default:
      return null;
  }
}

export function TutorialIllustration({ illustration }: Props) {
  return (
    <IllustrationCanvas>
      <IllustrationBody illustration={illustration} />
    </IllustrationCanvas>
  );
}

function buildStyles({ colors: c, fontSize, scale, shadow }: Theme) {
  const row = { flexDirection: 'row' as const };
  const absolute = { position: 'absolute' as const };
  const centered = { alignItems: 'center' as const, justifyContent: 'center' as const };

  const text2xs = { fontSize: fontSize['2xs'], lineHeight: scale(16) };
  const textXs = { fontSize: fontSize.xs, lineHeight: scale(20) };
  const textSm = { fontSize: fontSize.sm, lineHeight: scale(22) };
  const textLg = { fontSize: fontSize.lg, lineHeight: scale(28) };
  const textXl = { fontSize: fontSize.xl, lineHeight: scale(30) };
  const text4xl = { fontSize: fontSize['4xl'], lineHeight: scale(42) };

  const mutedSurface = palette.slate[50];
  const fullWidth = '100%' as const;

  return {
    canvas: {
      position: 'relative' as const,
      width: fullWidth,
      maxWidth: 300,
      alignSelf: 'center' as const,
    },
    canvasHaloWrap: {
      ...absolute,
      left: 0,
      right: 0,
      top: 0,
      alignItems: 'center' as const,
    },
    canvasHalo: {
      width: 120,
      height: 120,
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
      opacity: 0.9,
    },
    canvasOrbLeft: {
      ...absolute,
      left: -8,
      top: 24,
      width: 88,
      height: 88,
      borderRadius: radius.full,
      backgroundColor: c.primaryMid,
      opacity: 0.7,
    },
    canvasOrbRight: {
      ...absolute,
      right: -4,
      bottom: 16,
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: palette.brand[200],
      opacity: 0.45,
    },
    card: {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      borderRadius: radius['3xl'],
      borderWidth: 1,
      borderColor: hexToRgba(palette.brand[100], 0.8),
      backgroundColor: c.surface,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[6],
      ...shadow.md,
    },

    textInverse: { color: c.textInverse },
    titleSm: { ...font.bold, ...textSm, color: c.textPrimary },
    subtitleXs: { ...font.regular, ...textXs, color: c.textTertiary },
    captionPrimary: { ...font.semiBold, ...text2xs, color: c.primaryDark },
    badgeTextXs: { ...font.bold, ...textXs, color: c.textInverse },
    emojiXs: textXs,
    emojiSm: textSm,
    emojiLg: textLg,
    emojiXl: textXl,

    relative: { position: 'relative' as const },
    gap2: { gap: spacing[2] },
    gap3: { gap: spacing[3] },
    gap4: { gap: spacing[4] },
    flexGap1: { flex: 1, gap: spacing[1] },
    centerGap1: { alignItems: 'center' as const, gap: spacing[1] },
    centerGap2: { alignItems: 'center' as const, gap: spacing[2] },
    centerGap4: { alignItems: 'center' as const, gap: spacing[4] },
    centerGap5: { alignItems: 'center' as const, gap: spacing[5] },
    rowGap2: { ...row, gap: spacing[2] },
    rowGap1_5: { ...row, gap: spacing[1.5] },
    rowGap2_5: { ...row, gap: spacing[2.5] },
    rowWrapGap2: { ...row, flexWrap: 'wrap' as const, gap: spacing[2] },
    rowCenterGap2: { ...row, alignItems: 'center' as const, gap: spacing[2] },
    rowCenterGap3: { ...row, alignItems: 'center' as const, gap: spacing[3] },
    rowBetween: { ...row, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    alignStart: { alignSelf: 'flex-start' as const },
    alignEnd: { alignSelf: 'flex-end' as const },
    mutedPanel: {
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: mutedSurface,
    },

    pill: {
      borderRadius: radius.full,
      borderWidth: 1,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[0.5],
    },
    pillPrimary: { borderColor: palette.brand[200], backgroundColor: c.primaryLight },
    pillSuccess: { borderColor: c.successMid, backgroundColor: c.successLight },
    pillWarning: { borderColor: c.warningMid, backgroundColor: c.warningLight },
    pillText: { ...font.semiBold, ...text2xs },
    pillTextPrimary: { color: palette.brand[800] },
    pillTextSuccess: { color: palette.green[700] },
    pillTextWarning: { color: palette.amber[700] },

    avatar: {
      ...centered,
      width: 44,
      height: 44,
      borderRadius: radius['2xl'],
      backgroundColor: palette.slate[100],
    },
    avatarAccent: { backgroundColor: c.primary },
    avatarText: { ...font.bold, ...textSm, color: c.textSecondary },

    featureRow: {
      ...row,
      alignItems: 'center' as const,
      gap: spacing[3],
      borderRadius: radius['2xl'],
      borderWidth: 1,
      padding: spacing[3.5],
      borderColor: c.borderLight,
      backgroundColor: hexToRgba(mutedSurface, 0.8),
    },
    featureRowAccent: {
      borderColor: palette.brand[200],
      backgroundColor: hexToRgba(palette.brand[50], 0.8),
    },
    featureRowBody: { minWidth: 0, flex: 1, gap: spacing[1] },

    bubbleWrap: { maxWidth: '88%' as const },
    bubbleAiHeader: {
      ...row,
      alignItems: 'center' as const,
      gap: spacing[1.5],
      marginBottom: spacing[1],
    },
    bubbleAiBadge: {
      ...centered,
      width: 20,
      height: 20,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
    bubbleAiBadgeText: { ...font.black, ...text2xs, color: c.textInverse },
    bubble: {
      borderRadius: radius['2xl'],
      paddingHorizontal: spacing[3.5],
      paddingVertical: spacing[2.5],
    },
    bubbleRight: { borderTopRightRadius: radius.sm, backgroundColor: c.primary },
    bubbleLeft: {
      borderTopLeftRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: mutedSurface,
    },
    bubbleText: {
      ...font.regular,
      fontSize: fontSize.xs,
      lineHeight: scale(18),
      color: palette.slate[700],
    },

    welcomeHalo: {
      ...absolute,
      top: -8,
      right: -8,
      bottom: -8,
      left: -8,
      borderRadius: radius.full,
      backgroundColor: c.primaryMid,
      opacity: 0.6,
    },
    welcomeLogo: { ...centered, width: 88, height: 88, borderRadius: 44 },
    welcomeLogoText: { ...font.black, ...text4xl, color: c.textInverse },
    welcomeDot: {
      ...absolute,
      right: -4,
      top: -4,
      width: 20,
      height: 20,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.surface,
      backgroundColor: c.warning,
    },
    welcomeLinePrimary: {
      width: 140,
      height: 12,
      borderRadius: radius.full,
      backgroundColor: c.primaryMid,
    },
    welcomeLineMuted: {
      width: 100,
      height: 10,
      borderRadius: radius.full,
      backgroundColor: palette.slate[200],
    },
    welcomeTag: {
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: palette.brand[200],
      backgroundColor: c.primaryLight,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
    },

    careChip: {
      alignItems: 'center' as const,
      borderRadius: radius['2xl'],
      borderWidth: 1,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
      borderColor: c.borderLight,
      backgroundColor: mutedSurface,
    },
    careChipActive: { borderColor: c.primary, backgroundColor: c.primaryLight },
    careChipLabel: {
      marginTop: spacing[1],
      ...font.semiBold,
      ...text2xs,
      color: c.textTertiary,
    },
    progressStep: {
      flex: 1,
      height: 6,
      borderRadius: radius.full,
      backgroundColor: palette.slate[200],
    },
    progressStepDone: { backgroundColor: c.primary },
    primaryCta: {
      alignItems: 'center' as const,
      borderRadius: radius.xl,
      backgroundColor: c.primary,
      paddingVertical: spacing[3],
    },
    primaryCtaText: { ...font.bold, ...textSm, color: c.textInverse },

    addRow: {
      ...row,
      alignItems: 'center' as const,
      gap: spacing[3],
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      borderColor: palette.brand[200],
      backgroundColor: hexToRgba(palette.brand[50], 0.5),
      padding: spacing[3.5],
    },
    docIcon: {
      ...centered,
      width: 44,
      height: 44,
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderColor: palette.brand[200],
      backgroundColor: c.surface,
    },
    plusBadge: {
      ...centered,
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },

    suggestion: {
      alignSelf: 'flex-start' as const,
      borderRadius: radius['2xl'],
      borderTopLeftRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.primaryMid,
      backgroundColor: c.primaryLight,
      paddingHorizontal: spacing[3.5],
      paddingVertical: spacing[2.5],
    },
    suggestionHeader: {
      ...row,
      alignItems: 'center' as const,
      gap: spacing[1],
      marginBottom: spacing[1],
    },

    bellBox: {
      ...centered,
      position: 'relative' as const,
      width: 48,
      height: 48,
      borderRadius: radius['2xl'],
      backgroundColor: c.primaryLight,
    },
    bellDot: {
      ...absolute,
      right: 4,
      top: 4,
      width: 10,
      height: 10,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.surface,
      backgroundColor: c.error,
    },
    notifPanel: { gap: spacing[2], padding: spacing[3.5] },
    notifItem: { ...row, alignItems: 'flex-start' as const, gap: spacing[2.5] },
    notifItemMuted: { opacity: 0.7 },
    notifDot: {
      marginTop: spacing[0.5],
      width: 8,
      height: 8,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
    notifDotMuted: { backgroundColor: palette.slate[300] },
    notifTitle: { ...font.bold, ...textXs, color: c.textPrimary },
    notifBody: { ...font.regular, ...text2xs, color: c.textTertiary },
    notifTitleMuted: { ...font.semiBold, ...textXs, color: palette.slate[700] },
    notifBodyMuted: { ...font.regular, ...text2xs, color: palette.slate[400] },
    hairline: { height: 1, backgroundColor: palette.slate[200] },

    demandesPanel: { padding: spacing[3] },
    demandesHeader: {
      ...row,
      alignItems: 'center' as const,
      gap: spacing[2],
      marginBottom: spacing[2],
    },
    demandesAvatar: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: c.primaryMid,
    },
    demandesLine: {
      flex: 1,
      height: 8,
      borderRadius: radius.full,
      backgroundColor: palette.slate[200],
    },
    demandesMap: {
      height: 64,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.primaryMid,
      backgroundColor: hexToRgba(palette.brand[50], 0.6),
    },
    actionPrimary: {
      flex: 1,
      alignItems: 'center' as const,
      borderRadius: radius.xl,
      backgroundColor: c.primary,
      paddingVertical: spacing[2.5],
    },
    actionSecondary: {
      flex: 1,
      alignItems: 'center' as const,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingVertical: spacing[2.5],
    },
    actionSecondaryText: { ...font.semiBold, ...textXs, color: c.textSecondary },

    calendarMonth: { ...font.semiBold, ...textXs, color: c.primaryDark },
    dayCol: { flex: 1, alignItems: 'center' as const, gap: spacing[1] },
    dayLabel: { ...font.regular, ...text2xs, color: palette.slate[400] },
    dayCell: { ...centered, width: fullWidth, height: 36, borderRadius: radius.xl },
    dayCellIdle: { borderWidth: 1, borderColor: c.borderLight, backgroundColor: mutedSurface },
    dayCellActive: { backgroundColor: c.primary },
    dayNumber: { ...font.bold, ...textXs, color: c.textSecondary },

    searchRow: {
      ...row,
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
    },
    searchPlaceholder: { ...font.regular, ...textXs, color: palette.slate[400] },

    qrCorner: { ...absolute, width: 24, height: 24, borderColor: c.primary },
    qrCornerTopLeft: {
      left: -8,
      top: -8,
      borderTopLeftRadius: radius.lg,
      borderLeftWidth: 3,
      borderTopWidth: 3,
    },
    qrCornerTopRight: {
      right: -8,
      top: -8,
      borderTopRightRadius: radius.lg,
      borderRightWidth: 3,
      borderTopWidth: 3,
    },
    qrCornerBottomLeft: {
      left: -8,
      bottom: -8,
      borderBottomLeftRadius: radius.lg,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
    },
    qrCornerBottomRight: {
      right: -8,
      bottom: -8,
      borderBottomRightRadius: radius.lg,
      borderBottomWidth: 3,
      borderRightWidth: 3,
    },
    qrFrame: {
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
      padding: spacing[4],
    },
    qrGrid: { ...row, flexWrap: 'wrap' as const, gap: spacing[1], width: 104 },
    qrCell: { width: 12, height: 12, borderRadius: 2, backgroundColor: palette.slate[100] },
    qrCellFilled: { backgroundColor: palette.slate[900] },

    prescriptionPanel: { padding: spacing[4] },
    prescriptionHeader: { marginBottom: spacing[3] },
    prescriptionTitle: { ...font.bold, ...textXs, color: palette.slate[700] },
    textLine: { height: 8, borderRadius: radius.full, backgroundColor: palette.slate[200] },
    textLineAccent: { width: fullWidth, backgroundColor: c.primaryMid },
    textLine90: { width: '90%' as const },
    textLine75: { width: '75%' as const },
    signature: {
      marginTop: spacing[1],
      width: '45%' as const,
      height: 32,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      borderColor: palette.slate[300],
    },
    sentRow: {
      ...row,
      alignItems: 'center' as const,
      gap: spacing[2.5],
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderColor: palette.brand[200],
      backgroundColor: c.primaryLight,
      padding: spacing[3],
    },
    checkBadge: {
      ...centered,
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
    sentText: { ...font.semiBold, ...textXs, color: palette.brand[800] },

    mapCard: {
      overflow: 'hidden' as const,
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderColor: c.primaryMid,
      backgroundColor: c.primaryLight,
    },
    mapArea: { height: 72, justifyContent: 'flex-end' as const, padding: spacing[3] },
    mapPinStart: {
      ...absolute,
      left: 32,
      top: 20,
      width: 12,
      height: 12,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.surface,
      backgroundColor: c.primary,
    },
    mapRoute: {
      ...absolute,
      left: 52,
      top: 32,
      width: 64,
      height: 2,
      transform: [{ rotate: '25deg' }],
      backgroundColor: palette.brand[300],
    },
    mapPinEnd: {
      ...absolute,
      right: 40,
      top: 16,
      width: 12,
      height: 12,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.surface,
      backgroundColor: palette.brand[400],
    },
    mapTrack: {
      width: fullWidth,
      height: 6,
      borderRadius: radius.full,
      backgroundColor: palette.brand[200],
    },

    tourAction: {
      flex: 1,
      alignItems: 'center' as const,
      borderRadius: radius.xl,
      paddingVertical: spacing[2],
    },
    tourActionIdle: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    tourActionActive: { backgroundColor: c.primary },
    tourActionText: { ...font.semiBold, ...text2xs, color: c.textSecondary },
  };
}
