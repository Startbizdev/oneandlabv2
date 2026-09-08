/**
 * Simulation rapide du fix multi-soins (fréquence / prise en charge par acte).
 * Usage: node scripts/simulate-multi-care-booking.mjs
 */
import {
  mergeSchedulingMetaIntoItemCareOptions,
  servicesRequiringSchedulingValidation,
} from '../packages/shared-utils/src/booking-item-scheduling-meta.ts';
import {
  servicesRequiringOwnSlots,
  validateUnifiedRdvPayload,
} from '../packages/shared-utils/src/dashboard-unified-rdv.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const nursingA = { id: 'n1', type: 'nursing', name: 'Pansement', category_id: 'cat1' };
const nursingB = { id: 'n2', type: 'nursing', name: 'Perfusion', category_id: 'cat2' };
const selected = [nursingA, nursingB];

// 1. Validation scheduling : les 2 soins, pas seulement le 1er
const sched = servicesRequiringSchedulingValidation(selected);
assert(sched.length === 2, `scheduling validation: attendu 2, got ${sched.length}`);

// 2. Créneau fusionné : 1 seule carte slot pour le lot infirmier
const slots = servicesRequiringOwnSlots(selected);
assert(slots.length === 1 && slots[0].id === 'n1', 'slot rows: 1 carte représentant le lot');

// 3. Meta distincte par acte dans care_options
const coA = mergeSchedulingMetaIntoItemCareOptions(
  { type: 'simple' },
  { duration_days: '7', frequency: 'daily', custom_days: null },
  'nursing',
);
const coB = mergeSchedulingMetaIntoItemCareOptions(
  { type: 'complex' },
  { duration_days: 'custom', frequency: 'every_2_days', custom_days: 14 },
  'nursing',
);
assert(coA._duration_days === '7' && coA._frequency === 'daily', 'meta acte A');
assert(coB._duration_days === 'custom' && coB._frequency === 'every_2_days' && coB._custom_days === 14, 'meta acte B');

// 4. Payload validation : les 2 soins doivent avoir fréquence si prise en charge > 1 jour
const formData = {
  last_name: 'Dupont',
  first_name: 'Jean',
  email: 'jean@test.fr',
  phone: '0612345678',
  gender: 'male',
  birth_date: '1990-01-01',
  address: { label: 'Paris', lat: 48.85, lng: 2.35 },
  formDataByService: {
    n1: {
      scheduled_at: '2026-09-10',
      availability: JSON.stringify({ type: 'all_day' }),
      duration_days: '7',
      frequency: 'daily',
      care_options: coA,
    },
    n2: {
      scheduled_at: '2026-09-10',
      availability: JSON.stringify({ type: 'all_day' }),
      duration_days: 'custom',
      custom_days: 14,
      frequency: 'every_2_days',
      care_options: coB,
    },
  },
};

const ok = validateUnifiedRdvPayload(formData, selected);
assert(ok === null, `validation OK attendue, got ${ok?.message ?? ok}`);

// 5. 2e soin sans fréquence → erreur
const bad = validateUnifiedRdvPayload(
  {
    ...formData,
    formDataByService: {
      ...formData.formDataByService,
      n2: {
        ...formData.formDataByService.n2,
        frequency: '',
      },
    },
  },
  selected,
);
assert(bad?.message?.includes('Perfusion'), `erreur attendue sur 2e soin, got: ${bad?.message}`);

console.log('✅ Simulation multi-soins OK (5 scénarios)');
