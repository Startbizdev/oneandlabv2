import {
  Camera,
  CreditCard,
  FileText,
  FlaskConical,
  MessageCircle,
  Shield,
  type LucideIcon,
} from 'lucide-react-native';
import type { AppColors } from '@/theme/colors';

export type HubItemVisual = {
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
};

function docVisuals(c: AppColors): Record<string, HubItemVisual> {
  return {
    carte_vitale: {
      Icon: CreditCard,
      iconColor: c.success,
      iconBg: c.successLight,
    },
    carte_mutuelle: {
      Icon: Shield,
      iconColor: c.primary,
      iconBg: c.primaryLight,
    },
    ordonnance: {
      Icon: FileText,
      iconColor: c.warning,
      iconBg: c.warningLight,
    },
    autres_assurances: {
      Icon: FileText,
      iconColor: c.warning,
      iconBg: c.warningLight,
    },
    resultats: {
      Icon: FlaskConical,
      iconColor: c.primaryDark,
      iconBg: c.primaryLight,
    },
    care_photo: {
      Icon: Camera,
      iconColor: c.primary,
      iconBg: c.primaryLight,
    },
    cancellation_photo: {
      Icon: Camera,
      iconColor: c.error,
      iconBg: c.errorLight,
    },
    other: {
      Icon: FileText,
      iconColor: c.textSecondary,
      iconBg: c.surfaceSubtle,
    },
  };
}

export function hubDocumentVisual(documentType: string, c: AppColors): HubItemVisual {
  const visuals = docVisuals(c);
  return visuals[documentType] ?? visuals.other;
}

export function hubExchangeVisual(c: AppColors): HubItemVisual {
  return {
    Icon: MessageCircle,
    iconColor: c.primary,
    iconBg: c.primaryLight,
  };
}
