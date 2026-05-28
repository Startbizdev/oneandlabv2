import {
  Camera,
  CreditCard,
  FileText,
  FlaskConical,
  MessageCircle,
  Shield,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from '@/theme';

export type HubItemVisual = {
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
};

const DOC_VISUALS: Record<string, HubItemVisual> = {
  carte_vitale: {
    Icon: CreditCard,
    iconColor: colors.success,
    iconBg: colors.successLight,
  },
  carte_mutuelle: {
    Icon: Shield,
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
  },
  ordonnance: {
    Icon: FileText,
    iconColor: colors.warning,
    iconBg: colors.warningLight,
  },
  autres_assurances: {
    Icon: FileText,
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
  },
  resultats: {
    Icon: FlaskConical,
    iconColor: colors.primaryDark,
    iconBg: colors.primaryLight,
  },
  care_photo: {
    Icon: Camera,
    iconColor: '#DB2777',
    iconBg: '#FDF2F8',
  },
  cancellation_photo: {
    Icon: Camera,
    iconColor: colors.error,
    iconBg: colors.errorLight,
  },
  other: {
    Icon: FileText,
    iconColor: colors.textSecondary,
    iconBg: colors.surfaceSubtle,
  },
};

export function hubDocumentVisual(documentType: string): HubItemVisual {
  return DOC_VISUALS[documentType] ?? DOC_VISUALS.other;
}

export const hubExchangeVisual: HubItemVisual = {
  Icon: MessageCircle,
  iconColor: '#0D9488',
  iconBg: '#F0FDFA',
};
