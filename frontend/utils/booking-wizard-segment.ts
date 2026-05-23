import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';
import { careCategoryEmojiForCategory, isCareCategoryEmoji } from '@oneandlab/shared-utils';
import { resolveCareCategoryImageSrc } from '~/utils/care-icons';

export type BookingWizardSegmentLine = {
  id: string;
  name: string;
  emoji: string;
  imageSrc: string | null;
  iconName: string;
};

export type BookingWizardSegmentIntro = {
  kind: 'nursing' | 'blood' | 'other';
  title: string;
  lines: BookingWizardSegmentLine[];
};

export type BookingWizardSlotRow = {
  id: string;
  type: string;
  name: string;
  icon?: string;
  category_image_url?: string | null;
};

/** Intro visuel du lot courant (soins groupés, prélèvements groupés). */
export function buildBookingWizardSegmentIntro(
  selectedServices: BookingWizardSlotRow[],
  activeServiceId: string | null,
  apiBase: string,
): BookingWizardSegmentIntro | null {
  if (!activeServiceId) return null;
  const rep = selectedServices.find((s) => s.id === activeServiceId);
  if (!rep) return null;

  const visual = (svc: BookingWizardSlotRow) => {
    const typeStr = isBloodTestAppointment(svc.type) ? 'blood_test' : 'nursing';
    const emoji = careCategoryEmojiForCategory({
      name: svc.name,
      icon: svc.icon ?? null,
      type: typeStr,
    });
    const imageSrc = isCareCategoryEmoji(svc.icon)
      ? null
      : resolveCareCategoryImageSrc(svc.category_image_url ?? null, apiBase);
    return { emoji, imageSrc };
  };

  if (isNursingAppointment(rep.type)) {
    const nurs = selectedServices.filter((s) => isNursingAppointment(s.type));
    return {
      kind: 'nursing',
      title: 'soins infirmiers',
      lines: nurs.map((s) => ({
        id: s.id,
        name: s.name,
        ...visual(s),
        iconName: s.icon || 'i-lucide-heart-pulse',
      })),
    };
  }

  if (isBloodTestAppointment(rep.type)) {
    const bloods = selectedServices.filter((s) => isBloodTestAppointment(s.type));
    return {
      kind: 'blood',
      title: 'prélèvement',
      lines: bloods.map((s) => ({
        id: s.id,
        name: s.name,
        ...visual(s),
        iconName: s.icon || 'i-lucide-droplet',
      })),
    };
  }

  return {
    kind: 'other',
    title: rep.name,
    lines: [
      {
        id: rep.id,
        name: rep.name,
        ...visual(rep),
        iconName: rep.icon || 'i-lucide-stethoscope',
      },
    ],
  };
}

/** Date courte pour stepper / récap (ex. « sam. 16 mai »). */
export function formatBookingWizardSlotDate(iso: string | null | undefined): string | null {
  if (iso == null || String(iso).trim() === '') return null;
  const s = String(iso).trim();
  try {
    const d = s.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(`${s}T12:00:00`) : new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const out = d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return out.charAt(0).toUpperCase() + out.slice(1);
  } catch {
    return null;
  }
}

export function bookingWizardSegmentStepLabel(kind: BookingWizardSegmentIntro['kind']): string {
  if (kind === 'nursing') return 'Soins infirmiers';
  if (kind === 'blood') return 'Prélèvement';
  return 'Prestation';
}

export function bookingWizardSegmentKindIcon(kind: BookingWizardSegmentIntro['kind']): string {
  if (kind === 'nursing') return 'i-lucide-stethoscope';
  if (kind === 'blood') return 'i-lucide-droplet';
  return 'i-lucide-calendar';
}
