import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, font, lh, spacing, useStyles, type Theme } from '@/theme';
import { parseInline } from '../utils/markdown';

/** Largeur relative d'une colonne d'après son texte le plus long (bornée : une colonne n'écrase pas les autres). */
export function columnWeights(header: string[], rows: string[][]): number[] {
  return header.map((title, col) => {
    const longest = Math.max(title.length, ...rows.map((row) => (row[col] ?? '').replace(/\*\*/g, '').length));
    return Math.min(Math.max(longest, 5), 28);
  });
}

function Cell({ text, weight, header, last, styles }: { text: string; weight: number; header: boolean; last: boolean; styles: Styles }) {
  return (
    <View style={[styles.cell, { flex: weight }, last && styles.lastCell]}>
      <AppText variant="secondary" style={header ? styles.headerText : styles.cellText}>
        {parseInline(text).map((segment, index) =>
          segment.bold ? (
            <AppText key={index} variant="secondary" style={[styles.cellText, styles.bold]}>
              {segment.text}
            </AppText>
          ) : (
            segment.text
          ),
        )}
      </AppText>
    </View>
  );
}

type Styles = ReturnType<typeof buildStyles>;

/** Tableau d'une réponse de Cary (cotation par passage) : en-tête discret, lignes séparées par un filet. */
export const MarkdownTable = memo(function MarkdownTable({ header, rows }: { header: string[]; rows: string[][] }) {
  const styles = useStyles(buildStyles);
  const weights = columnWeights(header, rows);
  const lastCol = header.length - 1;
  return (
    <View style={styles.table} accessibilityRole="summary">
      <View style={[styles.row, styles.headerRow]}>
        {header.map((title, col) => (
          <Cell key={col} text={title} weight={weights[col]} header last={col === lastCol} styles={styles} />
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, rowIndex < rows.length - 1 && styles.rowDivider]}>
          {header.map((_, col) => (
            <Cell key={col} text={row[col] ?? ''} weight={weights[col]} header={false} last={col === lastCol} styles={styles} />
          ))}
        </View>
      ))}
    </View>
  );
});

function buildStyles({ colors: c, fontSize }: Theme) {
  const cellText = { fontSize: fontSize.sm, lineHeight: lh(fontSize.sm, 1.45), color: c.textPrimary };
  return {
    table: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.cardBorder },
    row: { flexDirection: 'row' as const, paddingVertical: spacing[2.5], gap: spacing[3] },
    headerRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.cardBorder },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.cardBorder },
    cell: { minWidth: 0 },
    lastCell: { alignItems: 'flex-end' as const },
    headerText: { ...cellText, ...font.semiBold, color: c.textSecondary },
    cellText,
    bold: { ...font.semiBold },
  };
}
