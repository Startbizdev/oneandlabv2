import { UserRound, X } from 'lucide-react-native';
import type { DirectedProviderType } from '@oneandlab/shared-utils';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { ICON_STROKE_WIDTH, iconSize, radius, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

const CARE_SCOPE: Record<DirectedProviderType, string> = {
  nurse: 'Soins infirmiers',
  lab: 'Prises de sang',
  pro: 'Soins et prises de sang',
};

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
      title={`Avec ${name}`}
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
