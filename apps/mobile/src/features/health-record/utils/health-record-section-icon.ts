import {
  Apple,
  Baby,
  Bandage,
  ClipboardList,
  Dna,
  Flower2,
  HeartPulse,
  Leaf,
  Pill,
  Ruler,
  type LucideIcon,
} from 'lucide-react-native';

/** Icône par section du carnet de santé (`section_id` de `HealthRecordSchema`). */
const SECTION_ICON: Record<string, LucideIcon> = {
  general: Ruler,
  cardio: HeartPulse,
  metabolic: Apple,
  allergies: Flower2,
  treatments: Pill,
  lifestyle: Leaf,
  surgical: Bandage,
  family: Dna,
  gynecology: Baby,
};

export function healthRecordSectionIcon(sectionId: string): LucideIcon {
  return SECTION_ICON[sectionId] ?? ClipboardList;
}
