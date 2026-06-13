/**
 * Interdit flexDirection: 'row' hors primitives / thème / UI de base.
 * Force l'usage de Row / Cluster / ListRowShell.
 */
const ALLOWED_PREFIXES = [
  'theme/',
  'components/layout/primitives.tsx',
  'components/ui/ListRowShell.tsx',
  'components/ui/StackCard.tsx',
  'components/ui/Button.tsx',
  'components/ui/FullWidthSegmentBar.tsx',
  'components/ui/FilterOptionChips.tsx',
  'components/ui/skeleton-presets.tsx',
  'theme/layout-styles.ts',
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw flexDirection row outside layout primitives (use Row / Cluster / ListRowShell)',
    },
    schema: [],
    messages: {
      rawRow:
        'Évitez flexDirection: "row" brut — utilisez Row, Cluster ou ListRowShell depuis @/components/layout/primitives ou @/components/ui/ListRowShell.',
    },
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, '/');
    const rel = filename.includes('/src/')
      ? filename.slice(filename.indexOf('/src/') + 5)
      : filename;

    if (ALLOWED_PREFIXES.some((p) => rel === p || rel.startsWith(p))) {
      return {};
    }

    return {
      Property(node) {
        if (
          node.key &&
          ((node.key.type === 'Identifier' && node.key.name === 'flexDirection') ||
            (node.key.type === 'Literal' && node.key.value === 'flexDirection'))
        ) {
          const val = node.value;
          if (val && val.type === 'Literal' && val.value === 'row') {
            context.report({ node, messageId: 'rawRow' });
          }
          if (
            val &&
            val.type === 'TSAsExpression' &&
            val.expression &&
            val.expression.type === 'Literal' &&
            val.expression.value === 'row'
          ) {
            context.report({ node, messageId: 'rawRow' });
          }
        }
      },
    };
  },
};
