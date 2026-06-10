export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  score?: 0 | 1 | 2 | 3 | 4;
}

/** Règles alignées backend Validation::password */
export function validatePasswordStrength(
  password: string,
  email?: string | null,
): PasswordValidationResult {
  if (password.length < 8) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 8 caractères.', score: 0 };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Le mot de passe doit contenir au moins une lettre et un chiffre.',
      score: 1,
    };
  }
  const normalizedEmail = email?.trim().toLowerCase() ?? '';
  if (normalizedEmail && password.toLowerCase() === normalizedEmail) {
    return { valid: false, error: 'Le mot de passe ne peut pas être identique à votre email.', score: 2 };
  }

  let score: 2 | 3 | 4 = 2;
  if (password.length >= 12) score = 3;
  if (/[^A-Za-z0-9]/.test(password) && password.length >= 10) score = 4;

  return { valid: true, score };
}

export function passwordsMatch(a: string, b: string): boolean {
  return a === b && a.length > 0;
}
