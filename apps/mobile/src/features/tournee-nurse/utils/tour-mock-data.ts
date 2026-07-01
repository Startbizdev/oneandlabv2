import dayjs from 'dayjs';
import type { NurseTourPayload, NurseTourStop } from '../api/nurse-tour.service';

/** Aperçu UI en dev quand aucun RDV réel — retirer ou passer à false avant prod. */
export const NURSE_TOUR_PREVIEW_MOCK = __DEV__;

const MOCK_BATCH_ID = 'mock-batch-lot-1';

const MOCK_PATIENTS = [
  {
    name: 'Marie Dupont',
    category: 'Pansement',
    categoryId: 'mock-cat-pansement',
    categoryIcon: '🩹',
    nursingItems: [
      {
        category_id: 'mock-cat-pansement',
        label: 'Pansement',
        category_name: 'Pansement',
        category_icon: '🩹',
        care_options: { localisation: 'pied_gauche', type: 'simple' },
      },
    ],
    address: '12 rue de Rivoli, 75004 Paris',
    complement: 'Bat. B, 3e étage, code 4521',
    lat: 48.8566,
    lng: 2.3522,
    phone: '0612345678',
    gender: 'female' as const,
    hour: 8,
    minute: 30,
    availability: { type: 'custom', range: [8.5, 10] },
    batchSiblingCount: 0,
  },
  {
    name: 'Jean Martin',
    category: 'Injection',
    categoryId: 'mock-cat-injection',
    categoryIcon: '💉',
    nursingItems: [
      {
        category_id: 'mock-cat-injection',
        label: 'Injection',
        category_name: 'Injection',
        category_icon: '💉',
        care_options: { type: 'intramusculaire' },
      },
      {
        category_id: 'mock-cat-pansement',
        label: 'Pansement',
        category_name: 'Pansement',
        category_icon: '🩹',
        care_options: { localisation: 'bras_droit' },
      },
    ],
    address: '45 bd Saint-Germain, 75005 Paris',
    complement: 'Interphone Martin',
    lat: 48.8495,
    lng: 2.3488,
    phone: '0698765432',
    gender: 'male' as const,
    hour: 9,
    minute: 15,
    availability: { type: 'custom', range: [9, 11] },
    batchSiblingCount: 0,
  },
  {
    name: 'Sophie Bernard',
    category: 'Injection',
    categoryId: 'mock-cat-injection',
    categoryIcon: '💉',
    nursingItems: [
      {
        category_id: 'mock-cat-injection',
        label: 'Injection',
        category_name: 'Injection',
        category_icon: '💉',
        care_options: { type: 'sous_cutanee' },
      },
    ],
    address: '8 av. de la République, 75011 Paris',
    complement: '',
    lat: 48.8634,
    lng: 2.3673,
    phone: '0678912345',
    gender: 'female' as const,
    hour: 10,
    minute: 0,
    availability: { type: 'all_day' },
    creationBatchId: MOCK_BATCH_ID,
    batchSiblingCount: 3,
    batchMergedItems: [
      {
        category_id: 'mock-cat-injection',
        label: 'Injection',
        category_name: 'Injection',
        category_icon: '💉',
        care_options: { type: 'sous_cutanee' },
      },
      {
        category_id: 'mock-cat-pansement',
        label: 'Pansement',
        category_name: 'Pansement',
        category_icon: '🩹',
        care_options: { localisation: 'main_gauche' },
      },
      {
        category_id: 'mock-cat-perfusion',
        label: 'Perfusion',
        category_name: 'Perfusion',
        category_icon: '💧',
        care_options: { type: 'pose' },
      },
    ],
  },
  {
    name: 'Pierre Leroy',
    category: 'Perfusion',
    categoryId: 'mock-cat-perfusion',
    categoryIcon: '💧',
    nursingItems: [
      {
        category_id: 'mock-cat-perfusion',
        label: 'Perfusion',
        category_name: 'Perfusion',
        category_icon: '💧',
        care_options: { type: 'surveillance' },
      },
    ],
    address: '22 rue du Faubourg Saint-Antoine, 75012 Paris',
    complement: 'Porte gauche',
    lat: 48.8498,
    lng: 2.3955,
    phone: undefined,
    gender: 'male' as const,
    hour: 11,
    minute: 30,
    availability: { type: 'custom', range: [11, 13] },
    creationBatchId: MOCK_BATCH_ID,
    batchSiblingCount: 3,
    batchMergedItems: [
      {
        category_id: 'mock-cat-injection',
        label: 'Injection',
        category_name: 'Injection',
        category_icon: '💉',
        care_options: { type: 'sous_cutanee' },
      },
      {
        category_id: 'mock-cat-pansement',
        label: 'Pansement',
        category_name: 'Pansement',
        category_icon: '🩹',
        care_options: { localisation: 'main_gauche' },
      },
      {
        category_id: 'mock-cat-perfusion',
        label: 'Perfusion',
        category_name: 'Perfusion',
        category_icon: '💧',
        care_options: { type: 'pose' },
      },
    ],
  },
  {
    name: 'Claire Petit',
    category: 'Surveillance TA',
    categoryId: 'mock-cat-surveillance',
    categoryIcon: '🩺',
    nursingItems: [
      {
        category_id: 'mock-cat-surveillance',
        label: 'Surveillance TA',
        category_name: 'Surveillance TA',
        category_icon: '🩺',
      },
    ],
    address: '3 pl. de la Bastille, 75011 Paris',
    complement: '',
    lat: 48.8532,
    lng: 2.3695,
    phone: '0655443322',
    gender: 'female' as const,
    hour: 14,
    minute: 0,
    availability: { type: 'custom', range: [14, 16] },
    creationBatchId: MOCK_BATCH_ID,
    batchSiblingCount: 3,
    batchMergedItems: [
      {
        category_id: 'mock-cat-injection',
        label: 'Injection',
        category_name: 'Injection',
        category_icon: '💉',
        care_options: { type: 'sous_cutanee' },
      },
      {
        category_id: 'mock-cat-pansement',
        label: 'Pansement',
        category_name: 'Pansement',
        category_icon: '🩹',
        care_options: { localisation: 'main_gauche' },
      },
      {
        category_id: 'mock-cat-perfusion',
        label: 'Perfusion',
        category_name: 'Perfusion',
        category_icon: '💧',
        care_options: { type: 'pose' },
      },
    ],
  },
] as const;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function buildStops(date: string): NurseTourStop[] {
  let prev = { lat: 48.8606, lng: 2.3376 };
  return MOCK_PATIENTS.map((p, i) => {
    const km = haversineKm(prev, { lat: p.lat, lng: p.lng });
    prev = { lat: p.lat, lng: p.lng };
    const scheduled = dayjs(date).hour(p.hour).minute(p.minute).second(0).format('YYYY-MM-DD HH:mm:ss');
    const nursingItems = [...p.nursingItems];
    const nursingDisplay =
      'batchMergedItems' in p && p.batchMergedItems ? [...p.batchMergedItems] : nursingItems;

    return {
      stop_id: `mock-stop-${i + 1}`,
      appointment_id: `mock-appt-${i + 1}`,
      position: i + 1,
      visit_status: 'todo',
      patient_name: p.name,
      patient_id: `mock-patient-${i + 1}`,
      patient_gender: p.gender,
      type: 'nursing',
      category_id: p.categoryId,
      category_name: p.category,
      category_icon: p.categoryIcon,
      creation_batch_id: 'creationBatchId' in p ? p.creationBatchId : null,
      batch_sibling_count: p.batchSiblingCount ?? 0,
      nursing_items: nursingItems,
      nursing_items_display: nursingDisplay,
      status: 'accepted',
      scheduled_at: scheduled,
      availability: p.availability,
      address_line: p.address,
      address_complement: p.complement || undefined,
      lat: p.lat,
      lng: p.lng,
      distance_km_from_prev: Math.round(km * 10) / 10,
      drive_min_from_prev: Math.max(3, Math.round(km * 3.2)),
      phone: p.phone,
    };
  });
}

export function buildMockNurseTour(date: string): NurseTourPayload {
  const today = dayjs().format('YYYY-MM-DD');
  const counts = buildMockDayCounts();
  const count = counts[date] ?? (date === today ? MOCK_PATIENTS.length : 0);
  const stops = buildStops(date).slice(0, count);
  const isToday = date === today;
  const doneStops = isToday ? Math.min(1, stops.length) : 0;
  const mappedStops = stops.map((s, i) => ({
    ...s,
    position: i + 1,
    visit_status: (isToday && i === 0 ? 'done' : 'todo') as NurseTourStop['visit_status'],
  }));
  const nextId = mappedStops.find((s) => s.visit_status === 'todo')?.stop_id ?? null;

  return {
    date,
    plan: {
      id: 'mock-plan',
      sort_mode: 'smart',
      manual_order_locked: false,
      nav_app_pref: 'waze',
      optimized_at: dayjs().toISOString(),
    },
    summary: {
      total_stops: mappedStops.length,
      done_stops: doneStops,
      estimated_km: Math.round(mappedStops.reduce((acc, s) => acc + s.distance_km_from_prev, 0) * 10) / 10,
    },
    stops: mappedStops,
    next_stop_id: nextId,
  };
}

export function buildMockDayCounts(): Record<string, number> {
  const today = dayjs().format('YYYY-MM-DD');
  return {
    [today]: MOCK_PATIENTS.length,
    [dayjs(today).add(1, 'day').format('YYYY-MM-DD')]: 3,
    [dayjs(today).add(2, 'day').format('YYYY-MM-DD')]: 2,
    [dayjs(today).add(4, 'day').format('YYYY-MM-DD')]: 4,
  };
}

export function isMockTourId(id: string): boolean {
  return id.startsWith('mock-');
}
