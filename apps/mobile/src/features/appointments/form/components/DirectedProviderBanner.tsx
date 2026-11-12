import { UserRound, X } from 'lucide-react-native';
import type { DirectedProviderType } from '@oneandlab/shared-utils';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { ICON_STROKE_WIDTH, iconSize, radius, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

const CARE_SCOPE: Record<DirectedProviderType, string> = {
  nurse: 'Soins infirmiers',
  lab: 'Prises de sang',
  // Le pro (médecin, centre) adresse la demande : il ne se déplace pas.
  pro: 'Une infirmière ou un laboratoire de votre secteur viendra chez vous',
};

/** Titre du bandeau et du récapitulatif : on réserve « avec » un soignant, on est « adressé par » un pro. */
export function directedProviderTitle(name: string, type: DirectedProviderType): string {
  return type === 'pro' ? `Adressé par ${name}` : `Avec ${name}`;
}

export function directedProviderScope(type: DirectedProviderType): string {
  return CARE_SCOPE[type];
}

interface Props {
  name: string;
  type: DirectedProviderType;
  onRemove: () => void;
}

/** Soignant présélectionné (« Mes donneurs de soins ») ; le retirer rouvre tout le catalogue. */
export function DirectedProviderBanner({ name, type, onRemove }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  return (
    <ListRowShell
      style={styles.banner}
      leading={<UserRound size={iconSize.md} color={c.primaryDark} strokeWidth={ICON_STROKE_WIDTH} />}
      title={directedProviderTitle(name, type)}
      hint={CARE_SCOPE[type]}
      trailing={
        <IconActionButton label={`Retirer ${name}`} onPress={onRemove}>
          <X size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        </IconActionButton>
      }
    />
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    banner: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
    },
  };
}
