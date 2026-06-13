import type { PrescriptionLinkMode } from '../api/prescriptions.service';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { CalendarDays, FilePenLine } from 'lucide-react-native';

const TABS = [
  { id: 'standalone' as const, label: 'Sans RDV', Icon: FilePenLine },
  { id: 'appointment' as const, label: 'Liée au RDV', Icon: CalendarDays },
];

interface Props {
  value: PrescriptionLinkMode;
  onChange: (mode: PrescriptionLinkMode) => void;
}

export function PrescriptionLinkModeTabs({ value, onChange }: Props) {
  return (
    <FullWidthSegmentBar
      segments={TABS}
      value={value}
      onChange={onChange}
    />
  );
}
