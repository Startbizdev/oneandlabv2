export type AssigneeReviewSummary = {
  averageRating: number;
  reviewsCount: number;
};

function parseReviewSummary(
  averageRating: unknown,
  reviewsCount: unknown,
): AssigneeReviewSummary | null {
  const count = typeof reviewsCount === 'number' ? reviewsCount : Number(reviewsCount);
  const rating = typeof averageRating === 'number' ? averageRating : Number(averageRating);
  if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(rating) || rating <= 0) {
    return null;
  }
  return { averageRating: rating, reviewsCount: Math.round(count) };
}

export function assigneeReviewFromPrefix(
  ext: Record<string, unknown>,
  prefix: 'assigned_nurse' | 'assigned_lab' | 'assigned_to',
): AssigneeReviewSummary | null {
  return parseReviewSummary(
    ext[`${prefix}_average_rating`],
    ext[`${prefix}_reviews_count`],
  );
}

export function creatorOriginReviewSummary(
  creator: Record<string, unknown> | null | undefined,
): AssigneeReviewSummary | null {
  if (!creator) return null;
  return parseReviewSummary(creator.average_rating, creator.total_reviews);
}

export function formatReviewsCount(count: number): string {
  return count > 1 ? `${count} avis` : `${count} avis`;
}
