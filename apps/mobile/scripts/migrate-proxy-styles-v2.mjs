/**
 * Migre les Proxy restants (multiline getThemedStyles, forwardRef, etc.)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const TARGETS = [
  'components/ui/Input.tsx',
  'components/ui/Textarea.tsx',
  'components/ui/FilterOptionChips.tsx',
  'features/notifications/components/NotificationCard.tsx',
  'features/lab-results/components/LabResultListCard.tsx',
  'features/appointments/components/AppointmentsFilterSheet.tsx',
  'features/patients/screens/PatientDetailScreen.tsx',
  'features/profile/components/MoreMenuItem.tsx',
  'features/appointments/form/components/BookingCareSelectionHeaderTitle.tsx',
  'features/appointments/detail/components/patient/PatientEngagementSections.tsx',
  'features/appointments/form/components/SelectedServicesDetailSheet.tsx',
  'features/appointments/detail/components/patient/PatientReviewPromptSheet.tsx',
  'features/appointments/detail/components/patient/PatientCompletedReviewPrompt.tsx',
  'features/patient/screens/PatientReviewsScreen.tsx',
  'utils/appointment-list-card-styles.ts',
];

function migrate(fileRel) {
  const filePath = path.join(SRC, fileRel);
  if (!fs.existsSync(filePath)) return { fileRel, status: 'missing' };

  let src = fs.readFileSync(filePath, 'utf8');
  if (!src.includes('new Proxy')) return { fileRel, status: 'no-proxy' };

  const idMatch = src.match(/getThemedStyles\(\s*(?:\n\s*)?['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/);
  if (!idMatch) return { fileRel, status: 'no-id' };
  const [, contextId, factoryName] = idMatch;

  src = src.replace(/\nconst styles = new Proxy\([\s\S]*?\}\)\s*;\s*$/m, '\n');

  if (!src.includes('useThemedStyles')) {
    src = src.replace(
      /import \{ getThemedStyles \} from '@\/theme\/use-themed-styles';/,
      "import { useThemedStyles } from '@/theme/use-themed-styles';",
    );
  }

  const hookLine = `  const styles = useThemedStyles(${factoryName}, '${contextId}');\n`;

  const insertTargets = [
    /((?:export const \w+ = React\.memo\(function \w+|export function \w+|function \w+Component)\([^)]*\)\s*\{)/,
    /((?:export const \w+ = React\.memo\(function \w+|export function \w+|function \w+Component)\(\{[\s\S]*?\}\s*:\s*\w+\)\s*\{)/,
  ];

  let inserted = false;
  for (const re of insertTargets) {
    if (src.includes('useThemedStyles(' + factoryName)) {
      inserted = true;
      break;
    }
    const m = src.match(re);
    if (m) {
      src = src.replace(re, `$1\n${hookLine}`);
      inserted = true;
      break;
    }
  }

  if (!inserted && fileRel.includes('appointment-list-card-styles')) {
    src = src.replace(
      /(export function getAppointmentListCardStyles\(\)\s*\{)/,
      `$1\n  return useThemedStyles(${factoryName}, '${contextId}');\n}`,
    );
    // special case - read file first
  }

  if (!inserted) return { fileRel, status: 'insert-failed' };

  fs.writeFileSync(filePath, src);
  return { fileRel, status: 'ok' };
}

for (const t of TARGETS) {
  console.log(migrate(t));
}
