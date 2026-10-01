/**
 * Interdit les couleurs en dur (hex, rgb/rgba, hsl/hsla) hors de `src/theme/`.
 * Toute couleur passe par le thème (`t.colors.*`, `palette.*`, `hexToRgba`).
 */
const RAW_COLOR = /^\s*(#[0-9a-f]{3,8}|(rgba?|hsla?)\s*\()/i;

function isThemeFile(filename) {
  return /\/src\/theme\//.test(filename.replace(/\\/g, '/'));
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw color literals outside src/theme',
    },
    schema: [],
    messages: {
      rawColor:
        'Couleur en dur « {{value}} » : utilisez le thème (t.colors.*, palette.*, hexToRgba) ou ajoutez le token dans src/theme/.',
    },
  },
  create(context) {
    if (isThemeFile(context.filename)) return {};

    function check(node, value) {
      if (typeof value === 'string' && RAW_COLOR.test(value)) {
        context.report({ node, messageId: 'rawColor', data: { value: value.trim().slice(0, 32) } });
      }
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateLiteral(node) {
        if (node.quasis.length > 0) check(node, node.quasis[0].value.cooked);
      },
    };
  },
};
