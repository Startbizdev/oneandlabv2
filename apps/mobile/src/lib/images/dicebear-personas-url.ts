/**
 * Avatars de repli DiceBear Personas (CC BY 4.0 — https://www.dicebear.com/styles/personas/)
 * quand aucune photo de profil n’est disponible.
 */
import { normalizeProfileGender, type ProfileGender } from '@/lib/images/profile-gender';

const PERSONAS_CDN = 'https://api.dicebear.com/9.x/personas/png';

const MALE_HAIR = [
  'buzzcut',
  'fade',
  'shortCombover',
  'shortComboverChops',
  'sideShave',
  'balding',
  'bald',
  'mohawk',
  'cap',
  'beanie',
  'bunUndercut',
] as const;

const FEMALE_HAIR = [
  'long',
  'bobCut',
  'bobBangs',
  'curly',
  'pigtails',
  'curlyBun',
  'curlyHighTop',
  'straightBun',
  'extraLong',
] as const;

/** Seed stable pour un même visage (nom, id, e-mail…). */
export function avatarDisplaySeed(...parts: (string | null | undefined)[]): string {
  const joined = parts
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return joined || 'cary-user';
}

function personasOptionsForGender(gender: ProfileGender | null): Record<string, string> {
  if (!gender) return {};
  if (gender === 'male') {
    return {
      facialHairProbability: '50',
      hair: MALE_HAIR.join(','),
    };
  }
  if (gender === 'female') {
    return {
      facialHairProbability: '0',
      hair: FEMALE_HAIR.join(','),
    };
  }
  return { facialHairProbability: '15' };
}

export function personasAvatarUrl(
  seed: string,
  sizePx = 128,
  gender?: string | null,
): string {
  const normalized = normalizeProfileGender(gender);
  const baseSeed = seed.trim() || 'cary-user';
  const safeSeed = normalized ? `${baseSeed}#${normalized}` : baseSeed;
  const size = Math.min(512, Math.max(32, Math.round(sizePx)));
  const params = new URLSearchParams({
    seed: safeSeed,
    size: String(size),
    backgroundColor: 'd1f7f3',
    backgroundType: 'solid',
  });
  const genderOpts = personasOptionsForGender(normalized);
  for (const [key, value] of Object.entries(genderOpts)) {
    params.set(key, value);
  }
  return `${PERSONAS_CDN}?${params.toString()}`;
}
