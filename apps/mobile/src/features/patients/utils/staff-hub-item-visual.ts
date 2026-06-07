import {
  Camera,
  CreditCard,
  FileText,
  FlaskConical,
  MessageCircle,
  Shield,
  type LucideIcon,
} from 'lucide-react-native';
import { getAppColors } from '@/theme/colors';

export type HubItemVisual = {
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
};

function docVisuals(): Record<string, HubItemVisual> {
  const c = getAppColors();
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

export function hubDocumentVisual(documentType: string): HubItemVisual {
  return docVisuals()[documentType] ?? docVisuals().other;
}

export function hubExchangeVisual(): HubItemVisual {
  const c = getAppColors();
  return {
    Icon: MessageCircle,
    iconColor: c.primary,
    iconBg: c.primaryLight,
  };
}
