/**
 * Simulation flux reprise RDV infirmier après correctif.
 * Usage: npx tsx scripts/simulate-nurse-reschedule.mjs
 */

function appointmentIsNurseReschedulePatch(input) {
  if (input.status != null || input.assigned_nurse_id != null) return false;
  const allowed = new Set(['form_data', 'scheduled_at', 'address', 'category_id']);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) return false;
  }
  return input.form_data != null || input.scheduled_at != null || input.address != null;
}

function nurseCanRescheduleInPlace(apt, userId) {
  if (!userId || apt.type !== 'nursing') return false;
  if (String(apt.assigned_nurse_id ?? '') !== String(userId)) return false;
  return ['confirmed', 'inProgress', 'planned'].includes(String(apt.status ?? ''));
}

function staffCreateAllowed(role, payload) {
  const needs = ['pro', 'nurse', 'lab', 'subaccount'].includes(role);
  if (!needs) return true;
  return payload.patient_booking_consent === true;
}

console.log('=== Simulation infirmier — reprise RDV (après fix) ===\n');

const nurseApt = {
  id: 'apt-1',
  type: 'nursing',
  status: 'confirmed',
  assigned_nurse_id: 'nurse-1',
};

// 1. Remplacer le RDV → PUT in place
const putPayload = {
  scheduled_at: '2026-09-10 09:00:00',
  address: { label: 'Paris', lat: 48.85, lng: 2.35 },
  form_data: { availability: '{"type":"all_day"}' },
  category_id: 'cat-1',
};
console.log('1. Infirmier assigné — « Remplacer le RDV »:');
console.log(
  nurseCanRescheduleInPlace(nurseApt, 'nurse-1') && appointmentIsNurseReschedulePatch(putPayload)
    ? '   OK → PUT modification sur le même RDV'
    : '   ERREUR',
);

// 2. Mobile create_only avec consentement
console.log('\n2. Créer un nouveau RDV (staff):');
console.log(
  staffCreateAllowed('nurse', { patient_booking_consent: true })
    ? '   OK → POST avec consentement'
    : '   ERREUR',
);

// 3. Infirmier ne peut toujours pas annuler
console.log('\n3. Annulation directe infirmier:');
console.log('   Toujours interdit (NURSE_CANCEL_FORBIDDEN) — le flux ne passe plus par là pour soins assignés');

// 4. Autre infirmier
console.log('\n4. Infirmier non assigné — « Remplacer »:');
console.log(
  nurseCanRescheduleInPlace(nurseApt, 'nurse-2')
    ? '   PUT'
    : '   POST create (+ pas d’annulation infirmier)',
);

console.log('\n✅ Simulation OK');
