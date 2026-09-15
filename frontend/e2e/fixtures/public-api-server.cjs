// Synthetic public profiles for SSR verification. No authentication or real data.
const http = require('node:http');
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:8889');
  response.setHeader('Content-Type', 'application/json');
  if (url.pathname === '/api/qr/resolve') {
    const token = url.searchParams.get('token');
    if (token !== 'fixture-qr') {
      response.writeHead(404);
      return response.end(JSON.stringify({ success: false, error: 'QR introuvable' }));
    }
    return response.end(JSON.stringify({ success: true, data: { redirect_url: 'https://cary.bio/rendez-vous/nouveau?qr=fixture-qr&assigned_nurse_id=fixture-nurse' } }));
  }
  const profileMatch = url.pathname.match(/^\/api\/public\/(nurse|lab|pro)\/([^/]+)$/);
  if (profileMatch) {
    const [, kind, slug] = profileMatch;
    if (slug === 'fixture-missing') {
      response.writeHead(404);
      return response.end(JSON.stringify({ success: false, error: 'Profil introuvable' }));
    }
    if (slug === 'fixture-old') return response.end(JSON.stringify({ success: true, redirect: true, new_slug: 'fixture-profile' }));
    return response.end(JSON.stringify({ success: true, data: {
      id: 'fixture-profile', first_name: 'Camille', last_name: 'Exemple', name: 'Camille Exemple',
      role: kind === 'lab' ? 'subaccount' : kind, city_plain: 'Paris', address: 'Paris',
      biography: 'Présentation fictive pour la recette.', is_accepting_appointments: true,
      reviews: { stats: { total_reviews: 0, average_rating: 0 } }, specializations: [{ id: 'fixture-care', name: 'Soin de suivi', type: 'nursing', icon: 'syringe', image_url: '/api/old-care.png' }], services: [{ id: 'fixture-care', name: 'Prélèvement', type: 'blood_test', icon: 'syringe', image_url: '/api/old-care.png' }],
    } }));
  }
  if (!['/api/public/nurses', '/api/public/labs'].includes(url.pathname)) {
    response.writeHead(404);
    return response.end(JSON.stringify({ success: false, error: 'Unknown fixture' }));
  }
  if (url.searchParams.get('city') === 'fixture-error') {
    response.writeHead(503);
    return response.end(JSON.stringify({ success: false, error: 'Fixture unavailable' }));
  }
  response.end(JSON.stringify({ success: true, data: [{ id: 'fixture-directory', slug: 'fixture-profile', name: 'Camille Exemple', city: 'Paris', presentation: 'Présentation fictive pour la recette.', reviews_count: 2, average_rating: 4.5 }], pagination: { page: 1, pages: 2, total: 25 } }));
}).listen(8889, '127.0.0.1', () => console.log('Synthetic public API on 127.0.0.1:8889'));
