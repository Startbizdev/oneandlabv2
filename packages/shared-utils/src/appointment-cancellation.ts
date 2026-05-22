/** source: frontend/utils/appointment-cancellation.ts */
export function canViewCancellationPhoto(role: string | null | undefined): boolean {
  if (!role) return false;
  return ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'].includes(role);
}
