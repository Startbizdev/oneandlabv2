import { View } from 'react-native';
import { SheetModal, PROFILE_SHEET_SNAP_POINTS } from '@/components/ui/SheetModal';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import {
  PublicProfileContactActions,
  PublicProfileInfoCard,
  PublicProfileLinks,
  PublicProfileSection,
} from '@/features/profile/components/public-profile/PublicProfileParts';
import {
  professionalProfileDisplayName,
  type ProfessionalProfileData,
} from '@/features/profile/utils/professional-profile-sheet';
import { AppText, spacing, useStyles } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: ProfessionalProfileData;
  /** Nom connu côté RDV (repli si le profil n'a ni prénom ni nom). */
  title?: string;
}

export function ProfessionalProfileSheet({ visible, onClose, profile, title }: Props) {
  const styles = useStyles(buildStyles);
  const displayName = professionalProfileDisplayName({
    ...profile,
    displayName: profile.displayName?.trim() || title,
  });
  const emploi = profile.emploi?.trim();
  const adeli = profile.adeli?.trim();

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Professionnel de santé"
      snapPoints={PROFILE_SHEET_SNAP_POINTS}
    >
      <View style={styles.body}>
        <ProfileHero
          name={displayName}
          subtitle={emploi}
          profileImageUrl={profile.profileImageUrl}
          coverImageUrl={profile.coverImageUrl}
          showCover
        />

        <PublicProfileContactActions phone={profile.phone} />

        {profile.biography?.trim() ? (
          <PublicProfileSection title="Présentation">
            <AppText variant="body">{profile.biography.trim()}</AppText>
          </PublicProfileSection>
        ) : null}

        <PublicProfileInfoCard
          title="Identification"
          rows={[{ key: 'adeli', label: 'N° Adeli', value: adeli || 'Non renseigné' }]}
        />

        <PublicProfileLinks website={profile.websiteUrl} social={profile.socialLinks} />
      </View>
    </SheetModal>
  );
}

function buildStyles() {
  return {
    body: { gap: spacing[6], paddingBottom: spacing[4] },
  };
}
