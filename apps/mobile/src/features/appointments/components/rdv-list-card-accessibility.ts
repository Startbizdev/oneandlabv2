import type { Appointment } from '@oneandlab/shared-types';
import { STATUS_LABELS } from '@oneandlab/shared-utils';
import { formatMiniDateCalendarParts } from '@/utils/mini-date-calendar-parts';
import { maskOfferCounterparty } from '@/utils/offer-privacy-display';
import { rdvCatalogDisplayLines } from '@/utils/rdv-catalog-lines';
import {
  rdvMaquetteAvatarCounterparty,
  rdvMaquetteTimeLabel,
  type RdvListCardViewerRole,
} from '@/utils/rdv-maquette-card-display';
import { formatReviewsCount } from '@/features/appointments/detail/utils/assignee-review-display';

/** Libellé VoiceOver / TalkBack pour une carte RDV liste (Pressable parent). */
export function buildRdvListCardAccessibilityLabel(
  apt: Appointment,
  role: RdvListCardViewerRole,
  status: string,
): string {
  const segments: string[] = ['Rendez-vous'];

  const dateParts = formatMiniDateCalendarParts(apt.scheduled_at);
  if (dateParts) segments.push(dateParts.accessibilityLabel);

  const creneau = rdvMaquetteTimeLabel(apt);
  if (creneau) segments.push(creneau);

  const counterparty =
    role === 'demande'
      ? maskOfferCounterparty(rdvMaquetteAvatarCounterparty(apt, role))
      : rdvMaquetteAvatarCounterparty(apt, role);
  if (counterparty?.assignmentPending) {
    segments.push('Assignation en cours');
  } else if (counterparty?.name?.trim()) {
    const subtitle = counterparty.subtitle?.trim();
    segments.push(subtitle ? `${counterparty.name}, ${subtitle}` : counterparty.name);
    if (counterparty.showRating) {
      const review = counterparty.reviewSummary;
      if (review) {
        segments.push(
          `Note ${review.averageRating.toFixed(1)} sur 5, ${formatReviewsCount(review.reviewsCount)}`,
        );
      } else {
        segments.push('Nouveau, pas encore d\'avis');
      }
    }
  }

  const careLabels = rdvCatalogDisplayLines(
    apt,
    role === 'patient' ? { hideStaffOnlyCares: true } : undefined,
  )
    .map((line) => line.label.trim())
    .filter(Boolean);
  if (careLabels.length) segments.push(careLabels.join(', '));

  const statusLabel = STATUS_LABELS[status] ?? status;
  if (statusLabel) segments.push(`Statut ${statusLabel}`);

  return segments.join(', ');
}
