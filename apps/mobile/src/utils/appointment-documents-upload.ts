const TERMINAL_UPLOAD_STATUSES = new Set(['canceled', 'cancelled', 'refused', 'expired']);

export function canUploadMedicalDocumentsForAppointmentStatus(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return s !== '' && !TERMINAL_UPLOAD_STATUSES.has(s);
}

export function canUploadLabResultatsForAppointmentStatus(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'inprogress' || s === 'in_progress' || s === 'completed';
}
