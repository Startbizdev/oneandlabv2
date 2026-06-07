import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { PatientReviewPromptSheet } from './PatientReviewPromptSheet';
import { revieweeFirstName, usePatientReviewPrompt } from './use-patient-review-prompt';

interface Props {
  batch: Appointment[];
  onRefresh: () => void;
}

function PendingReviewCard({
  appt,
  proName,
  isMulti,
  onPress,
}: {
  appt: Appointment;
  proName: string;
  isMulti: boolean;
  onPress: () => void;
}) {
  const c = useAppColors();
  const headline = proName
    ? `Comment s'est passé votre soin avec ${proName} ?`
    : "Comment s'est passé votre soin ?";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Laisser un avis sur votre soin"
      style={({ pressed }) => [pressed && cardStyles.pressedOuter]}
    >
      <View style={[cardStyles.shell, elevation.md]}>
        <LinearGradient
          colors={[hexToRgba(c.primary, 0.18), hexToRgba(c.primary, 0.04), c.surface]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cardStyles.gradient}
        >
          <View style={cardStyles.content}>
            <View style={cardStyles.topRow}>
              <Text style={[cardStyles.kicker, { color: c.primaryDark }]}>Votre avis compte</Text>
              <View style={[cardStyles.timePill, { backgroundColor: c.primary }]}>
                <Text style={[cardStyles.timePillText, { color: c.textInverse }]}>2 min</Text>
              </View>
            </View>

            <Text style={cardStyles.headline}>{headline}</Text>
            <Text style={cardStyles.subline}>
              Aidez la communauté Cary à trouver les meilleurs professionnels.
            </Text>

            {isMulti ? (
              <View style={[cardStyles.soinTag, { backgroundColor: hexToRgba(c.primary, 0.1) }]}>
                <Text style={[cardStyles.soinTagText, { color: c.primaryDark }]}>
                  {appt.category_name ?? 'Soin'}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                cardStyles.cta,
                {
                  backgroundColor: c.warningLight,
                  borderColor: hexToRgba(c.star, 0.35),
                },
              ]}
            >
              <Star size={20} color={c.star} fill={c.starFill} strokeWidth={1.5} />
              <Text style={[cardStyles.ctaText, { color: c.warning }]}>Noter mon soin</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

function DoneReviewCard({
  appt,
  isMulti,
  onPress,
}: {
  appt: Appointment;
  isMulti: boolean;
  onPress: () => void;
}) {
  const c = useAppColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voir mon avis publié"
      style={({ pressed }) => [pressed && cardStyles.pressedOuter]}
    >
      <View style={[cardStyles.shell, elevation.sm]}>
        <LinearGradient
          colors={[hexToRgba(c.success, 0.14), c.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cardStyles.gradient}
        >
          <View style={cardStyles.content}>
            <Text style={[cardStyles.kicker, { color: c.success }]}>Merci !</Text>

            <Text style={cardStyles.headline}>
              {isMulti ? `Avis publié · ${appt.category_name ?? 'Soin'}` : 'Votre avis est en ligne'}
            </Text>

            <View style={[cardStyles.ctaOutline, { borderColor: c.successMid }]}>
              <Text style={[cardStyles.ctaOutlineText, { color: c.success }]}>Voir mon avis</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

/** Encart avis post-RDV — carte visible & cliquable → bottom sheet. */
export function PatientCompletedReviewPrompt({ batch, onRefresh }: Props) {
  const {
    reviewable,
    reviewsByAppt,
    pendingCount,
    sheetAppt,
    sheetApptId,
    sheetExisting,
    sheetForm,
    openSheet,
    closeSheet,
    setFormRating,
    setFormComment,
    submitReview,
  } = usePatientReviewPrompt(batch, onRefresh);

  const open = (apptId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openSheet(apptId);
  };

  if (!reviewable.length) return null;

  const isMulti = reviewable.length > 1;

  return (
    <>
      <View style={cardStyles.stack}>
        {reviewable.map((appt) => {
          const existing = reviewsByAppt[appt.id];
          const proName = revieweeFirstName(appt);

          if (existing) {
            return (
              <DoneReviewCard
                key={appt.id}
                appt={appt}
                isMulti={isMulti}
                onPress={() => open(appt.id)}
              />
            );
          }

          return (
            <PendingReviewCard
              key={appt.id}
              appt={appt}
              proName={proName}
              isMulti={isMulti}
              onPress={() => open(appt.id)}
            />
          );
        })}

        {pendingCount > 0 && isMulti ? (
          <Text style={cardStyles.footerHint}>
            {pendingCount} avis restant{pendingCount > 1 ? 's' : ''} sur ce lot
          </Text>
        ) : null}
      </View>

      <PatientReviewPromptSheet
        visible={!!sheetApptId}
        appt={sheetAppt}
        existing={sheetExisting}
        form={sheetForm}
        onClose={closeSheet}
        onRatingChange={(rating) => sheetApptId && setFormRating(sheetApptId, rating)}
        onCommentChange={(comment) => sheetApptId && setFormComment(sheetApptId, comment)}
        submitReview={submitReview}
      />
    </>
  );
}

function buildCardStyles(c: AppColors) {
  return {
    stack: { gap: spacing[3] },
    pressedOuter: { opacity: 0.94, transform: [{ scale: 0.985 }] },
    shell: {
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderColor: hexToRgba(c.primary, 0.22),
      overflow: 'hidden' as const,
    },
    gradient: {
      width: '100%' as const,
    },
    content: {
      flex: 1,
      padding: spacing[4],
      gap: spacing[2.5],
    },
    topRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[2],
    },
    kicker: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    timePill: {
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
    },
    timePillText: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
    },
    headline: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.md,
      color: c.textPrimary,
      lineHeight: fontSize.md * 1.3,
    },
    subline: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    soinTag: {
      alignSelf: 'flex-start' as const,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
    },
    soinTagText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
    },
    cta: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[2],
      marginTop: spacing[1],
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      borderRadius: radius.xl,
      borderWidth: 1,
    },
    ctaText: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.base,
      textAlign: 'center' as const,
    },
    ctaOutline: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[2],
      marginTop: spacing[1],
      paddingVertical: spacing[2.5],
      paddingHorizontal: spacing[4],
      borderRadius: radius.xl,
      borderWidth: 1.5,
    },
    ctaOutlineText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
    },
    footerHint: {
      textAlign: 'center' as const,
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
  };
}

const cardStyles = new Proxy({} as ReturnType<typeof buildCardStyles>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles(
        'features_appointments_detail_components_patient_PatientCompletedReviewPrompt_tsx_v3_styles',
        buildCardStyles,
      )[prop as keyof ReturnType<typeof buildCardStyles>];
    }
    return undefined;
  },
});
