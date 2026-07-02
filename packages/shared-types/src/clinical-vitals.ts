export type ClinicalVitalType =
  | 'blood_pressure'
  | 'heart_rate'
  | 'temperature'
  | 'spo2'
  | 'blood_glucose'
  | 'respiratory_rate'
  | 'pain_scale';

export type ClinicalVitalContextType = 'passage' | 'appointment' | 'general';

export interface ClinicalVitalTypeCatalogItem {
  type: ClinicalVitalType;
  label_fr: string;
  unit: string;
  has_secondary: boolean;
}

export interface ClinicalVitalReading {
  id: string;
  patient_id: string;
  vital_type: ClinicalVitalType;
  label_fr: string;
  value: number;
  value_secondary?: number | null;
  unit: string;
  display: string;
  notes?: string | null;
  recorded_at: string;
  recorded_by: { id: string; name?: string | null };
  context_type?: ClinicalVitalContextType | null;
  context_id?: string | null;
}

export interface ClinicalVitalsHistoryResponse {
  vital_type: ClinicalVitalType;
  label_fr: string;
  unit: string;
  history: ClinicalVitalReading[];
}

export interface ClinicalVitalsListResponse {
  catalog: ClinicalVitalTypeCatalogItem[];
  latest_by_type: Partial<Record<ClinicalVitalType, ClinicalVitalReading>>;
  recent: ClinicalVitalReading[];
}

export interface ClinicalVitalInput {
  vital_type: ClinicalVitalType;
  value: number;
  value_secondary?: number | null;
  notes?: string | null;
  recorded_at?: string;
  context_type?: ClinicalVitalContextType | null;
  context_id?: string | null;
}

export interface ClinicalVitalContext {
  type: ClinicalVitalContextType;
  id?: string;
}

/** Config UI partagée mobile / web */
export const CLINICAL_VITAL_UI: Array<
  ClinicalVitalTypeCatalogItem & { emoji: string; card_label_fr: string }
> = [
  {
    type: 'blood_pressure',
    label_fr: 'Tension artérielle',
    card_label_fr: 'Tension',
    unit: 'mmHg',
    has_secondary: true,
    emoji: '🩺',
  },
  {
    type: 'heart_rate',
    label_fr: 'Fréquence cardiaque',
    card_label_fr: 'FC',
    unit: 'bpm',
    has_secondary: false,
    emoji: '💓',
  },
  {
    type: 'temperature',
    label_fr: 'Température',
    card_label_fr: 'Temp.',
    unit: '°C',
    has_secondary: false,
    emoji: '🌡️',
  },
  {
    type: 'spo2',
    label_fr: 'Saturation en oxygène',
    card_label_fr: 'SpO₂',
    unit: '%',
    has_secondary: false,
    emoji: '🫁',
  },
  {
    type: 'blood_glucose',
    label_fr: 'Glycémie',
    card_label_fr: 'Glycémie',
    unit: 'g/L',
    has_secondary: false,
    emoji: '🩸',
  },
  {
    type: 'respiratory_rate',
    label_fr: 'Fréquence respiratoire',
    card_label_fr: 'FR',
    unit: '/min',
    has_secondary: false,
    emoji: '💨',
  },
  {
    type: 'pain_scale',
    label_fr: 'Douleur (EVA)',
    card_label_fr: 'Douleur',
    unit: '/10',
    has_secondary: false,
    emoji: '😣',
  },
];

export function clinicalVitalUiConfig(type: ClinicalVitalType) {
  return CLINICAL_VITAL_UI.find((c) => c.type === type);
}
