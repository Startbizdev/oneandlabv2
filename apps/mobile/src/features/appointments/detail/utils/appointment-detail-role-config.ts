export type AppointmentDetailRole = 'patient' | 'nurse' | 'pro' | 'preleveur';

export type AppointmentDetailRoleConfig = {
  showPeopleBlock: boolean;
  showTeamBlock: boolean;
  showLocationBlock: boolean;
  showActionsBlock: boolean;
  showOfferBlock: boolean;
  showPrescriptionBlock: boolean;
  showCarePhotosBlock: boolean;
  showShareBlock: boolean;
  showDocumentsBlock: boolean;
  showPatientEngagement: boolean;
  showProReviewBlock: boolean;
  enablePolling: boolean;
  canReschedule: boolean;
};

const CONFIG: Record<AppointmentDetailRole, AppointmentDetailRoleConfig> = {
  patient: {
    showPeopleBlock: true,
    showTeamBlock: true,
    showLocationBlock: false,
    showActionsBlock: false,
    showOfferBlock: false,
    showPrescriptionBlock: false,
    showCarePhotosBlock: false,
    showShareBlock: false,
    showDocumentsBlock: true,
    showPatientEngagement: true,
    showProReviewBlock: false,
    enablePolling: true,
    canReschedule: false,
  },
  nurse: {
    showPeopleBlock: false,
    showTeamBlock: false,
    showLocationBlock: false,
    showActionsBlock: true,
    showOfferBlock: true,
    showPrescriptionBlock: false,
    showCarePhotosBlock: true,
    showShareBlock: true,
    showDocumentsBlock: true,
    showPatientEngagement: false,
    showProReviewBlock: false,
    enablePolling: true,
    canReschedule: true,
  },
  pro: {
    showPeopleBlock: false,
    showTeamBlock: false,
    showLocationBlock: false,
    showActionsBlock: true,
    showOfferBlock: false,
    showPrescriptionBlock: true,
    showCarePhotosBlock: true,
    showShareBlock: false,
    showDocumentsBlock: true,
    showPatientEngagement: false,
    showProReviewBlock: true,
    enablePolling: false,
    canReschedule: true,
  },
  preleveur: {
    showPeopleBlock: false,
    showTeamBlock: false,
    showLocationBlock: false,
    showActionsBlock: true,
    showOfferBlock: false,
    showPrescriptionBlock: false,
    showCarePhotosBlock: false,
    showShareBlock: false,
    showDocumentsBlock: true,
    showPatientEngagement: false,
    showProReviewBlock: false,
    enablePolling: false,
    canReschedule: true,
  },
};

export function getAppointmentDetailRoleConfig(role: string): AppointmentDetailRoleConfig {
  if (role in CONFIG) return CONFIG[role as AppointmentDetailRole];
  return CONFIG.patient;
}

export function reschedulePathForRole(role: string, id: string): string | null {
  if (role === 'nurse') return `/(nurse)/appointment/${id}/edit`;
  if (role === 'pro') return `/(pro)/appointment/${id}/edit`;
  if (role === 'preleveur') return `/(preleveur)/appointment/${id}/edit`;
  return null;
}
