import type { HealthDashboardData, HealthMetricPoint, HealthMetricType } from '@oneandlab/shared-types';

export const DAILY_STEPS_GOAL = 8000;

export type HealthMetricStat = {
  type: HealthMetricType;
  label: string;
  value: string;
  unit: string;
  hint?: string;
};

export type HealthInsight = {
  id: string;
  tone: 'neutral' | 'positive' | 'attention';
  title: string;
  body: string;
};

export function buildHealthMetricStats(data: HealthDashboardData | undefined): HealthMetricStat[] {
  const w7 = data?.summary?.windows?.['7d']?.metrics;
  if (!w7) return [];

  const stats: HealthMetricStat[] = [];

  if (w7.steps && w7.steps.sample_count > 0) {
    stats.push({
      type: 'steps',
      label: 'Pas / jour',
      value: String(Math.round(w7.steps.avg)),
      unit: 'moy. 7 j',
      hint: `${w7.steps.min}–${w7.steps.max}`,
    });
  }

  if (w7.heart_rate && w7.heart_rate.sample_count > 0) {
    stats.push({
      type: 'heart_rate',
      label: 'Fréq. cardiaque',
      value: String(Math.round(w7.heart_rate.avg)),
      unit: 'bpm',
      hint: `${Math.round(w7.heart_rate.min)}–${Math.round(w7.heart_rate.max)}`,
    });
  }

  if (w7.weight && w7.weight.sample_count > 0) {
    stats.push({
      type: 'weight',
      label: 'Poids',
      value: String(Math.round(w7.weight.avg * 10) / 10),
      unit: 'kg',
      hint: w7.weight.sample_count >= 2 ? `${w7.weight.min}–${w7.weight.max} kg` : undefined,
    });
  }

  if (w7.active_energy && w7.active_energy.sample_count > 0) {
    stats.push({
      type: 'active_energy',
      label: 'Énergie active',
      value: String(Math.round(w7.active_energy.avg)),
      unit: 'kcal/j',
    });
  }

  return stats;
}

export function pickLatestMetricValue(
  points: HealthMetricPoint[],
  onDay?: string,
): number | null {
  if (points.length === 0) return null;
  const day = onDay ?? new Date().toISOString().slice(0, 10);
  const todayPoints = points.filter((p) => p.recorded_at.startsWith(day));
  const pool = todayPoints.length > 0 ? todayPoints : points;
  const last = pool[pool.length - 1];
  return last?.value ?? null;
}

export function buildHealthInsights(data: HealthDashboardData | undefined): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const w7 = data?.summary?.windows?.['7d']?.metrics;
  const w30 = data?.summary?.windows?.['30d']?.metrics;
  if (!w7) return insights;

  if (w7.steps && w7.steps.sample_count > 0) {
    const avg = Math.round(w7.steps.avg);
    const goalPct = Math.min(100, Math.round((avg / DAILY_STEPS_GOAL) * 100));
    if (avg >= DAILY_STEPS_GOAL) {
      insights.push({
        id: 'steps_goal',
        tone: 'positive',
        title: 'Objectif activité atteint',
        body: `En moyenne ${avg.toLocaleString('fr-FR')} pas/j sur 7 jours — au-dessus de l’objectif OMS (~${DAILY_STEPS_GOAL.toLocaleString('fr-FR')} pas).`,
      });
    } else if (goalPct >= 60) {
      insights.push({
        id: 'steps_progress',
        tone: 'neutral',
        title: 'Bonne dynamique d’activité',
        body: `${avg.toLocaleString('fr-FR')} pas/j en moyenne (${goalPct} % de l’objectif). Quelques marches de plus par jour suffisent pour progresser.`,
      });
    } else {
      insights.push({
        id: 'steps_low',
        tone: 'attention',
        title: 'Activité à renforcer',
        body: `${avg.toLocaleString('fr-FR')} pas/j en moyenne. Viser ${DAILY_STEPS_GOAL.toLocaleString('fr-FR')} pas/j aide la santé cardiovasculaire et le bien-être.`,
      });
    }
  }

  if (w7.heart_rate && w7.heart_rate.sample_count >= 3) {
    const avg = Math.round(w7.heart_rate.avg);
    insights.push({
      id: 'heart_rate',
      tone: 'neutral',
      title: 'Fréquence cardiaque suivie',
      body: `Moyenne ${avg} bpm sur 7 jours (fourchette ${Math.round(w7.heart_rate.min)}–${Math.round(w7.heart_rate.max)} bpm). Utile pour votre suivi avec Cary.`,
    });
  }

  if (w7.weight && w7.weight.sample_count >= 2) {
    const delta = Math.round((w7.weight.max - w7.weight.min) * 10) / 10;
    if (delta <= 1) {
      insights.push({
        id: 'weight_stable',
        tone: 'positive',
        title: 'Poids stable',
        body: `Variation de ${delta} kg sur 7 jours — bon signe de stabilité.`,
      });
    } else {
      insights.push({
        id: 'weight_change',
        tone: 'neutral',
        title: 'Évolution du poids',
        body: `${w7.weight.min}–${w7.weight.max} kg sur 7 jours. Partagez cette tendance avec votre professionnel si besoin.`,
      });
    }
  }

  if (w30?.steps && w7.steps && w30.steps.sample_count >= 7 && w7.steps.sample_count >= 3) {
    const trend = Math.round(w7.steps.avg - w30.steps.avg);
    if (trend > 300) {
      insights.push({
        id: 'steps_up',
        tone: 'positive',
        title: 'Activité en hausse',
        body: `+${trend.toLocaleString('fr-FR')} pas/j vs votre moyenne 30 jours — continuez ainsi.`,
      });
    } else if (trend < -300) {
      insights.push({
        id: 'steps_down',
        tone: 'attention',
        title: 'Activité en baisse',
        body: `${Math.abs(trend).toLocaleString('fr-FR')} pas/j de moins que votre moyenne 30 jours. Reprenez une routine douce si possible.`,
      });
    }
  }

  if (insights.length === 0 && data?.summary?.has_data) {
    insights.push({
      id: 'sync_ok',
      tone: 'neutral',
      title: 'Données synchronisées',
      body: 'Vos mesures enrichissent votre carnet et l’assistant Cary pour un suivi plus personnalisé.',
    });
  }

  return insights.slice(0, 4);
}

export function isHealthSyncRecent(iso?: string | null, maxDays = 14): boolean {
  if (!iso) return false;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  return Date.now() - then <= maxDays * 24 * 60 * 60 * 1000;
}
