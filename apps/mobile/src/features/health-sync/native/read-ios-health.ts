import type { HealthBatchMetricInput } from '@oneandlab/shared-types';
import type { HealthReadResult } from './read-health-metrics';
import { requestDeviceHealthAuthorization } from './health-authorization';

const DAY_MS = 24 * 60 * 60 * 1000;

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

/**
 * Lecture HealthKit (iOS). Build natif @kingstinct/react-native-healthkit requis.
 */
export async function readIosHealthMetrics(days: number): Promise<HealthReadResult> {
  const auth = await requestDeviceHealthAuthorization();
  if (!auth.ok) {
    return { available: false, reason: auth.reason, metrics: [] };
  }

  try {
    const Healthkit = require('@kingstinct/react-native-healthkit') as {
      queryQuantitySamples?: (
        type: string,
        options: {
          limit: number;
          filter?: { date?: { startDate?: Date; endDate?: Date } };
        },
      ) => Promise<
        Array<{
          quantity: number;
          unit: string;
          startDate: Date | string;
          uuid?: string;
        }>
      >;
    };

    if (!Healthkit?.queryQuantitySamples) {
      return {
        available: false,
        reason: 'HealthKit indisponible — utilisez un build Cary natif.',
        metrics: [],
      };
    }

    const permissions: Record<string, boolean> = { healthkit: true };
    const startDate = sinceDate(days);
    const endDate = new Date();
    const metrics: HealthBatchMetricInput[] = [];

    const queries: Array<{ hk: string; metric: HealthBatchMetricInput['metric_type']; unit: string }> = [
      { hk: 'HKQuantityTypeIdentifierBodyMass', metric: 'weight', unit: 'kg' },
      { hk: 'HKQuantityTypeIdentifierHeight', metric: 'height', unit: 'cm' },
      { hk: 'HKQuantityTypeIdentifierHeartRate', metric: 'heart_rate', unit: 'bpm' },
      { hk: 'HKQuantityTypeIdentifierStepCount', metric: 'steps', unit: 'count' },
      { hk: 'HKQuantityTypeIdentifierActiveEnergyBurned', metric: 'active_energy', unit: 'kcal' },
      { hk: 'HKQuantityTypeIdentifierDistanceWalkingRunning', metric: 'distance', unit: 'km' },
    ];

    for (const q of queries) {
      const samples = await Healthkit.queryQuantitySamples(q.hk, {
        limit: 500,
        filter: { date: { startDate, endDate } },
      });
      if (!Array.isArray(samples)) continue;

      if (q.metric === 'steps') {
        const byDay = new Map<string, number>();
        for (const sample of samples) {
          const rawStart = sample.startDate;
          const dayKey =
            rawStart instanceof Date
              ? rawStart.toISOString().slice(0, 10)
              : rawStart
                ? new Date(rawStart).toISOString().slice(0, 10)
                : endDate.toISOString().slice(0, 10);
          const value = Number(sample.quantity);
          if (!Number.isFinite(value)) continue;
          byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + value);
        }
        for (const [dayKey, total] of byDay) {
          metrics.push({
            metric_type: 'steps',
            value: Math.round(total),
            unit: q.unit,
            recorded_at: `${dayKey}T12:00:00.000Z`,
            external_id: `ios:steps:${dayKey}`,
          });
        }
        continue;
      }

      for (const sample of samples) {
        const rawStart = sample.startDate;
        const recordedAt =
          rawStart instanceof Date
            ? rawStart.toISOString()
            : rawStart
              ? new Date(rawStart).toISOString()
              : endDate.toISOString();
        const externalId = `ios:${q.metric}:${sample.uuid ?? `${recordedAt}:${sample.quantity}`}`;
        let value = Number(sample.quantity);
        if (q.metric === 'weight' && (sample.unit === 'lb' || sample.unit === 'pound')) {
          value = Math.round(value * 0.453592 * 10) / 10;
        }
        if (q.metric === 'height' && sample.unit === 'in') {
          value = Math.round(value * 2.54 * 10) / 10;
        }
        if (!Number.isFinite(value)) continue;
        metrics.push({
          metric_type: q.metric,
          value,
          unit: q.unit,
          recorded_at: recordedAt,
          external_id: externalId,
        });
      }
    }

    return { available: true, permissions, metrics };
  } catch (e) {
    return {
      available: false,
      reason: e instanceof Error ? e.message : 'Lecture Apple Santé impossible.',
      metrics: [],
    };
  }
}
