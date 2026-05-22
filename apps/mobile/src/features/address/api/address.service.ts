import { api } from '@/api/client';

/** Aligné backend/lib/GoogleAddressSearch.php resultToRow */
export interface AddressSuggestion {
  label: string;
  street?: string;
  city?: string;
  postcode?: string;
  lat: number;
  lng: number;
}

/** GET /ban/search — proxy Google Geocoding côté serveur (pas SDK mobile). */
export async function searchAddresses(query: string, limit = 10) {
  const q = encodeURIComponent(query.trim());
  return api.get<AddressSuggestion[]>(`/ban/search?q=${q}&limit=${limit}`);
}
