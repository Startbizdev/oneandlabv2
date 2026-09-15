export default defineEventHandler((event) => {
  const origin = String(useRuntimeConfig(event).public.siteUrl || 'https://cary.bio').replace(/\/$/, '');
  const paths = ['/', '/infirmiers', '/laboratoires', '/pour-les-patients', '/pour-les-infirmiers', '/pour-les-infirmiers/tarifs', '/pour-les-laboratoires', '/pour-les-laboratoires/tarifs', '/pour-les-professionnels', '/contact'];
  const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${escapeXml(origin + path)}</loc></url>`).join('')}</urlset>`;
});
