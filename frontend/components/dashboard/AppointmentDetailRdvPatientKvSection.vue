<template>
  <template v-if="appointment.form_data || appointment.relative">
    <div :class="kvRow">
      <div :class="kvLabel">
        {{ appointment.relative ? 'Bénéficiaire' : 'Patient' }}
      </div>
      <div class="min-w-0 space-y-1 text-left">
        <p class="text-sm font-medium text-gray-900 dark:text-white leading-snug">
          {{ patientDetailDisplayName }}
        </p>
        <p
          v-if="patientBirthDisplayLine"
          class="text-xs text-muted tabular-nums"
        >
          {{ patientBirthDisplayLine }}
        </p>
        <p v-if="appointment.relative" class="text-xs text-muted">
          Lien : {{ getRelationshipLabel(appointment.relative.relationship_type) }}
        </p>
        <AppointmentDetailContactPhoneRow :phone="patientContactPhone" />
        <UButton
          v-if="patientContactEmailDisplay.href"
          size="xs"
          variant="outline"
          color="neutral"
          leading-icon="i-lucide-mail"
          class="shrink-0 mt-1.5"
          :href="patientContactEmailDisplay.href"
        >
          E-mail
        </UButton>
      </div>
    </div>
    <div
      v-if="appointment.relative?.is_minor === true"
      class="px-4 sm:px-6 py-3 border-t border-amber-200/80 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/25"
      role="status"
    >
      <p class="text-sm text-amber-950 dark:text-amber-100 leading-snug">
        <span class="font-medium">Personne mineure</span><template v-if="appointment.relative.age_years != null && appointment.relative.age_years !== undefined">
          ({{ appointment.relative.age_years }} an{{ appointment.relative.age_years === 1 ? '' : 's' }})
        </template>
        · le rendez-vous est réservé par le titulaire du compte (contact principal ci-dessous), habilité à représenter le patient pour la prise en charge.
      </p>
    </div>
    <template v-if="showBookingContactBlock">
      <div :class="kvRow">
        <div :class="kvLabel">
          Contact principal
        </div>
        <div class="min-w-0 space-y-1 text-left">
          <p class="text-sm font-medium text-gray-900 dark:text-white leading-snug">
            {{ bookingContactFullName || '—' }}
          </p>
          <p class="text-xs text-muted">
            Titulaire du compte · personne qui a pris le rendez-vous
          </p>
          <AppointmentDetailContactPhoneRow :phone="bookingContactPhone" />
          <UButton
            v-if="bookingContactEmailDisplay.href"
            size="xs"
            variant="outline"
            color="neutral"
            leading-icon="i-lucide-mail"
            class="shrink-0 mt-1.5"
            :href="bookingContactEmailDisplay.href"
          >
            E-mail
          </UButton>
          <p
            v-else-if="bookingContactEmailDisplay.text"
            class="text-xs text-muted break-all pt-0.5"
          >
            {{ bookingContactEmailDisplay.text }}
          </p>
        </div>
      </div>
    </template>
    <div
      v-if="patientProfileHref || $slots.actions"
      class="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2"
    >
      <UButton
        v-if="patientProfileHref"
        size="sm"
        variant="outline"
        color="neutral"
        leading-icon="i-lucide-user"
        :to="patientProfileHref"
      >
        Voir la fiche patient
      </UButton>
      <slot name="actions" />
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  extractEmailFromDisplayLine,
  isTechnicalPatientEmail,
  patientUiEmailLine,
} from '~/utils/patient-address-rdv';
import { appointmentPatientDisplayName } from '~/utils/appointment-patient-display';
import { staffAppointmentPatientProfileHref } from '~/utils/staff-appointment-patient-profile';

const props = defineProps<{
  appointment: any;
  isAdmin: boolean;
  showStaffPatientProfileLink?: boolean;
}>();

const { user } = useAuth();

const patientProfileHref = computed(() => {
  if (!props.showStaffPatientProfileLink) return null;
  return staffAppointmentPatientProfileHref(user.value?.role, props.appointment);
});

const kvRow =
  'grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3 sm:px-6 sm:grid-cols-[minmax(9.5rem,11rem)_minmax(0,1fr)] sm:items-start sm:py-2.5';
const kvLabel = 'text-[11px] font-semibold uppercase tracking-wide text-muted shrink-0 pt-0.5';

function getRelationshipLabel(r: string) {
  const map: Record<string, string> = {
    child: 'Enfant',
    parent: 'Parent',
    spouse: 'Conjoint(e)',
    sibling: 'Frère/Sœur',
    grandparent: 'Grand-parent',
    grandchild: 'Petit-enfant',
    other: 'Autre',
  };
  return map[r] || r;
}

const patientDetailDisplayName = computed(() => {
  const name = appointmentPatientDisplayName(props.appointment);
  return name || '—';
});

const patientBirthDate = computed(() => {
  const a = props.appointment;
  if (!a) return null;
  return a.relative?.birth_date || a.form_data?.birth_date || null;
});

const patientAge = computed(() => {
  const d = patientBirthDate.value;
  if (!d) return null;
  try {
    const birth = new Date(typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}/) ? d.slice(0, 10) : d);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 0) return null;
    return age === 1 ? '1 an' : `${age} ans`;
  } catch {
    return null;
  }
});

const patientBirthDisplayLine = computed(() => {
  const d = patientBirthDate.value;
  if (!d) return '';
  const a = props.appointment;
  const gender = (a?.relative as { gender?: string } | undefined)?.gender
    ?? (a?.form_data as { gender?: string } | undefined)?.gender;
  const prefix
    = gender === 'female'
      ? 'Née le '
      : gender === 'male'
        ? 'Né le '
        : gender === 'other'
          ? 'Né(e) le '
          : 'Né le ';
  try {
    const birth = new Date(typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}/) ? d.slice(0, 10) : d);
    if (Number.isNaN(birth.getTime())) return '';
    const day = birth.getDate();
    const month = String(birth.getMonth() + 1).padStart(2, '0');
    const year = birth.getFullYear();
    const datePart = `${day}/${month}/${year}`;
    const age = patientAge.value;
    return age != null ? `${prefix}${datePart} (${age})` : `${prefix}${datePart}`;
  } catch {
    return '';
  }
});

const patientContactPhone = computed(() => {
  const a = props.appointment;
  if (!a) return '';
  return String(a.relative?.phone || a.form_data?.phone || '').trim();
});

const patientContactEmailDisplay = computed(() => {
  const a = props.appointment;
  if (!a) return { text: '', href: null as string | null };
  const raw = (a.relative?.email || a.form_data?.email || '') as string;
  if (!String(raw).trim()) return { text: '', href: null };
  const display = a.patient_email_display as string | undefined;
  const text = patientUiEmailLine({ email: raw, email_display: display });
  if (isTechnicalPatientEmail(raw) && display) {
    const extracted = extractEmailFromDisplayLine(display);
    return { text, href: extracted ? `mailto:${extracted}` : null };
  }
  if (!isTechnicalPatientEmail(raw)) {
    return { text: raw, href: `mailto:${raw}` };
  }
  return { text, href: null };
});

const showBookingContactBlock = computed(() => {
  const a = props.appointment;
  const bc = a?.booking_contact;
  if (!a?.relative || !bc) return false;
  const name = `${bc.first_name ?? ''} ${bc.last_name ?? ''}`.trim();
  return !!(name || bc.phone || bc.email);
});

const bookingContactFullName = computed(() => {
  const bc = props.appointment?.booking_contact;
  if (!bc) return '';
  return [bc.first_name, bc.last_name].filter(Boolean).join(' ').trim();
});

const bookingContactPhone = computed(() =>
  String(props.appointment?.booking_contact?.phone || '').trim(),
);

const bookingContactEmailDisplay = computed(() => {
  const bc = props.appointment?.booking_contact;
  if (!bc) return { text: '', href: null as string | null };
  const raw = (bc.email || '') as string;
  if (!String(raw).trim()) return { text: '', href: null };
  const display = bc.email_display as string | undefined;
  const text = patientUiEmailLine({ email: raw, email_display: display });
  if (isTechnicalPatientEmail(raw) && display) {
    const extracted = extractEmailFromDisplayLine(display);
    return { text, href: extracted ? `mailto:${extracted}` : null };
  }
  if (!isTechnicalPatientEmail(raw)) {
    return { text: raw, href: `mailto:${raw}` };
  }
  return { text, href: null };
});
</script>
