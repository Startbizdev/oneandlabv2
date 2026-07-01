import type { HealthBatchMetricInput } from '@oneandlab/shared-types';
import type { HealthReadResult } from './read-health-metrics';

const DAY_MS = 24 * 60 * 60 * 1000;

function sinceIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/**
 * Lecture HealthKit (iOS). Nécessite un build natif avec @kingstinct/react-native-healthkit.
 */
export async function readIosHealthMetrics(days: number): Promise<HealthReadResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Healthkit = require('@kingstinct/react-native-healthkit') as {
      requestAuthorization?: (types: { toRead: string[] }) => Promise<boolean>;
      queryQuantitySamples?: (
        type: string,
        options: { from: string; to: string; limit: number },
      ) => Promise<Array<{ quantity: number; unit: string; startDate: string; uuid?: string }>>;
    };

    if (!Healthkit?.requestAuthorization || !Healthkit?.queryQuantitySamples) {
      return {
        available: false,
        reason: 'HealthKit indisponible — utilisez un build de développement Cary.',
        metrics: [],
      };
    }

    const readTypes = [
      'HKQuantityTypeIdentifierBodyMass',
      'HKQuantityTypeIdentifierHeight',
      'HKQuantityTypeIdentifierHeartRate',
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
    ];

    const granted = await Healthkit.requestAuthorization({ toRead: readTypes });
    const permissions: Record<string, boolean> = { healthkit: !!granted };
    if (!granted) {
      return { available: false, reason: 'Autorisation Apple Santé refusée', permissions, metrics: [] };
    }

    const from = sinceIso(days);
    const to = new Date().toISOString();
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
      const samples = await Healthkit.queryQuantitySamples(q.hk, { from, to, limit: 500 });
      if (!Array.isArray(samples)) continue;
      for (const sample of samples) {
        const recordedAt = sample.startDate ? new Date(sample.startDate).toISOString() : to;
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
  } catch {
    return {
      available: false,
      reason: 'HealthKit non configuré sur cet appareil.',
      metrics: [],
    };
  }
}
