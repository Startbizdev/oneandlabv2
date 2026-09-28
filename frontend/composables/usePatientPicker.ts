/**
 * Recherche patient debouncée pour selects staff (wizard RDV).
 */

export const PATIENT_PICKER_MIN_SEARCH_LENGTH = 2;
export const PATIENT_PICKER_SEARCH_DEBOUNCE_MS = 280;

export type PatientPickerSearchFn = (term: string) => Promise<unknown[]>;

export function shouldRunPatientPickerSearch(
  term: string,
  minLength = PATIENT_PICKER_MIN_SEARCH_LENGTH,
): boolean {
  return term.trim().length >= minLength;
}

export function usePatientPicker(options: {
  searchPatients: PatientPickerSearchFn;
  /** Si false, la recherche est ignorée (ex. utilisateur non connecté). */
  canSearch?: () => boolean;
  debounceMs?: number;
}) {
  const patients = ref<any[]>([]);
  const patientsLoading = ref(false);
  const patientsError = ref(false);
  const patientSearchTerm = ref('');
  let patientSearchTimer: ReturnType<typeof setTimeout> | null = null;
  const debounceMs = options.debounceMs ?? PATIENT_PICKER_SEARCH_DEBOUNCE_MS;

  async function runPatientSearch(term: string) {
    if (options.canSearch && !options.canSearch()) return;
    const q = term.trim();
    if (!shouldRunPatientPickerSearch(q)) {
      patients.value = [];
      patientsError.value = false;
      return;
    }
    patientsLoading.value = true;
    patientsError.value = false;
    try {
      patients.value = await options.searchPatients(q);
    } catch {
      patients.value = [];
      patientsError.value = true;
    } finally {
      patientsLoading.value = false;
    }
  }

  async function loadPatients() {
    await runPatientSearch(patientSearchTerm.value);
  }

  function resetPatientPickerList() {
    patients.value = [];
    patientsError.value = false;
  }

  watch(patientSearchTerm, (term) => {
    if (patientSearchTimer) clearTimeout(patientSearchTimer);
    patientSearchTimer = setTimeout(() => {
      void runPatientSearch(term);
    }, debounceMs);
  });

  onUnmounted(() => {
    if (patientSearchTimer) clearTimeout(patientSearchTimer);
  });

  return {
    patients,
    patientsLoading,
    patientsError,
    patientSearchTerm,
    runPatientSearch,
    loadPatients,
    resetPatientPickerList,
  };
}
