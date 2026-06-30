import type { InjectionKey, Ref, ComputedRef } from 'vue';
import type { CareAccent, CareCategoryRowMinimal } from '~/utils/care-icons';

export type PatientRdvListCareContext = {
  careCategoriesList: Ref<CareCategoryRowMinimal[]>;
  patientCategoryAccentMap: ComputedRef<ReadonlyMap<string, CareAccent>>;
};

export const patientRdvListCareKey: InjectionKey<PatientRdvListCareContext> = Symbol('patientRdvListCare');
