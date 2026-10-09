import type { AppointmentListFilters } from '@oneandlab/shared-types';

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  appointments: {
    all: ['appointments'] as const,
    calendar: (filters: AppointmentListFilters) => ['appointments', 'calendar', filters] as const,
    list: (filters: AppointmentListFilters) => ['appointments', 'list', filters] as const,
    infinite: (filters: AppointmentListFilters) => ['appointments', 'infinite', filters] as const,
    detail: (id: string) => ['appointments', 'detail', id] as const,
    patientEditSchedule: (id: string) => ['appointments', 'detail', id, 'patient-edit-schedule'] as const,
    pendingOffers: (role: string) => ['appointments', 'pending-offers', role] as const,
    history: (id: string) => ['appointments', 'history', id] as const,
    conversation: (id: string) => ['appointments', 'conversation', id] as const,
  },
  notifications: {
    list: (limit?: number) => ['notifications', 'list', limit ?? 10] as const,
    feed: (pageSize: number) => ['notifications', 'feed', pageSize] as const,
    unread: ['notifications', 'unread'] as const,
  },
  patients: {
    all: ['patients'] as const,
    list: (filters?: Record<string, unknown>) => ['patients', 'list', filters] as const,
    detail: (id: string) => ['patients', 'detail', id] as const,
    history: (id: string) => ['patients', 'history', 'appointments', id] as const,
    historyCount: (id: string) => ['patients', 'history', 'count', id] as const,
    lookup: (query: string) => ['patients', 'lookup', query] as const,
    hubSearch: (query: string) => ['patients', 'hub-search', query] as const,
    phones: (id: string) => ['patients', 'phones', id] as const,
    relative: (id: string, relativeId: string) => ['patients', 'relative', id, relativeId] as const,
    transmissions: (id: string) => ['patients', 'transmissions', id] as const,
    transmissionCareItems: (id: string, date: string) => ['patients', 'transmission-care-items', id, date] as const,
  },
  categories: {
    list: (type?: string, scope?: string, providerId?: string | null) =>
      providerId
        ? (['categories', 'list', type, scope, providerId] as const)
        : (['categories', 'list', type, scope] as const),
    options: (categoryId: string) => ['categories', 'options', categoryId] as const,
  },
  reviews: {
    list: (revieweeId: string) => ['reviews', 'list', revieweeId] as const,
    stats: (revieweeId: string) => ['reviews', 'stats', revieweeId] as const,
    patientList: (patientId: string) => ['reviews', 'patient', patientId] as const,
  },
  profile: {
    user: (id: string) => ['profile', 'user', id] as const,
    fullUser: (id: string) => ['profile', 'user', id, 'full'] as const,
    coverageZones: (ownerId: string, role: string) =>
      ['profile', 'coverage-zones', ownerId, role] as const,
    nursePreferences: ['profile', 'nurse-category-preferences'] as const,
    publicProvider: (type: 'nurse' | 'lab', slug: string) =>
      ['profile', 'public', type, slug] as const,
    providerName: (providerId: string) => ['profile', 'provider-name', providerId] as const,
  },
  documents: {
    all: ['documents'] as const,
    byId: (documentId: string) => ['medical-document', documentId] as const,
    medical: (appointmentId: string) => ['documents', 'medical', appointmentId] as const,
    patient: (userId: string) => ['documents', 'patient', userId] as const,
    relative: (relativeId: string) => ['documents', 'relative', relativeId] as const,
  },
  planLimits: {
    current: ['plan-limits'] as const,
  },
  iap: {
    subscription: ['iap', 'subscription'] as const,
  },
  prescriptions: {
    all: ['prescriptions'] as const,
    list: (query: string) => ['prescriptions', 'list', query] as const,
  },
  labResults: {
    list: (query: string) => ['lab-results', 'list', query] as const,
  },
  qr: {
    me: (userId: string) => ['qr', 'me', userId] as const,
  },
  labBrands: {
    public: () => ['lab-brands', 'public'] as const,
  },
  nurseCollaborations: {
    all: ['nurse-collaborations'] as const,
    list: (appointmentId?: string) => ['nurse-collaborations', 'list', appointmentId ?? 'all'] as const,
    picker: (search: string) => ['nurse-collaborations', 'picker', search] as const,
  },
  pharmacyOrders: {
    flags: (userId: string) => ['pharmacy-orders', 'flags', userId] as const,
    lists: ['pharmacy-orders', 'list'] as const,
    list: (scope: string) => ['pharmacy-orders', 'list', scope] as const,
    details: ['pharmacy-orders', 'detail'] as const,
    detail: (id: string) => ['pharmacy-orders', 'detail', id] as const,
    messages: (id: string) => ['pharmacy-orders', 'messages', id] as const,
    catalog: (postal: string, mode: string) => ['pharmacy-orders', 'catalog', postal, mode] as const,
    pharmacy: (id: string) => ['pharmacy-orders', 'pharmacy', id] as const,
    favorites: (userId: string) => ['pharmacy-orders', 'favorites', userId] as const,
  },
} as const;
