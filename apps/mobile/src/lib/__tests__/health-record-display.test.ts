import { describe, it, expect } from '@jest/globals';
import {
  HEALTH_RECORD_EMPTY_LABEL,
  formatHealthRecordDisplay,
  formatHealthRecordStoredValue,
  isHealthRecordValueFilled,
  unwrapHealthRecordValue,
} from '../../features/health-record/utils/health-record-display';

describe('health-record-display', () => {
  it('unwraps nested { value } wrappers', () => {
    expect(unwrapHealthRecordValue({ value: { value: 'yes' } })).toBe('yes');
  });

  it('formats enums and empty values', () => {
    expect(formatHealthRecordStoredValue('yes')).toBe('Oui');
    expect(formatHealthRecordStoredValue(null)).toBe(HEALTH_RECORD_EMPTY_LABEL);
    expect(formatHealthRecordDisplay('—')).toBe(HEALTH_RECORD_EMPTY_LABEL);
  });

  it('detects filled vs empty display', () => {
    expect(isHealthRecordValueFilled('Oui')).toBe(true);
    expect(isHealthRecordValueFilled(HEALTH_RECORD_EMPTY_LABEL)).toBe(false);
    expect(isHealthRecordValueFilled(null)).toBe(false);
  });
});
