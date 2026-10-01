/** Miroir de `AiBookingAccess::ROLES` : le préleveur crée ses demandes via « Demander un prélèvement ». */
const AI_BOOKING_ROLES: readonly string[] = ['patient', 'pro', 'nurse'];

export function canBookWithCaryAi(role: string): boolean {
  return AI_BOOKING_ROLES.includes(role);
}
