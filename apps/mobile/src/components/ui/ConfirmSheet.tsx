import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText, spacing, useStyles, font, type Theme } from '@/theme';
import { Button } from './Button';
import { SheetModal } from './SheetModal';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  /** Conséquence de l'action, en une ou deux phrases. */
  message?: string;
  /** Récapitulatif optionnel (ex. RDV annulé : date, soignant). */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `destructive` : suppression, annulation, déconnexion. */
  tone?: 'destructive' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  /** Sheet retirée : naviguer ou ouvrir une autre vue ici (`useAfterSheetDismiss`). */
  onDismissed?: () => void;
}

/** Confirmation avant une action importante ou irréversible. */
export function ConfirmSheet({
  visible,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel = 'Annuler',
  tone = 'destructive',
  loading = false,
  onConfirm,
  onClose,
  onDismissed,
}: ConfirmSheetProps) {
  const styles = useStyles(buildStyles);

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title={title}
      dismissible={!loading}
      footer={
        <View style={styles.actions}>
          <Button
            title={confirmLabel}
            variant={tone === 'destructive' ? 'destructive' : 'primary'}
            size="lg"
            fullWidth
            loading={loading}
            onPress={onConfirm}
          />
          <Button
            title={cancelLabel}
            variant="ghost"
            size="lg"
            fullWidth
            disabled={loading}
            onPress={onClose}
          />
        </View>
      }
    >
      {message ? <AppText style={styles.message}>{message}</AppText> : null}
      {children}
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    message: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: Math.round(fontSize.base * 1.5),
      color: c.textSecondary,
    },
    actions: {
      gap: spacing[2],
    },
  };
}
