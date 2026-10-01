import type { ClinicalVitalType } from '@oneandlab/shared-types';
import {
  Activity,
  Droplet,
  Frown,
  Gauge,
  HeartPulse,
  Thermometer,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';

/** Icône par constante clinique (les emojis du catalogue partagé restent réservés au web). */
const VITAL_ICON: Record<ClinicalVitalType, LucideIcon> = {
  blood_pressure: Gauge,
  heart_rate: HeartPulse,
  temperature: Thermometer,
  spo2: Activity,
  blood_glucose: Droplet,
  respiratory_rate: Wind,
  pain_scale: Frown,
};

export function clinicalVitalIcon(type: ClinicalVitalType): LucideIcon {
  return VITAL_ICON[type];
}
