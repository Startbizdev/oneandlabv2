/**
 * Hydratation du flux « UnifiedAppointmentForm » (mode tout-en-un page) depuis un RDV API (admin édition).
 */
import type { Appointment } from '~/types/appointments';
import type { SelectedServiceInput } from '~/utils/dashboard-unified-rdv';
import {
  AVAILABILITY_MAX_HOUR_BLOOD_TEST,
  AVAILABILITY_MAX_HOUR_NURSING,
  AVAILABILITY_MIN_SPAN_HOURS,
} from '~/constants/availability-slot';
import { isBloodTestAppointment } from '~/utils/appointment-type-rules';

type CareCategoryLite = {
  id: string;
  name?: string;
  type?: string;
  icon?: string | null;
  image_url?: string | null;
};

function catById(map: Map<string, CareCategoryLite>, id: unknown): CareCategoryLite | undefined {
  if (id == null || String(id).trim() === '') return undefined;
  return map.get(String(id));
}

function parseAvailabilitySlices(
  raw: unknown,
  serviceTypeForMax: string,
): { availability_type: 'custom' | 'all_day'; availabilityRange: [number, number]; availability?: string } {
  const maxH = isBloodTestAppointment(serviceTypeForMax) ? AVAILABILITY_MAX_HOUR_BLOOD_TEST : AVAILABILITY_MAX_HOUR_NURSING;
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      const av = JSON.parse(raw) as { type?: string; range?: number[] };
      if (av?.type === 'all_day') {
        return {
          availability_type: 'all_day',
          availabilityRange: [9, 11],
          availability: JSON.stringify({ type: 'all_day' }),
        };
      }
      if (av?.type === 'custom' && Array.isArray(av.range) && av.range.length === 2) {
        let r0 = Number(av.range[0]);
        let r1 = Number(av.range[1]);
        r1 = Math.min(maxH, Math.max(r1, r0 + AVAILABILITY_MIN_SPAN_HOURS));
        r0 = Math.max(6, Math.min(r0, r1 - AVAILABILITY_MIN_SPAN_HOURS));
        const availability = JSON.stringify({ type: 'custom', range: [r0, r1] });
        return {
          availability_type: 'custom',
          availabilityRange: [r0, r1],
          availability,
        };
      }
    } catch {
      /* ignore */
    }
  }
  return {
    availability_type: 'all_day',
    availabilityRange: [9, 11],
    availability: JSON.stringify({ type: 'all_day' }),
  };
}

/** Date locale YYYY-MM-DD pour DatePicker depuis scheduled_at RDV */
function scheduledDateOnly(scheduledAt: string | undefined | null): string {
  if (!scheduledAt || typeof scheduledAt !== 'string') return '';
  if (scheduledAt.includes('T')) return scheduledAt.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(scheduledAt)) return scheduledAt.slice(0, 10);
  return '';
}

/** Bloc métier Unified par id de ligne panier wizard */
export type HydratedServiceFormSlice = Record<string, unknown>;

export function hydrateAdminUnifiedAppointment(
  apt: Appointment,
  categories: CareCategoryLite[],
): {
  selectedServices: SelectedServiceInput[];
  formData: Record<string, unknown>;
} {
  const catMap = new Map(categories.map((c) => [String(c.id), c]));
  const fd = (apt.form_data || {}) as Record<string, unknown>;
  const availStr = fd.availability != null ? String(fd.availability) : '';

  const typeStr = isBloodTestAppointment(apt.type) ? 'blood_test' : 'nursing';

  const bloodRows =
    Array.isArray(apt.blood_test_items) && apt.blood_test_items.length > 0 ? apt.blood_test_items : null;
  const nursRows =
    Array.isArray(apt.nursing_items) && apt.nursing_items.length > 0 ? apt.nursing_items : null;

  const personal = {
    last_name: (fd.last_name as string) || '',
    first_name: (fd.first_name as string) || '',
    email: (fd.email as string) || '',
    phone: (fd.phone as string) || '',
    gender: (fd.gender as string) || '',
    birth_date: (fd.birth_date as string) || '',
    address: apt.address && typeof apt.address === 'object' ? apt.address : null,
    address_complement: (fd.address_complement as string) || (apt.address as { complement?: string } | null)?.complement || '',
  };

  /** Form slices par service id */
  const formDataByService: Record<string, HydratedServiceFormSlice> = {};
  let selectedServices: SelectedServiceInput[] = [];

  if (typeStr === 'blood_test') {
    const rows =
      bloodRows && bloodRows.length > 0
        ? [...bloodRows].sort((a, b) => Number((a as { sort_order?: number }).sort_order ?? 0) - Number((b as { sort_order?: number }).sort_order ?? 0))
        : [
            {
              category_id: apt.category_id,
              label: apt.category_name,
              care_options: (fd.care_options as Record<string, unknown>) || {},
              sort_order: 0,
            },
          ];

    selectedServices = rows.map((row, idx) => {
      const cid = (row as { category_id?: string }).category_id ?? apt.category_id;
      const cat = cid ? catById(catMap, cid) : undefined;
      return {
        id: `adm-blood-${idx}`,
        type: 'blood_test',
        name: String((row as { label?: string }).label ?? cat?.name ?? apt.category_name ?? 'Prélèvement'),
        category_id: cid != null ? String(cid) : null,
        icon: cat?.icon || 'i-lucide-droplet',
        category_image_url: cat?.image_url ?? apt.category_image_url ?? null,
      };
    });

    const firstId = selectedServices[0]!.id;
    const avail = parseAvailabilitySlices(availStr, 'blood_test');
    const notes = typeof fd.notes === 'string' ? fd.notes : '';
    const showNotes = notes.trim().length > 0;

    formDataByService[firstId] = {
      ...avail,
      scheduled_at: scheduledDateOnly(apt.scheduled_at),
      blood_test_type: fd.blood_test_type || 'single',
      duration_days: fd.duration_days,
      custom_days: fd.custom_days ?? null,
      care_options: { ...((fd.care_options as Record<string, unknown>) || {}) },
      notes,
      showNotes,
      files: {},
    };

    rows.forEach((row, idx) => {
      const sid = `adm-blood-${idx}`;
      const coRaw = (row as { care_options?: Record<string, unknown> }).care_options;
      if (sid !== firstId) {
        formDataByService[sid] = {
          scheduled_at: scheduledDateOnly(apt.scheduled_at),
          availability_type: avail.availability_type,
          availabilityRange: [...avail.availabilityRange],
          availability: avail.availability,
          blood_test_type: fd.blood_test_type || 'single',
          duration_days: fd.duration_days,
          custom_days: fd.custom_days ?? null,
          care_options: { ...(coRaw && typeof coRaw === 'object' ? coRaw : {}) },
          notes: '',
          showNotes: false,
          files: {},
        };
      } else if (coRaw && typeof coRaw === 'object') {
        formDataByService[firstId]!.care_options = {
          ...(formDataByService[firstId]!.care_options as Record<string, unknown>),
          ...(coRaw as Record<string, unknown>),
        };
      }
    });

    /** Plus d’une ligne : options catalogue par ligne peuvent diverger ; seule la 1ʳᵉ carte affiche le catalogue complet (limitation UX existante wizard). */
  } else {
    /** nursing */
    const rows =
      nursRows && nursRows.length > 0
        ? [...nursRows].sort((a, b) => Number((a as { sort_order?: number }).sort_order ?? 0) - Number((b as { sort_order?: number }).sort_order ?? 0))
        : [
            {
              category_id: apt.category_id,
              label: apt.category_name,
              care_options: (fd.care_options as Record<string, unknown>) || {},
              sort_order: 0,
            },
          ];

    selectedServices = rows.map((row, idx) => {
      const cid = (row as { category_id?: string }).category_id ?? apt.category_id;
      const cat = cid ? catById(catMap, cid) : undefined;
      return {
        id: `adm-nursing-${idx}`,
        type: 'nursing',
        name: String((row as { label?: string }).label ?? cat?.name ?? apt.category_name ?? 'Soin infirmier'),
        category_id: cid != null ? String(cid) : null,
        icon: cat?.icon || 'i-lucide-heart-pulse',
        category_image_url: cat?.image_url ?? apt.category_image_url ?? null,
      };
    });

    const firstId = selectedServices[0]!.id;
    const avail = parseAvailabilitySlices(availStr, 'nursing');
    const notes = typeof fd.notes === 'string' ? fd.notes : '';
    const showNotes = notes.trim().length > 0;
    const firstRowCo = (rows[0] as { care_options?: Record<string, unknown> })?.care_options;
    const careFirst =
      rows.length > 1
        ? { ...(firstRowCo && typeof firstRowCo === 'object' ? firstRowCo : {}) }
        : {
            ...((fd.care_options as Record<string, unknown>) || {}),
            ...(firstRowCo && typeof firstRowCo === 'object' ? firstRowCo : {}),
          };

    formDataByService[firstId] = {
      ...avail,
      scheduled_at: scheduledDateOnly(apt.scheduled_at),
      duration_days: fd.duration_days || '1',
      frequency: fd.frequency || '',
      custom_days: fd.custom_days ?? null,
      preferred_nurse_gender: (fd.preferred_nurse_gender as string) || 'any',
      care_options: careFirst,
      notes,
      showNotes,
      files: {},
    };

    rows.forEach((row, idx) => {
      const sid = `adm-nursing-${idx}`;
      const coRaw = (row as { care_options?: Record<string, unknown> }).care_options;
      if (sid !== firstId) {
        formDataByService[sid] = {
          scheduled_at: scheduledDateOnly(apt.scheduled_at),
          availability_type: avail.availability_type,
          availabilityRange: [...avail.availabilityRange],
          availability: avail.availability,
          duration_days: fd.duration_days || '1',
          frequency: fd.frequency || '',
          custom_days: fd.custom_days ?? null,
          preferred_nurse_gender: (fd.preferred_nurse_gender as string) || 'any',
          care_options: { ...(coRaw && typeof coRaw === 'object' ? coRaw : {}) },
          notes: '',
          showNotes: false,
          files: {},
        };
      }
    });
  }

  const formData: Record<string, unknown> = {
    ...personal,
    formDataByService,
    isMultiServices: selectedServices.length > 1,
  };

  return { selectedServices, formData };
}
