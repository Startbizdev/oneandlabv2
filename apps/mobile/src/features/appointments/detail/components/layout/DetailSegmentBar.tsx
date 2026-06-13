import {
  ClipboardList,
  FileText,
  MessageCircle,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';

const SEGMENT_ICONS: Record<string, LucideIcon> = {
  infos: ClipboardList,
  documents: FileText,
  photos: MessageCircle,
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

/** Onglets type segmented control (pleine largeur). */
export function DetailSegmentBar({ segments, active, onChange }: Props) {
  const mapped = segments.map((s) => ({
    id: s.id,
    label: s.label,
    badge: s.badge,
    Icon: s.Icon ?? SEGMENT_ICONS[s.id],
  }));

  return (
    <FullWidthSegmentBar
      segments={mapped}
      value={active}
      onChange={onChange}
    />
  );
}
