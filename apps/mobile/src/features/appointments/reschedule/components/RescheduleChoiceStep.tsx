import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Cluster, Row } from '@/components/layout/primitives';
import {
  ArrowRight,
  CalendarPlus,
  Check,
  RefreshCcw,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import type { RescheduleChoiceMode } from '../utils/build-reschedule-payload';
import { elevation, palette, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type FlowChip = {
  label: string;
  tone: 'neutral' | 'accent' | 'success' | 'muted';
};

type ChoiceConfig = {
  mode: RescheduleChoiceMode;
  title: string;
  badge?: string;
  description: string;
  icon: LucideIcon;
  gradient: [string, string];
  orbBg: string;
  flow: FlowChip[];
};

const CHOICES: ChoiceConfig[] = [
  {
    mode: 'cancel_and_new',
    title: 'Remplacer le RDV',
    badge: 'Le plus courant',
    description: 'L’ancien rendez-vous est annulé et remplacé par le nouveau.',
    icon: RefreshCcw,
    gradient: [palette.brand[400], palette.cyan[600]],
    orbBg: palette.brand[100],
    flow: [
      { label: 'Ancien RDV', tone: 'muted' },
      { label: 'Nouveau RDV', tone: 'accent' },
    ],
  },
  {
    mode: 'create_only',
    title: 'Créer un nouveau RDV',
    description: 'Le nouveau s’ajoute sans toucher à l’ancien rendez-vous.',
    icon: CalendarPlus,
    gradient: [palette.cyan[500], palette.brand[700]],
    orbBg: palette.brand[50],
    flow: [
      { label: 'Ancien conservé', tone: 'success' },
      { label: 'Nouveau ajouté', tone: 'accent' },
    ],
  },
];

interface Props {
  patientName: string;
  choiceMode: RescheduleChoiceMode | null;
  onSelect: (mode: RescheduleChoiceMode) => void;
}

function FlowChipView({ chip }: { chip: FlowChip }) {
  const styles = useThemedStyles(buildStyles, 'RescheduleChoiceStep.FlowChipView');
  const chipStyle =
    chip.tone === 'accent'
      ? styles.flowChipAccent
      : chip.tone === 'success'
        ? styles.flowChipSuccess
        : chip.tone === 'muted'
          ? styles.flowChipMuted
          : styles.flowChipNeutral;

  const textStyle =
    chip.tone === 'accent'
      ? styles.flowChipTextAccent
      : chip.tone === 'success'
        ? styles.flowChipTextSuccess
        : chip.tone === 'muted'
          ? styles.flowChipTextMuted
          : styles.flowChipTextNeutral;

  return (
    <View style={[styles.flowChip, chipStyle]}>
      <AppText style={[styles.flowChipText, textStyle]} numberOfLines={1}>
        {chip.label}
      </AppText>
    </View>
  );
}

function RescheduleChoiceCard({
  choice,
  selected,
  index,
  onPress,
}: {
  choice: ChoiceConfig;
  selected: boolean;
  index: number;
  onPress: () => void;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'RescheduleChoiceStep.RescheduleChoiceCard');
  const Icon = choice.icon;

  return (
    <Animated.View entering={FadeInUp.delay(index * 80).duration(380).springify()}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={choice.title}
        style={({ pressed }) => [styles.cardHit, pressed && styles.cardPressed]}
      >
        <View style={[styles.card, selected && styles.cardSelected]}>
          {selected ? (
            <LinearGradient
              colors={[`${choice.gradient[0]}18`, `${choice.gradient[1]}06`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}

          <LinearGradient
            colors={choice.gradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardAccentBar}
          />

          <View style={styles.cardBody}>
            <Cluster
              gap={spacing[2]}
              align="center"
              style={styles.cardTopRow}
              leading={
                <View style={[styles.iconOrb, { backgroundColor: choice.orbBg }]}>
                  <Icon
                    size={iconSize.mdLg}
                    color={selected ? c.primaryDark : c.textSecondary}
                    strokeWidth={2}
                  />
                </View>
              }
              actions={
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <Check size={iconSize.xs} color={c.textInverse} strokeWidth={3} /> : null}
                </View>
              }
            >
              <View style={styles.cardTitles}>
                {choice.badge ? (
                  <Row align="center" gap={4} style={styles.badge}>
                    <Sparkles size={iconSize['2xs']} color={c.primaryDark} strokeWidth={2.25} />
                    <AppText style={styles.badgeText}>{choice.badge}</AppText>
                  </Row>
                ) : null}
                <AppText style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                  {choice.title}
                </AppText>
              </View>
            </Cluster>

            <AppText style={styles.cardDescription}>{choice.description}</AppText>

            <Row wrap align="center" gap={spacing[2]} style={styles.flowRow}>
              <FlowChipView chip={choice.flow[0]!} />
              <ArrowRight size={iconSize.xs} color={c.textTertiary} strokeWidth={2.25} />
              <FlowChipView chip={choice.flow[1]!} />
            </Row>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function RescheduleChoiceStep({
  patientName, choiceMode, onSelect }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_reschedule_components_RescheduleChoiceStep_tsx_styles');
  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInUp.duration(320)} style={styles.hero}>
        <LinearGradient
          colors={[palette.brand[50], palette.white]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <AppText style={styles.heroEyebrow}>Reprise de rendez-vous</AppText>
        <AppText style={styles.heroTitle}>Pour {patientName}</AppText>
      </Animated.View>

      <AppText style={styles.instruction}>
        Choisissez une option, puis appuyez sur Suivant.
      </AppText>

      <View style={styles.choiceList}>
        {CHOICES.map((choice, index) => (
          <RescheduleChoiceCard
            key={choice.mode}
            choice={choice}
            index={index}
            selected={choiceMode === choice.mode}
            onPress={() => onSelect(choice.mode)}
          />
        ))}
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  root: {
    gap: spacing[3],
  },
  hero: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.brand[200],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    overflow: 'hidden' as const,
    gap: 2,
    ...elevation.xs,
  },
  heroEyebrow: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primaryDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  instruction: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.4,
    paddingHorizontal: spacing[0.5],
  },
  choiceList: {
    gap: spacing[2],
  },
  cardHit: {
    borderRadius: radius['2xl'],
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  card: {
    borderRadius: radius['2xl'],
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    overflow: 'hidden' as const,
    ...elevation.xs,
  },
  cardSelected: {
    borderColor: c.primary,
    ...elevation.sm,
  },
  cardAccentBar: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardBody: {
    padding: spacing[3],
    paddingLeft: spacing[3] + 4,
    gap: spacing[2],
  },
  cardTopRow: {
    minWidth: 0,
  },
  iconOrb: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  cardTitles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  badge: {
    minWidth: 0,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: palette.brand[100],
  },
  badgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primaryDark,
  },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    letterSpacing: -0.1,
  },
  cardTitleSelected: {
    color: c.primaryDark,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
    marginTop: 2,
  },
  radioSelected: {
    borderColor: c.primary,
    backgroundColor: c.primary,
  },
  cardDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
  flowRow: {
    minWidth: 0,
  },
  flowChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  flowChipNeutral: {
    backgroundColor: palette.slate[50],
    borderColor: palette.slate[200],
  },
  flowChipMuted: {
    backgroundColor: c.errorLight,
    borderColor: c.errorMid,
  },
  flowChipSuccess: {
    backgroundColor: c.successLight,
    borderColor: c.successMid,
  },
  flowChipAccent: {
    backgroundColor: c.primaryLight,
    borderColor: c.primaryMid,
  },
  flowChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
  },
  flowChipTextNeutral: { color: palette.slate[600] },
  flowChipTextMuted: { color: c.error },
  flowChipTextSuccess: { color: c.success },
  flowChipTextAccent: { color: c.primaryDark },
};
}

