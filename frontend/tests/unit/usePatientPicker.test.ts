import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubGlobal('ref', (v: unknown) => ({ value: v }));
vi.stubGlobal('readonly', (v: unknown) => v);
vi.stubGlobal('onUnmounted', (fn: () => void) => {
  (globalThis as { __unmount?: () => void }).__unmount = fn;
});
vi.stubGlobal('watch', () => {});

describe('usePatientPicker helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('shouldRunPatientPickerSearch requires min length', async () => {
    const { shouldRunPatientPickerSearch, PATIENT_PICKER_MIN_SEARCH_LENGTH } = await import(
      '../../composables/usePatientPicker'
    );
    expect(shouldRunPatientPickerSearch('a')).toBe(false);
    expect(shouldRunPatientPickerSearch('ab')).toBe(true);
    expect(PATIENT_PICKER_MIN_SEARCH_LENGTH).toBe(2);
  });

  it('runPatientSearch loads results when term is long enough', async () => {
    const { usePatientPicker } = await import('../../composables/usePatientPicker');
    const searchPatients = vi.fn().mockResolvedValue([{ id: '1', first_name: 'Béatrice' }]);
    const picker = usePatientPicker({ searchPatients, debounceMs: 0 });
    await picker.runPatientSearch('bé');
    expect(searchPatients).toHaveBeenCalledWith('bé');
    expect(picker.patients.value).toHaveLength(1);
    expect(picker.patientsError.value).toBe(false);
  });

  it('runPatientSearch clears list when term too short', async () => {
    const { usePatientPicker } = await import('../../composables/usePatientPicker');
    const searchPatients = vi.fn();
    const picker = usePatientPicker({ searchPatients });
    picker.patients.value = [{ id: 'x' }];
    await picker.runPatientSearch('b');
    expect(searchPatients).not.toHaveBeenCalled();
    expect(picker.patients.value).toEqual([]);
  });
});
