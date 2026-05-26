export type ProfileSocialLinks = {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
};

export function parseProfileSocialLinks(
  raw: ProfileSocialLinks | null | undefined,
): Required<ProfileSocialLinks> {
  return {
    facebook: raw?.facebook?.trim() ?? '',
    linkedin: raw?.linkedin?.trim() ?? '',
    instagram: raw?.instagram?.trim() ?? '',
  };
}

/** Aligné web `profile/index.vue` — null si tous les champs vides. */
export function serializeProfileSocialLinks(
  links: ProfileSocialLinks,
): ProfileSocialLinks | null {
  const facebook = links.facebook?.trim() ?? '';
  const linkedin = links.linkedin?.trim() ?? '';
  const instagram = links.instagram?.trim() ?? '';
  if (!facebook && !linkedin && !instagram) return null;
  return { facebook, linkedin, instagram };
}
