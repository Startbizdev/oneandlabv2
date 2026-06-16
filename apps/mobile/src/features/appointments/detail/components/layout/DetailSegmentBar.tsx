import {
  ClipboardList,
  FileText,
  MessageCircle,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { DetailTabBar } from '@/components/ui/DetailTabBar';

const SEGMENT_ICONS: Record<string, LucideIcon> = {
  infos: ClipboardList,
  documents: FileText,
  photos: MessageCircle,
  exchange: MessageCircle,
  avis: Star,
};

export type DetailSegment = {
  id: string;
  label: string;
  badge?: number;
  Icon?: LucideIcon;
};

interface Props {
  segments: DetailSegment[];
  active: string;
  onChange: (id: string) => void;
}

/** Onglets fiche RDV — délègue à `DetailTabBar` (pleine largeur, tokens design system). */
export function DetailSegmentBar({ segments, active, onChange }: Props) {
  const tabs = segments.map((s) => ({
    id: s.id,
    label: s.label,
    badge: s.badge,
    Icon: s.Icon ?? SEGMENT_ICONS[s.id],
  }));

  return (
    <DetailTabBar
      tabs={tabs}
      value={active}
      onChange={onChange}
      accessibilityLabel="Sections du rendez-vous"
    />
  );
}
