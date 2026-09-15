import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function walk(dir, extension) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path, extension));
    else if (entry.name.endsWith(extension)) files.push(path);
  }
  return files.sort();
}
const web = await walk(resolve(root, 'frontend/pages'), '.vue');
const mobile = await walk(resolve(root, 'apps/mobile/app'), '.tsx');
const components = await walk(resolve(root, 'frontend/components'), '.vue');
const native = await walk(resolve(root, 'apps/mobile/src'), '.tsx');
const resilienceSpec = await readFile(resolve(root, 'frontend/e2e/workspace-resilience.spec.ts'), 'utf8');
const errorRoutes = new Set([...resilienceSpec.matchAll(/'((?:admin|nurse|pro|lab|subaccount|preleveur|patient)\/[^']+)'/g)].map(match => '/' + match[1]));
const responsiveRoutes = new Set(['/patient', '/nurse/appointments/new', ...['admin', 'nurse', 'pro', 'lab', 'subaccount', 'preleveur'].map(role => `/${role}/appointments`)]);
const workflowRoutes = new Set(['/admin', '/admin/reviews', '/admin/calendar', '/nurse/patients', '/nurse/soins', '/nurse/reviews', '/lab/reviews', '/subaccount/reviews', '/subaccount/calendar', '/subaccount/preleveurs', '/patient/documents', '/nurse/abonnement', '/lab/abonnement']);
for (const route of ['/admin/appointments/[id]/edit', '/admin/logs', '/admin/qr-code', '/lab', '/subaccount', '/nurse/passage/new', '/nurse/passage/[seriesId]', '/patient/profile']) workflowRoutes.add(route);
for (const role of ['admin', 'lab', 'subaccount', 'nurse', 'pro', 'patient', 'preleveur']) workflowRoutes.add(`/${role}/appointments/[id]`);
for (const route of ['/login', '/forgot-password', '/reset-password', '/admin/ai', '/admin/appointments/notifications']) workflowRoutes.add(route);
for (const route of ['/admin/abonnements', '/admin/categories', '/admin/lab-brands', '/admin/inscriptions', '/admin/notifications']) workflowRoutes.add(route);
for (const route of ['/rendez-vous/nouveau', '/rendez-vous/paiement-reussi', '/p/rdv/[token]', '/qr/[token]']) workflowRoutes.add(route);
for (const role of ['patient', 'nurse', 'pro', 'preleveur']) workflowRoutes.add(`/${role}/onboarding`);
for (const role of ['admin', 'lab', 'subaccount', 'pro']) workflowRoutes.add(`/${role}/appointments/new`);
workflowRoutes.add('/patient/relatives');
for (const route of ['/admin/coverage', '/admin/dispatch', '/lab/stats', '/profile']) workflowRoutes.add(route);
const publicRoutes = new Set(['/', '/pour-les-infirmiers/tarifs', '/pour-les-laboratoires/tarifs', '/infirmiers/ville/[ville]', '/laboratoires/ville/[ville]', '/infirmier/[slug]', '/Laboratoire/[slug]', '/professionnel/[slug]']);
publicRoutes.add('/infirmiers');
publicRoutes.add('/laboratoires');
for (const route of ['/pour-les-infirmiers', '/pour-les-laboratoires', '/pour-les-professionnels', '/pour-les-patients', '/contact', '/mentions-legales', '/politique-confidentialite', '/cgv', '/nurse/register', '/lab/register', '/pro/register', '/patient/register', '/register/merci']) responsiveRoutes.add(route);
const lines = [
  '# Inventaire de la surface UI', '',
  'Généré par `node scripts/audit-ui-surface.mjs`. Un fichier inventorié ne signifie pas que sa refonte ou sa recette est terminée.', '',
  `${web.length} pages web · ${mobile.length} fichiers de routage mobile · ${components.length} composants Vue · ${native.length} composants/écrans TSX mobiles.`, '',
  'Les scénarios ci-dessous sont présents dans les fichiers de tests ; leurs derniers résultats sont consignés dans etat-et-risques.md. Un scénario ne couvre pas toutes les actions d’une page.', '',
  '## Pages web', '', '| Fichier | Layout déclaré | Scénarios automatisés existants | Recette complète |', '|---|---|---|---|',
];
for (const file of web) {
  const source = await readFile(file, 'utf8');
  const layout = source.match(/layout:\s*['"]([^'"]+)['"]/)?.[1] ?? 'défaut / délégué';
  const route = '/' + relative(resolve(root, 'frontend/pages'), file).replaceAll('\\', '/').replace(/\.vue$/, '').replace(/(^|\/)index$/, '');
  const normalized = route.replace(/\/$/, '') || '/';
  const checks = [errorRoutes.has(normalized) && 'API indisponible', responsiveRoutes.has(normalized) && 'responsive/navigation', workflowRoutes.has(normalized) && 'parcours avec données', publicRoutes.has(normalized) && 'public/SEO/responsive'].filter(Boolean);
  lines.push(`| ${relative(root, file).replaceAll('\\', '/')} | ${layout} | ${checks.join(' · ') || 'À ajouter'} | Restante |`);
}
lines.push('', '## Routage mobile', '', '| Fichier | Recette sur appareil |', '|---|---|');
for (const file of mobile) lines.push(`| ${relative(root, file).replaceAll('\\', '/')} | À vérifier |`);
lines.push('', '## Composants web', '', ...components.map(file => `- ${relative(root, file).replaceAll('\\', '/')}`));
lines.push('', '## Composants et écrans mobiles', '', ...native.map(file => `- ${relative(root, file).replaceAll('\\', '/')}`));
await mkdir(resolve(root, 'docs/refonte-2026'), { recursive: true });
await writeFile(resolve(root, 'docs/refonte-2026/inventaire.md'), lines.join('\n') + '\n');
console.log({ webPages: web.length, mobileRouteFiles: mobile.length, webComponents: components.length, nativeComponents: native.length });
