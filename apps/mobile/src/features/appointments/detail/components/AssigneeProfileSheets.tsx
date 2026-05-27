import { ProviderPublicProfileSheet } from '@/features/profile/components/ProviderPublicProfileSheet';
import { ProfessionalProfileSheet } from '@/features/profile/components/ProfessionalProfileSheet';
import type { AssigneeProfileSheetState } from '../utils/provider-public-profile';

interface Props {
  sheet: AssigneeProfileSheetState | null;
  onClose: () => void;
}

/** Bottom sheets profil intervenant — fiche native infirmier / labo ou fiche pro. */
export function AssigneeProfileSheets({ sheet, onClose }: Props) {
  if (!sheet) return null;

  if (sheet.kind === 'provider') {
    return (
      <ProviderPublicProfileSheet
        visible
        onClose={onClose}
        providerType={sheet.providerType}
        slug={sheet.slug}
        title={sheet.title}
        phone={sheet.phone}
      />
    );
  }

  return (
    <ProfessionalProfileSheet
      visible
      onClose={onClose}
      profile={sheet.profile}
      title={sheet.title}
    />
  );
}
