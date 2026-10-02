import type { Href } from 'expo-router';
import type { RoleRoutePrefix, StaffRoutePrefix } from './role-route-prefix';

type RouteParams = Record<string, string>;

/** Fiche RDV du rôle ; `extra` porte les paramètres de requête (`segment`, `review`…). */
export function appointmentDetailHref(prefix: RoleRoutePrefix, appointmentId: string, extra: RouteParams = {}): Href {
  const params = { ...extra, id: appointmentId };
  switch (prefix) {
    case '/(nurse)':
      return { pathname: '/(nurse)/appointment/[id]', params };
    case '/(pro)':
      return { pathname: '/(pro)/appointment/[id]', params };
    case '/(preleveur)':
      return { pathname: '/(preleveur)/appointment/[id]', params };
    case '/(patient)':
      return { pathname: '/(patient)/appointment/[id]', params };
  }
}

/** Replanification staff ; le patient passe par `edit-schedule`, hors de ce parcours. */
export function appointmentEditHref(prefix: RoleRoutePrefix, appointmentId: string): Href | null {
  const params = { id: appointmentId };
  switch (prefix) {
    case '/(nurse)':
      return { pathname: '/(nurse)/appointment/[id]/edit', params };
    case '/(pro)':
      return { pathname: '/(pro)/appointment/[id]/edit', params };
    case '/(preleveur)':
      return { pathname: '/(preleveur)/appointment/[id]/edit', params };
    case '/(patient)':
      return null;
  }
}

/** Onglet liste des rendez-vous du rôle (accueil Missions pour le préleveur). */
export function appointmentsListHref(prefix: RoleRoutePrefix): Href {
  switch (prefix) {
    case '/(nurse)':
      return '/(nurse)/(tabs)/appointments';
    case '/(pro)':
      return '/(pro)/(tabs)/appointments';
    case '/(preleveur)':
      return '/(preleveur)/(tabs)';
    case '/(patient)':
      return '/(patient)/(tabs)/appointments';
  }
}

/** Création de RDV : assistant staff, ou réservation patient (`relative_id` pour un proche). */
export function bookingNewHref(prefix: RoleRoutePrefix, params: RouteParams = {}): Href {
  switch (prefix) {
    case '/(nurse)':
      return { pathname: '/(nurse)/appointments/new', params };
    case '/(pro)':
      return { pathname: '/(pro)/appointments/new', params };
    case '/(preleveur)':
      return { pathname: '/(preleveur)/appointments/new', params };
    case '/(patient)':
      return { pathname: '/(patient)/booking/new', params };
  }
}

export type StaffPatientSection = 'documents' | 'prescriptions' | 'history' | 'health-record';

/** Fiche patient staff, ou l'une de ses sous-pages. */
export function staffPatientHref(
  prefix: StaffRoutePrefix,
  patientId: string,
  section?: StaffPatientSection,
  extra: RouteParams = {},
): Href {
  const params = { ...extra, id: patientId };
  const pro = prefix === '/(pro)';
  switch (section) {
    case undefined:
      return pro ? { pathname: '/(pro)/patient/[id]', params } : { pathname: '/(nurse)/patient/[id]', params };
    case 'documents':
      return pro
        ? { pathname: '/(pro)/patient/[id]/documents', params }
        : { pathname: '/(nurse)/patient/[id]/documents', params };
    case 'prescriptions':
      return pro
        ? { pathname: '/(pro)/patient/[id]/prescriptions', params }
        : { pathname: '/(nurse)/patient/[id]/prescriptions', params };
    case 'history':
      return pro
        ? { pathname: '/(pro)/patient/[id]/history', params }
        : { pathname: '/(nurse)/patient/[id]/history', params };
    case 'health-record':
      return pro
        ? { pathname: '/(pro)/patient/[id]/health-record', params }
        : { pathname: '/(nurse)/patient/[id]/health-record', params };
  }
}

/** Commandes envoyées (soignant) ou traitements (patient). */
export function pharmacyOrdersListHref(prefix: StaffRoutePrefix | '/(patient)'): Href {
  switch (prefix) {
    case '/(nurse)':
      return '/(nurse)/commandes-pharmacie';
    case '/(pro)':
      return '/(pro)/commandes-pharmacie';
    case '/(patient)':
      return '/(patient)/traitements';
  }
}

/** Nouvelle commande pharmacie : patient présélectionné si fourni (soignant), le patient commande pour lui. */
export function pharmacyOrderNewHref(prefix: StaffRoutePrefix | '/(patient)', patientId?: string): Href {
  const params: RouteParams = patientId ? { patientId } : {};
  switch (prefix) {
    case '/(nurse)':
      return { pathname: '/(nurse)/commandes-pharmacie/new', params };
    case '/(pro)':
      return { pathname: '/(pro)/commandes-pharmacie/new', params };
    case '/(patient)':
      return '/(patient)/traitements/new';
  }
}

/** Commande envoyée (soignant) ou traitement (patient). */
export function pharmacyOrderDetailHref(prefix: StaffRoutePrefix | '/(patient)', orderId: string): Href {
  const params = { id: orderId };
  switch (prefix) {
    case '/(nurse)':
      return { pathname: '/(nurse)/commandes-pharmacie/[id]', params };
    case '/(pro)':
      return { pathname: '/(pro)/commandes-pharmacie/[id]', params };
    case '/(patient)':
      return { pathname: '/(patient)/traitements/[id]', params };
  }
}
