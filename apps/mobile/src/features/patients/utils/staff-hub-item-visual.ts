import {
  Camera,
  CreditCard,
  FileText,
  FlaskConical,
  MessageCircle,
  Shield,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';

/** Icônes neutres du hub Patients : le type se lit à la forme, la couleur reste réservée au statut. */
const DOCUMENT_ICONS: Record<string, LucideIcon> = {
  carte_vitale: CreditCard,
  carte_mutuelle: Shield,
  ordonnance: FileText,
  autres_assurances: FileText,
  resultats: FlaskConical,
  care_photo: Camera,
  cancellation_photo: Camera,
};

export function hubDocumentIcon(documentType: string): LucideIcon {
  return DOCUMENT_ICONS[documentType] ?? FileText;
}

export const HUB_EXCHANGE_ICON: LucideIcon = MessageCircle;
export const HUB_RELATIVE_ICON: LucideIcon = UserRound;
