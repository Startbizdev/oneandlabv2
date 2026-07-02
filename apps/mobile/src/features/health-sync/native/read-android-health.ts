import type { HealthBatchMetricInput } from '@oneandlab/shared-types';
import type { HealthReadResult } from './read-health-metrics';
import { requestDeviceHealthAuthorization } from './health-authorization';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Lecture Health Connect (Android). Build natif react-native-health-connect requis.
 */
export async function readAndroidHealthMetrics(days: number): Promise<HealthReadResult> {
  const auth = await requestDeviceHealthAuthorization();
  if (!auth.ok) {
    return { available: false, reason: auth.reason, metrics: [] };
  }

  try {
    const HealthConnect = require('react-native-health-connect') as {
      readRecords?: (
        type: string,
        options: { timeRangeFilter: { operator: string; startTime: string; endTime: string } },
      ) => Promise<{ records?: Array<Record<string, unknown>> }>;
    };

    if (!HealthConnect?.readRecords) {
      return {
        available: false,
        reason: 'Health Connect indisponible — utilisez un build Cary natif.',
        metrics: [],
      };
    }

    const startTime = new Date(Date.now() - days * DAY_MS).toISOString();
    const endTime = new Date().toISOString();
    const timeRangeFilter = { operator: 'between', startTime, endTime };
    const metrics: HealthBatchMetricInput[] = [];

    const mapType: Array<{ record: string; metric: HealthBatchMetricInput['metric_type']; unit: string }> = [
      { record: 'Weight', metric: 'weight', unit: 'kg' },
      { record: 'HeartRate', metric: 'heart_rate', unit: 'bpm' },
      { record: 'Steps', metric: 'steps', unit: 'count' },
      { record: 'Distance', metric: 'distance', unit: 'km' },
      { record: 'ActiveCaloriesBurned', metric: 'active_energy', unit: 'kcal' },
    ];

    for (const m of mapType) {
      const result = await HealthConnect.readRecords(m.record, { timeRangeFilter });
      const records = result?.records ?? [];

      if (m.metric === 'steps') {
        const byDay = new Map<string, number>();
        for (const row of records) {
          const time = String(row.startTime ?? row.time ?? endTime);
          const dayKey = new Date(time).toISOString().slice(0, 10);
          const value = Number(row.count ?? 0);
          if (!Number.isFinite(value)) continue;
          byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + value);
        }
        for (const [dayKey, total] of byDay) {
          metrics.push({
            metric_type: 'steps',
            value: Math.round(total),
            unit: m.unit,
            recorded_at: `${dayKey}T12:00:00.000Z`,
            external_id: `android:steps:${dayKey}`,
          });
        }
        continue;
      }

      for (const row of records as Array<Record<string, unknown>>) {
        const distance = row.distance as { inKilometers?: number } | undefined;
        const metadata = row.metadata as { id?: string } | undefined;
        const time = String(row.startTime ?? row.time ?? endTime);
        const value = Number(row.weight ?? row.beatsPerMinute ?? row.energy ?? distance?.inKilometers ?? 0);
        if (!Number.isFinite(value) || value <= 0) continue;
        const id = String(metadata?.id ?? `${m.metric}:${time}:${value}`);
        metrics.push({
          metric_type: m.metric,
          value,
          unit: m.unit,
          recorded_at: new Date(time).toISOString(),
          external_id: `android:${m.metric}:${id}`,
        });
      }
    }

    return { available: true, permissions: { health_connect: true }, metrics };
  } catch (e) {
    return {
      available: false,
      reason: e instanceof Error ? e.message : 'Lecture Health Connect impossible.',
      metrics: [],
    };
  }
}
