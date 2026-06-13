/**
 * Interdit l'import du proxy `colors` dans les composants React.
 * Réservé à la config navigation statique.
 */
const ALLOWED = new Set([
  'navigation/screen-options.ts',
  'components/navigation/header-layout.ts',
  'theme/colors.ts',
  'theme/index.ts',
]);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow importing deprecated static colors proxy in React components',
    },
    schema: [],
    messages: {
      staticColors:
        'N\'importez pas `colors` — utilisez useAppColors() dans les composants React (colors réservé à la config navigation).',
    },
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, '/');
    const rel = filename.includes('/src/')
      ? filename.slice(filename.indexOf('/src/') + 5)
      : filename;

    if (ALLOWED.has(rel)) return {};

    return {
      ImportDeclaration(node) {
        const src = node.source && node.source.value;
        if (src !== '@/theme' && src !== '@/theme/colors') return;

        for (const spec of node.specifiers) {
          if (
            spec.type === 'ImportSpecifier' &&
            spec.imported &&
            spec.imported.name === 'colors'
          ) {
            context.report({ node: spec, messageId: 'staticColors' });
          }
        }
      },
    };
  },
};
