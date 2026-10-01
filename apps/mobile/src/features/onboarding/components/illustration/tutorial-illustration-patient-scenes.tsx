import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, palette, useStyles } from '@/theme';
import { buildBaseStyles } from './tutorial-illustration-base-styles';
import { buildPatientSceneStyles } from './tutorial-illustration-patient-styles';
import { ChatBubble, FeatureRow, StatusPill } from './tutorial-illustration-parts';

const WELCOME_GRADIENT = [palette.cyan[400], palette.brand[500], palette.cyan[600]] as const;

export function WelcomeScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildPatientSceneStyles);
  return (
    <View style={base.centerGap5}>
      <View style={base.relative}>
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
      <View style={base.centerGap2}>
        <View style={styles.welcomeLinePrimary} />
        <View style={styles.welcomeLineMuted} />
      </View>
      <View style={base.rowGap2}>
        {['Soins', 'RDV', 'Proches'].map((tag) => (
          <View key={tag} style={styles.welcomeTag}>
            <AppText style={[base.pillText, base.pillTextPrimary]}>{tag}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

export function AppointmentsScene() {
  const base = useStyles(buildBaseStyles);
  return (
    <View style={base.gap3}>
      <View style={base.rowBetween}>
        <AppText style={base.titleSm}>Mes rendez-vous</AppText>
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
}

export function BookScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildPatientSceneStyles);
  return (
    <View style={base.gap4}>
      <AppText style={base.titleSm}>Choisir un soin</AppText>
      <View style={base.rowWrapGap2}>
        {[
          { emoji: '🩹', label: 'Pansement', active: true },
          { emoji: '🧪', label: 'Prélèvement', active: false },
          { emoji: '💗', label: 'Suivi', active: false },
        ].map((item) => (
          <View key={item.label} style={[styles.careChip, item.active && styles.careChipActive]}>
            <AppText style={base.emojiXl}>{item.emoji}</AppText>
            <AppText style={[styles.careChipLabel, item.active && base.pillTextPrimary]}>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
      <View style={base.rowCenterGap2}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={[styles.progressStep, step <= 2 && styles.progressStepDone]} />
        ))}
      </View>
      <View style={styles.primaryCta}>
        <AppText style={styles.primaryCtaText}>Continuer la réservation</AppText>
      </View>
    </View>
  );
}

export function RelativesScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildPatientSceneStyles);
  return (
    <View style={base.gap3}>
      <AppText style={base.titleSm}>Mes proches</AppText>
      <FeatureRow
        avatar="M"
        title="Marie Dupont"
        subtitle="Enfant · Carte Vitale à jour"
        pill={{ label: 'Actif', tone: 'success' }}
        accent
      />
      <View style={styles.addRow}>
        <View style={styles.docIcon}>
          <AppText style={base.emojiLg}>📄</AppText>
        </View>
        <View style={base.flexGap1}>
          <AppText style={base.titleSm}>Documents</AppText>
          <AppText style={base.subtitleXs}>Ordonnance · Mutuelle</AppText>
        </View>
        <View style={styles.plusBadge}>
          <AppText style={base.badgeTextXs}>+</AppText>
        </View>
      </View>
    </View>
  );
}

export function AiScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildPatientSceneStyles);
  return (
    <View style={base.gap3}>
      <ChatBubble text="Bonjour ! Comment puis-je vous aider pour votre prochain soin ?" side="left" ai />
      <ChatBubble text="Je voudrais prendre un RDV pour ma mère" side="right" />
      <View style={styles.suggestion}>
        <View style={styles.suggestionHeader}>
          <AppText style={base.emojiXs}>✨</AppText>
          <AppText style={base.captionPrimary}>Suggestion Cary</AppText>
        </View>
        <AppText style={base.bubbleText}>
          Pansement à domicile demain 14h — voulez-vous confirmer ?
        </AppText>
      </View>
    </View>
  );
}

export function NotificationsScene() {
  const base = useStyles(buildBaseStyles);
  const styles = useStyles(buildPatientSceneStyles);
  return (
    <View style={base.gap4}>
      <View style={base.rowCenterGap3}>
        <View style={styles.bellBox}>
          <AppText style={base.emojiXl}>🔔</AppText>
          <View style={styles.bellDot} />
        </View>
        <View style={base.flexGap1}>
          <AppText style={base.titleSm}>Notifications</AppText>
          <AppText style={base.subtitleXs}>Restez informé en temps réel</AppText>
        </View>
      </View>
      <View style={[base.mutedPanel, styles.notifPanel]}>
        <View style={styles.notifItem}>
          <View style={styles.notifDot} />
          <View style={base.flexGap1}>
            <AppText style={styles.notifTitle}>RDV confirmé</AppText>
            <AppText style={styles.notifBody}>Votre pansement est prévu demain à 14h30</AppText>
          </View>
        </View>
        <View style={styles.hairline} />
        <View style={[styles.notifItem, styles.notifItemMuted]}>
          <View style={[styles.notifDot, styles.notifDotMuted]} />
          <View style={base.flexGap1}>
            <AppText style={styles.notifTitleMuted}>Rappel J-1</AppText>
            <AppText style={styles.notifBodyMuted}>Envoyé la veille du soin</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}
