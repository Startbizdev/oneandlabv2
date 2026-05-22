/** Réponse GET /plan-limits pour un infirmier */
export type NursePlanLimitsApi = {
  plan_slug?: string | null;
  max_radius_km?: number;
  max_appointments_per_month?: number | null;
  appointments_count_this_month?: number;
};

export type NormalizedNursePlanLimits = {
  planSlug: string;
  planLabel: string;
  isPro: boolean;
  maxRadiusKm: number;
  used: number;
  max: number;
  showQuota: boolean;
  quotaFull: boolean;
  progress: number;
  remaining: number;
};

export function normalizeNursePlanLimits(
  raw: NursePlanLimitsApi | Record<string, unknown> | null | undefined,
): NormalizedNursePlanLimits {
  const planSlug = String(raw?.plan_slug ?? 'discovery');
  const isPro = planSlug === 'nurse_pro';
  const maxRaw = raw?.max_appointments_per_month;
  const maxNum =
    maxRaw === null || maxRaw === undefined ? null : Math.max(0, Number(maxRaw));
  const used = Math.max(0, Number(raw?.appointments_count_this_month ?? 0));
  const max = maxNum ?? 10;
  const showQuota = !isPro && maxNum !== null;
  const quotaFull = showQuota && used >= max;
  const progress = showQuota && max > 0 ? Math.min(used / max, 1) : 0;

  return {
    planSlug,
    planLabel: isPro ? 'Pro' : 'Découverte',
    isPro,
    maxRadiusKm: Number(raw?.max_radius_km ?? (isPro ? 100 : 20)),
    used,
    max,
    showQuota,
    quotaFull,
    progress,
    remaining: Math.max(0, max - used),
  };
}
