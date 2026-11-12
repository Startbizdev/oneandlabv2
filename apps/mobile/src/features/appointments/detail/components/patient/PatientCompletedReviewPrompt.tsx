import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Button } from '@/components/ui/Button';
import { RdvPublishedReviewBanner } from '@/features/appointments/detail/components/RdvPublishedReviewBanner';
import { useAppColors } from '@/theme/use-app-colors';
import { radius, spacing, iconSize, AppText, useStyles, ICON_STROKE_WIDTH, type Theme } from '@/theme';
import { revieweePayloadForCompletedAppt } from '@/utils/reviewee-payload';
import { PatientReviewPromptSheet } from './PatientReviewPromptSheet';
import {
  revieweeFirstName,
  type ReviewRow,
  usePatientReviewPrompt,
} from './use-patient-review-prompt';

interface Props {
  batch: Appointment[];
  onRefresh: () => void;
}

/** Soignants pour lesquels le patient a touché « Plus tard » : on ne redemande plus. */
const DISMISSED_KEY = 'review-prompt-dismissed';

function useDismissedReviewees() {
  const [ids, setIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let next = new Set<string>();
      try {
        const raw = await AsyncStorage.getItem(DISMISSED_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) next = new Set(parsed.map(String));
      } catch {
        /* stockage indisponible : on affiche l'invitation */
      }
      if (!cancelled) setIds(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback((revieweeId: string) => {
    setIds((prev) => {
      const next = new Set(prev ?? []);
      next.add(revieweeId);
      AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])).catch(() => undefined);
      return next;
    });
  }, []);

  return { dismissed: ids, dismiss };
}

function PendingReviewRow({
  appt,
  proName,
  isMulti,
  onRate,
  onLater,
}: {
  appt: Appointment;
  proName: string;
  isMulti: boolean;
  onRate: () => void;
  onLater: () => void;
}) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const care = isMulti ? ` (${appt.category_name ?? 'soin'})` : '';
  const label = proName ? `Votre avis sur ${proName}${care} ?` : `Votre avis sur ce soin${care} ?`;

  return (
    <View style={styles.row}>
      <Star size={iconSize.sm} color={c.star} fill={c.starFill} strokeWidth={ICON_STROKE_WIDTH} />
      <AppText variant="secondary" style={styles.label} numberOfLines={2}>
        {label}
      </AppText>
      <Button title="Plus tard" variant="ghost" size="sm" onPress={onLater} />
      <Button title="Noter" variant="outline" size="sm" onPress={onRate} />
    </View>
  );
}

function PublishedReviewAlert({
  appt,
  review,
  isMulti,
  onPress,
}: {
  appt: Appointment;
  review: ReviewRow;
  isMulti: boolean;
  onPress: () => void;
}) {
  const rating = review.rating ?? 0;
  const careLabel = appt.category_name?.trim() || 'Soin';
  const ratingLine =
    rating > 0
      ? `Note ${rating}/5 enregistrée. Toucher pour consulter votre avis.`
      : 'Toucher pour consulter votre avis.';
  const message = isMulti ? `${careLabel} · ${ratingLine}` : ratingLine;

  return <RdvPublishedReviewBanner message={message} onPress={onPress} />;
}

/**
 * Avis post-RDV, en bas du détail : une ligne discrète (le serveur décide quand la proposer,
 * cf. AppointmentReviewPrompt). « Plus tard » la masque pour ce soignant.
 */
export function PatientCompletedReviewPrompt({ batch, onRefresh }: Props) {
  const styles = useStyles(buildStyles);
  const { dismissed, dismiss } = useDismissedReviewees();
  const {
    reviewable,
    reviewsByAppt,
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openSheet(apptId);
  };

  // Attendre la lecture du stockage : pas d'invitation qui apparaît puis disparaît.
  if (!reviewable.length || !dismissed) return null;

  const isMulti = reviewable.length > 1;
  const items = reviewable.filter((appt) => {
    if (reviewsByAppt[appt.id]) return true;
    const reviewee = revieweePayloadForCompletedAppt(appt)?.reviewee_id;
    return !reviewee || !dismissed.has(reviewee);
  });
  if (!items.length && !sheetApptId) return null;

  return (
    <>
      {items.length ? (
        <View style={styles.stack}>
          {items.map((appt) => {
            const existing = reviewsByAppt[appt.id];
            if (existing) {
              return (
                <PublishedReviewAlert
                  key={appt.id}
                  appt={appt}
                  review={existing}
                  isMulti={isMulti}
                  onPress={() => open(appt.id)}
                />
              );
            }
            const reviewee = revieweePayloadForCompletedAppt(appt)?.reviewee_id;
            return (
              <PendingReviewRow
                key={appt.id}
                appt={appt}
                proName={revieweeFirstName(appt)}
                isMulti={isMulti}
                onRate={() => open(appt.id)}
                onLater={() => reviewee && dismiss(reviewee)}
              />
            );
          })}
        </View>
      ) : null}

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

function buildStyles({ colors: c }: Theme) {
  return {
    stack: { gap: spacing[2] },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingVertical: spacing[2],
      paddingLeft: spacing[3],
      paddingRight: spacing[1],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    label: { flex: 1, minWidth: 0 },
  } as const;
}
