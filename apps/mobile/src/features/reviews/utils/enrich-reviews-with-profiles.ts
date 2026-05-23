import type { Appointment } from '@oneandlab/shared-types';
import type { Review } from '@/features/reviews/types';

type AptExt = Appointment & Record<string, unknown>;

function pickUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function assigneeProfileFromAppointment(
  apt: AptExt,
  revieweeId: string,
): { profileImageUrl: string | null; gender: string | null } {
  const id = String(revieweeId);
  if (String(apt.assigned_nurse_id ?? '') === id) {
    return {
      profileImageUrl: pickUrl(apt.assigned_nurse_profile_image_url),
      gender: pickUrl(apt.assigned_nurse_gender),
    };
  }
  if (String(apt.assigned_lab_id ?? '') === id) {
    return {
      profileImageUrl: pickUrl(apt.assigned_lab_profile_image_url),
      gender: pickUrl(apt.assigned_lab_gender),
    };
  }
  if (String(apt.assigned_to ?? '') === id) {
    return {
      profileImageUrl: pickUrl(apt.assigned_to_profile_image_url),
      gender: pickUrl(apt.assigned_to_gender),
    };
  }
  return { profileImageUrl: null, gender: null };
}

function buildRevieweeIndex(
  appointments: Appointment[],
): Map<string, { profileImageUrl: string | null; gender: string | null }> {
  const map = new Map<string, { profileImageUrl: string | null; gender: string | null }>();

  for (const apt of appointments) {
    const ext = apt as AptExt;
    const pairs: [unknown, unknown, unknown][] = [
      [apt.assigned_nurse_id, ext.assigned_nurse_profile_image_url, ext.assigned_nurse_gender],
      [apt.assigned_lab_id, ext.assigned_lab_profile_image_url, ext.assigned_lab_gender],
      [apt.assigned_to, ext.assigned_to_profile_image_url, ext.assigned_to_gender],
    ];

    for (const [userId, imageUrl, gender] of pairs) {
      if (!userId) continue;
      const key = String(userId);
      const img = pickUrl(imageUrl);
      const g = pickUrl(gender);
      const existing = map.get(key);
      if (!existing || (!existing.profileImageUrl && img)) {
        map.set(key, {
          profileImageUrl: img ?? existing?.profileImageUrl ?? null,
          gender: g ?? existing?.gender ?? null,
        });
      }
    }
  }

  return map;
}

/** Complète les photos pro quand l’API avis ne les renvoie pas encore (aligné liste RDV). */
export function enrichReviewsWithAppointmentProfiles(
  reviews: Review[],
  appointments: Appointment[],
): Review[] {
  if (reviews.length === 0 || appointments.length === 0) return reviews;

  const byReviewee = buildRevieweeIndex(appointments);
  const byAppointment = new Map(appointments.map((apt) => [String(apt.id), apt as AptExt]));

  return reviews.map((review) => {
    if (pickUrl(review.reviewee_profile_image_url)) return review;

    const revieweeId = review.reviewee_id ? String(review.reviewee_id) : '';
    let profileImageUrl: string | null = null;
    let gender = review.reviewee_gender ?? null;

    if (revieweeId) {
      const hit = byReviewee.get(revieweeId);
      if (hit?.profileImageUrl) profileImageUrl = hit.profileImageUrl;
      if (!gender && hit?.gender) gender = hit.gender;
    }

    if (!profileImageUrl && review.appointment_id && revieweeId) {
      const apt = byAppointment.get(String(review.appointment_id));
      if (apt) {
        const fromAppt = assigneeProfileFromAppointment(apt, revieweeId);
        profileImageUrl = fromAppt.profileImageUrl ?? profileImageUrl;
        gender = gender ?? fromAppt.gender;
      }
    }

    if (!profileImageUrl && !gender) return review;

    return {
      ...review,
      reviewee_profile_image_url: profileImageUrl ?? review.reviewee_profile_image_url ?? null,
      reviewee_gender: gender ?? review.reviewee_gender ?? null,
    };
  });
}
