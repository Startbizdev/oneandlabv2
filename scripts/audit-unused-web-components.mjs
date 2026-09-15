import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parse } from '@vue/compiler-sfc';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontend = resolve(root, 'frontend');
const excluded = new Set(['node_modules', '.nuxt', '.output', '.git', 'test-results', 'playwright-report', 'e2e']);
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(file));
    else if (/\.(vue|ts|js|mjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) result.push(file);
  }
  return result;
}
const files = await walk(frontend);
function withoutScriptComments(source) {
  const ast = ts.createSourceFile('audit.ts', source, ts.ScriptTarget.Latest, true);
  if (ast.parseDiagnostics.length) return source;
  return ts.createPrinter({ removeComments: true }).printFile(ast);
}
const sources = new Map(await Promise.all(files.map(async file => {
  const source = await readFile(file, 'utf8');
  if (!file.endsWith('.vue')) return [file, withoutScriptComments(source)];
  const { descriptor } = parse(source, { filename: file });
  return [file, [descriptor.template?.content.replace(/<!--[\s\S]*?-->/g, '') || '', withoutScriptComments(descriptor.script?.content || ''), withoutScriptComments(descriptor.scriptSetup?.content || '')].join('\n')];
})));
const components = files.filter(file => relative(frontend, file).replaceAll('\\', '/').startsWith('components/') && file.endsWith('.vue'));
const edges = new Map(files.map(file => [file, new Set()]));
for (const component of components) {
  const name = basename(component, '.vue');
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const pattern = new RegExp(`\\b(?:Lazy)?${name}\\b|<\\/?(?:lazy-)?${kebab}(?:\\s|>|/)`);
  for (const [file, source] of sources) {
    if (file !== component && (pattern.test(source) || source.includes(basename(component)))) edges.get(file).add(component);
  }
}
// Every non-component source is retained as a conservative root, including composables.
const reachable = new Set(files.filter(file => !components.includes(file)));
const queue = [...reachable];
for (const file of queue) for (const dependency of edges.get(file) ?? []) {
  if (!reachable.has(dependency)) { reachable.add(dependency); queue.push(dependency); }
}
const candidates = components.filter(file => !reachable.has(file)).sort();
if (process.argv[2]) {
  const target = components.find(file => basename(file, '.vue') === process.argv[2]);
  console.log({ component: process.argv[2], referencedBy: [...edges].filter(([, dependencies]) => dependencies.has(target)).map(([file]) => relative(root, file)) });
}
const lines = ['# Composants web à examiner avant suppression', '',
  'Analyse statique conservatrice des références PascalCase, kebab-case, Lazy et imports de fichiers, hors commentaires. Nuxt utilise `pathPrefix: false`. Les références construites dynamiquement peuvent échapper à cette analyse : cette liste ne constitue pas une autorisation automatique de suppression.', '',
  'Aucun composant, script de synchronisation, script de migration, secret ou export historique n’est supprimé par cet outil. Les fichiers de configuration secrets ne sont pas lus.', '',
  `${candidates.length} candidats sur ${components.length} composants.`, '', '| Composant | Références depuis d’autres composants candidats |', '|---|---|'];
for (const file of candidates) {
  const callers = candidates.filter(candidate => edges.get(candidate)?.has(file)).map(candidate => basename(candidate));
  lines.push(`| ${relative(root, file).replaceAll('\\', '/')} | ${callers.join(', ') || 'Aucune'} |`);
}
await writeFile(resolve(root, 'docs/refonte-2026/composants-a-examiner.md'), lines.join('\n') + '\n');
console.log({ components: components.length, candidates: candidates.length });
