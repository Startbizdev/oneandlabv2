import type { HealthBatchMetricInput } from '@oneandlab/shared-types';
import type { HealthReadResult } from './read-health-metrics';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Lecture Health Connect (Android). Nécessite react-native-health-connect sur build natif.
 */
export async function readAndroidHealthMetrics(days: number): Promise<HealthReadResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const HealthConnect = require('react-native-health-connect') as {
      initialize?: () => Promise<boolean>;
      requestPermission?: (permissions: Array<{ accessType: string; recordType: string }>) => Promise<unknown>;
      readRecords?: (
        type: string,
        options: { timeRangeFilter: { operator: string; startTime: string; endTime: string } },
      ) => Promise<{ records?: Array<Record<string, unknown>> }>;
    };

    if (!HealthConnect?.initialize || !HealthConnect?.readRecords) {
      return {
        available: false,
        reason: 'Health Connect indisponible — utilisez un build de développement Cary.',
        metrics: [],
      };
    }

    const ok = await HealthConnect.initialize();
    if (!ok) {
      return { available: false, reason: 'Health Connect non disponible', metrics: [] };
    }

    if (HealthConnect.requestPermission) {
      await HealthConnect.requestPermission([
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      ]);
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
      for (const row of records) {
        const time = String(row.startTime ?? row.time ?? endTime);
        const value = Number(row.weight ?? row.beatsPerMinute ?? row.count ?? row.energy ?? row.distance?.inKilometers ?? 0);
        if (!Number.isFinite(value) || value <= 0) continue;
        const id = String(row.metadata?.id ?? `${m.metric}:${time}:${value}`);
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
  } catch {
    return {
      available: false,
      reason: 'Health Connect non configuré sur cet appareil.',
      metrics: [],
    };
  }
}
