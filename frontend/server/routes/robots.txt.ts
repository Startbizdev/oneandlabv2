export default defineEventHandler((event) => {
  const origin = String(useRuntimeConfig(event).public.siteUrl || 'https://cary.bio').replace(/\/$/, '');
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  return [
    'User-agent: *', 'Allow: /',
    ...['admin', 'nurse', 'pro', 'lab', 'subaccount', 'preleveur', 'patient', 'profile', 'rendez-vous', 'api'].map(path => `Disallow: /${path}/`),
    'Disallow: /login', `Sitemap: ${origin}/sitemap.xml`, '',
  ].join('\n');
});
