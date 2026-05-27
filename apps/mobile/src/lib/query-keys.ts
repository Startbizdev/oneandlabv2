import type { AppointmentListFilters } from '@oneandlab/shared-types';

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  appointments: {
    all: ['appointments'] as const,
    list: (filters: AppointmentListFilters) => ['appointments', 'list', filters] as const,
    infinite: (filters: AppointmentListFilters) => ['appointments', 'infinite', filters] as const,
    detail: (id: string) => ['appointments', 'detail', id] as const,
    pendingOffers: (role: string) => ['appointments', 'pending-offers', role] as const,
    history: (id: string) => ['appointments', 'history', id] as const,
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
    history: (id: string) => ['patients', 'history', id] as const,
    lookup: (query: string) => ['patients', 'lookup', query] as const,
  },
  categories: {
    list: (type?: string, scope?: string) => ['categories', 'list', type, scope] as const,
    options: (categoryId: string) => ['categories', 'options', categoryId] as const,
  },
  reviews: {
    list: (revieweeId: string) => ['reviews', 'list', revieweeId] as const,
    stats: (revieweeId: string) => ['reviews', 'stats', revieweeId] as const,
    patientList: (patientId: string) => ['reviews', 'patient', patientId] as const,
  },
  profile: {
    user: (id: string) => ['profile', 'user', id] as const,
    coverageZones: (ownerId: string, role: string) =>
      ['profile', 'coverage-zones', ownerId, role] as const,
    nursePreferences: ['profile', 'nurse-category-preferences'] as const,
    publicProvider: (type: 'nurse' | 'lab', slug: string) =>
      ['profile', 'public', type, slug] as const,
  },
  documents: {
    medical: (appointmentId: string) => ['documents', 'medical', appointmentId] as const,
    patient: (userId: string) => ['documents', 'patient', userId] as const,
    relative: (relativeId: string) => ['documents', 'relative', relativeId] as const,
  },
  planLimits: {
    current: ['plan-limits'] as const,
  },
  prescriptions: {
    list: (query: string) => ['prescriptions', 'list', query] as const,
  },
} as const;
