#!/usr/bin/env node
/**
 * Remplace flexDirection: 'row' inline par des spreads layoutRow* (fichiers autorisés).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

/** [fileRel, oldBlock, newBlock, imports[]] */
const REPLACEMENTS = [
  [
    'components/navigation/LiquidGlassTabHeader.tsx',
    `    row: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },`,
    `    row: {
      flex: 1,
      ...layoutRowCenter(8),
    },`,
    ['layoutRowCenter'],
  ],
  [
    'components/ui/DetailTabBar.tsx',
    `      minWidth: 0,
      width: '100%' as const,
      flexDirection: 'row' as const,
      gap: spacing[1],`,
    `      width: '100%' as const,
      ...layoutRowCenter(spacing[1]),`,
    ['layoutRowCenter'],
  ],
  [
    'components/ui/sheet-keyboard-accessory.tsx',
    `  bar: {
    minWidth: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',`,
    `  bar: {
    ...layoutRowEndActions(),`,
    ['layoutRowEndActions'],
  ],
  [
    'features/ai-hub/components/PatientAiVoiceOverlay.tsx',
    `    dockWaveRow: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 3,`,
    `    dockWaveRow: {
      ...layoutRowCenterAll(3),`,
    ['layoutRowCenterAll'],
  ],
  [
    'features/health-record/components/ClinicalVitalEditSheet.tsx',
    `    typeGrid: {
      minWidth: 0,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[2],
    },`,
    `    typeGrid: {
      ...layoutRowWrap(spacing[2]),
    },`,
    ['layoutRowWrap'],
  ],
  [
    'features/health-record/components/ClinicalVitalHistorySheet.tsx',
    `    row: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],`,
    `    row: {
      ...layoutRowCenter(spacing[2]),`,
    ['layoutRowCenter', 'layoutRowBetween'],
  ],
  [
    'features/health-record/components/ClinicalVitalHistorySheet.tsx',
    `    rowTop: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[2],
    },`,
    `    rowTop: {
      ...layoutRowBetween(spacing[2]),
    },`,
    ['layoutRowCenter', 'layoutRowBetween'],
  ],
  [
    'features/health-record/components/ClinicalVitalsPanel.tsx',
    `    grid: {
      minWidth: 0,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginHorizontal: -(gap / 2),
    },`,
    `    grid: {
      ...layoutRowWrap(0),
      marginHorizontal: -(gap / 2),
    },`,
    ['layoutRowWrap', 'layoutRowBaselineWrap'],
  ],
  [
    'features/health-record/components/ClinicalVitalsPanel.tsx',
    `    valueRow: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      flexWrap: 'wrap' as const,
      gap: 3,
    },`,
    `    valueRow: {
      ...layoutRowBaselineWrap(3),
    },`,
    ['layoutRowWrap', 'layoutRowBaselineWrap'],
  ],
  [
    'features/health-sync/components/HealthInsightCards.tsx',
    `    cardHeader: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
    },`,
    `    cardHeader: {
      ...layoutRowCenter(spacing[2]),
    },`,
    ['layoutRowCenter'],
  ],
  [
    'features/health-sync/components/HealthMetricChart.tsx',
    `    header: {
      minWidth: 0,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-end' as const,
      marginBottom: spacing[3],
      gap: spacing[3],
    },`,
    `    header: {
      ...layoutRowEndBetween(spacing[3]),
      marginBottom: spacing[3],
    },`,
    ['layoutRowEndBetween'],
  ],
  [
    'features/health-sync/components/HealthSyncStatusCard.tsx',
    `    badge: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1],`,
    `    badge: {
      ...layoutRowCenter(spacing[1]),`,
    ['layoutRowCenter'],
  ],
  [
    'features/nurse-passage/components/PassageCareSection.tsx',
    `    careRow: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[2],`,
    `    careRow: {
      ...layoutRowBetween(spacing[2]),`,
    ['layoutRowBetween', 'layoutRowCenter'],
  ],
  [
    'features/nurse-passage/components/PassageCareSection.tsx',
    `    pickerRow: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],`,
    `    pickerRow: {
      ...layoutRowCenter(spacing[3]),`,
    ['layoutRowBetween', 'layoutRowCenter'],
  ],
  [
    'features/nurse-passage/components/PassageFab.tsx',
    `    btn: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[2],`,
    `    btn: {
      ...layoutRowCenterAll(spacing[2]),`,
    ['layoutRowCenterAll'],
  ],
  [
    'features/nurse-passage/components/PassageFormDurationSheet.tsx',
    `    option: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,`,
    `    option: {
      ...layoutRowBetween(),`,
    ['layoutRowBetween'],
  ],
  [
    'features/nurse-passage/components/PassageFormLocationSheet.tsx',
    `    option: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[3],`,
    `    option: {
      ...layoutRowBetween(spacing[3]),`,
    ['layoutRowBetween'],
  ],
  [
    'features/nurse-passage/components/PassageFormTimeSheet.tsx',
    `    presetWrap: {
      minWidth: 0,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[1.5],
    },`,
    `    presetWrap: {
      ...layoutRowWrap(spacing[1.5]),
    },`,
    ['layoutRowWrap'],
  ],
  [
    'features/nurse-passage/components/PassageMultiDateCalendar.tsx',
    `    grid: {
      minWidth: 0,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
    },`,
    `    grid: {
      ...layoutRowWrap(0),
    },`,
    ['layoutRowWrap'],
  ],
  [
    'features/nurse-passage/components/PassageWeekdayChips.tsx',
    `    row: {
      minWidth: 0,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[2],
    },`,
    `    row: {
      ...layoutRowWrap(spacing[2]),
    },`,
    ['layoutRowWrap'],
  ],
  [
    'features/nurse-passage/components/TourViewTabs.tsx',
    `    row: {
      minWidth: 0,
      flexDirection: 'row' as const,
      gap: spacing[2],
      marginBottom: spacing[2],
    },`,
    `    row: {
      ...layoutRow(spacing[2]),
      marginBottom: spacing[2],
    },`,
    ['layoutRow'],
  ],
  [
    'features/nurse/components/NurseTourBanner.tsx',
    `    card: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],`,
    `    card: {
      ...layoutRowCenter(spacing[3]),`,
    ['layoutRowCenter'],
  ],
  [
    'features/patient-absence/components/PatientAbsenceSheet.tsx',
    `    historyRowHeader: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[2],
    },`,
    `    historyRowHeader: {
      ...layoutRowBetween(spacing[2]),
    },`,
    ['layoutRowBetween'],
  ],
  [
    'features/prescriptions/components/PrescriptionComposer.tsx',
    `    signRow: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingVertical: spacing[1],
    },`,
    `    signRow: {
      ...layoutRowCenter(spacing[2]),
      paddingVertical: spacing[1],
    },`,
    ['layoutRowCenter'],
  ],
  [
    'features/prescriptions/components/PrescriptionComposer.tsx',
    `    signMeta: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2.5],
    },`,
    `    signMeta: {
      flex: 1,
      ...layoutRowCenter(spacing[2.5]),
    },`,
    ['layoutRowCenter'],
  ],
  [
    'features/prescriptions/components/PrescriptionPatientSelectField.tsx',
    `    actions: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
    },`,
    `    actions: {
      ...layoutRowCenter(spacing[2]),
    },`,
    ['layoutRowCenter'],
  ],
  [
    'features/prescriptions/components/PrescriptionProfileGapsAlert.tsx',
    `    row: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: spacing[1.5],
      minWidth: 0,`,
    `    row: {
      ...layoutRowWrap(spacing[1.5]),
      alignItems: 'center' as const,`,
    ['layoutRowWrap'],
  ],
  [
    'features/profile/components/ProfilePrescriptionSignatureSection.tsx',
    `    actions: {
    minWidth: 0, flexDirection: 'row' as const, gap: spacing[2], flexWrap: 'wrap' as const },`,
    `    actions: {
      ...layoutRowWrap(spacing[2]),
    },`,
    ['layoutRowWrap'],
  ],
  [
    'features/qr/screens/QrCodeScreen.tsx',
    `    statsRow: {
      minWidth: 0,
      flexDirection: 'row' as const,
      gap: spacing[2],
    },`,
    `    statsRow: {
      ...layoutRow(spacing[2]),
    },`,
    ['layoutRow'],
  ],
  [
    'features/tournee-nurse/components/TourDayStrip.tsx',
    `    bar: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1],
    },`,
    `    bar: {
      ...layoutRowCenter(spacing[1]),
    },`,
    ['layoutRowCenter'],
  ],
  [
    'features/tournee-nurse/components/TourSortFilterSheet.tsx',
    `    option: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[3],`,
    `    option: {
      ...layoutRowBetween(spacing[3]),`,
    ['layoutRowBetween'],
  ],
  [
    'features/tournee-nurse/components/TourStopRouteChip.tsx',
    `    chip: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-end' as const,`,
    `    chip: {
      ...layoutRowCenter(),
      alignSelf: 'flex-end' as const,`,
    ['layoutRowCenter'],
  ],
  [
    'features/tournee-nurse/components/TourSummaryCard.tsx',
    `    metrics: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[1.5],`,
    `    metrics: {
      ...layoutRowWrap(spacing[1.5]),
      alignItems: 'center' as const,`,
    ['layoutRowWrap'],
  ],
  [
    'features/tournee/screens/TourneeScreen.tsx',
    `    toolBtn: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],`,
    `    toolBtn: {
      ...layoutRowCenter(spacing[2]),`,
    ['layoutRowCenter'],
  ],
];

function ensureImport(content, names) {
  const unique = [...new Set(names)];
  const importLine = `import { ${unique.join(', ')} } from '@/theme/layout-styles';`;
  if (content.includes("from '@/theme/layout-styles'")) {
    const m = content.match(/import\s*\{([^}]+)\}\s*from\s*'@\/theme\/layout-styles'/);
    if (m) {
      const existing = m[1].split(',').map((s) => s.trim()).filter(Boolean);
      const merged = [...new Set([...existing, ...unique])].sort();
      return content.replace(m[0], `import { ${merged.join(', ')} } from '@/theme/layout-styles'`);
    }
  }
  const firstImport = content.match(/^import .+$/m);
  if (firstImport) {
    return content.replace(firstImport[0], `${importLine}\n${firstImport[0]}`);
  }
  return `${importLine}\n${content}`;
}

let changed = 0;
for (const [rel, oldBlock, newBlock, imports] of REPLACEMENTS) {
  const filePath = path.join(SRC, rel);
  if (!fs.existsSync(filePath)) {
    console.warn('skip missing', rel);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(oldBlock)) {
    console.warn('pattern not found in', rel);
    continue;
  }
  content = content.replace(oldBlock, newBlock);
  content = ensureImport(content, imports);
  fs.writeFileSync(filePath, content);
  changed++;
  console.log('fixed', rel);
}

// PassageDetailScreen — bloc multiligne atypique
const passageDetail = path.join(SRC, 'features/nurse-passage/screens/PassageDetailScreen.tsx');
if (fs.existsSync(passageDetail)) {
  let content = fs.readFileSync(passageDetail, 'utf8');
  const oldBlock = `      minWidth: 0,

      flexDirection: 'row' as const,

      alignItems: 'center' as const,

      gap: spacing[1.5],`;
  const newBlock = `      ...layoutRowCenter(spacing[1.5]),`;
  if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    content = ensureImport(content, ['layoutRowCenter']);
    fs.writeFileSync(passageDetail, content);
    changed++;
    console.log('fixed PassageDetailScreen.tsx');
  } else {
    console.warn('PassageDetailScreen pattern not found');
  }
}

// CaryMarkdown — inline style
const caryMd = path.join(SRC, 'features/ai-hub/components/CaryMarkdown.tsx');
if (fs.existsSync(caryMd)) {
  let content = fs.readFileSync(caryMd, 'utf8');
  const oldInline = `<View key={\`li-${'${blockIndex}-${itemIndex}'}\`} style={{
    minWidth: 0, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>`;
  const oldInline2 = `<View key={\`li-\${blockIndex}-\${itemIndex}\`} style={{
    minWidth: 0, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>`;
  const newInline = `<Row key={\`li-\${blockIndex}-\${itemIndex}\`} gap={8} align="start" style={{ minWidth: 0 }}>`;
  if (content.includes('flexDirection: \'row\', gap: 8')) {
    content = content.replace(
      /<View key=\{`li-\$\{blockIndex\}-\$\{itemIndex\}`\} style=\{\{\s*minWidth: 0, flexDirection: 'row', gap: 8, alignItems: 'flex-start' \}\}>/,
      newInline,
    );
    content = content.replace('</View>', '</Row>'); // risky - only first? 
    // Better targeted replace
  }
}

console.log(`\n${changed} replacements applied`);
