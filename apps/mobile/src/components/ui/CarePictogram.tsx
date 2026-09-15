import { Bandage, Droplet, HeartPulse, ShowerHead, Stethoscope, Syringe } from 'lucide-react-native';
import { careSymbol } from '@oneandlab/shared-utils';
import { useAppColors } from '@/theme/use-app-colors';

const symbols = { droplet: Droplet, syringe: Syringe, bandage: Bandage, 'heart-pulse': HeartPulse, 'shower-head': ShowerHead, stethoscope: Stethoscope };

export function CarePictogram({ label, type, size = 16 }: { label: string; type?: string; size?: number }) {
  const c = useAppColors();
  const Icon = symbols[careSymbol({ name: label, type })];
  return <Icon size={size} color={c.textSecondary} strokeWidth={1.75} accessibilityElementsHidden importantForAccessibility="no" />;
}
