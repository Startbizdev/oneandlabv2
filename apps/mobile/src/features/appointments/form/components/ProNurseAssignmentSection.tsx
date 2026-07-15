import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Input } from '@/components/ui/Input';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import type { LinkedNurseRow } from '@/features/patients/api/linked-nurses.service';
import type { NurseAssignmentMode } from '../utils/pro-nurse-assignment';

interface Props {
  mode: NurseAssignmentMode;
  onModeChange: (mode: NurseAssignmentMode) => void;
  linkedNurses: LinkedNurseRow[];
  linkedNursesLoading: boolean;
  selectedLinkedNurseId: string;
  onSelectLinkedNurse: (id: string) => void;
  externalPhone: string;
  onExternalPhoneChange: (v: string) => void;
}

export function ProNurseAssignmentSection({
  mode,
  onModeChange,
  linkedNurses,
  linkedNursesLoading,
  selectedLinkedNurseId,
  onSelectLinkedNurse,
  externalPhone,
  onExternalPhoneChange,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'ProNurseAssignmentSection');

  const externalActive = !selectedLinkedNurseId && Boolean(externalPhone.trim());

  return (
    <View style={styles.card}>
      <AppText style={styles.title}>Affectation infirmier(ère)</AppText>
      <AppText style={styles.subtitle}>
        Dispatch Cary (par défaut) ou infirmier(ère) du patient.
      </AppText>

      <Row gap={spacing[2]}>
        <Pressable
          onPress={() => onModeChange('cary_dispatch')}
          style={[styles.modePill, mode === 'cary_dispatch' && styles.modePillActive]}
        >
          <AppText style={[styles.modeText, mode === 'cary_dispatch' && styles.modeTextActive]}>
            Trouver sur Cary
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => onModeChange('patient_nurse')}
          style={[styles.modePill, mode === 'patient_nurse' && styles.modePillActive]}
        >
          <AppText style={[styles.modeText, mode === 'patient_nurse' && styles.modeTextActive]}>
            Infirmier du patient
          </AppText>
        </Pressable>
      </Row>

      {mode === 'patient_nurse' ? (
        <View style={styles.body}>
          <AppText style={styles.fieldLabel}>Choisir dans la liste</AppText>
          {linkedNursesLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : linkedNurses.length === 0 ? (
            <AppText style={styles.hint}>Aucun infirmier Cary connu pour ce patient.</AppText>
          ) : (
            <Row wrap gap={spacing[2]}>
              {linkedNurses.map((n) => {
                const on = selectedLinkedNurseId === n.id;
                return (
                  <Pressable
                    key={n.id}
                    disabled={externalActive}
                    onPress={() => onSelectLinkedNurse(on ? '' : n.id)}
                    style={[styles.nursePill, on && styles.nursePillActive, externalActive && styles.disabled]}
                  >
                    <AppText style={[styles.nursePillText, on && styles.nursePillTextActive]}>
                      {n.display_name}
                    </AppText>
                  </Pressable>
                );
              })}
            </Row>
          )}

          <AppText style={styles.orLabel}>ou inviter par SMS</AppText>

          <Input
            label="Téléphone mobile de l'infirmier(ère)"
            value={externalPhone}
            onChangeText={onExternalPhoneChange}
            editable={!selectedLinkedNurseId}
            placeholder="06 12 34 56 78"
            keyboardType="phone-pad"
          />
          <AppText style={styles.hint}>
            Un SMS avec votre nom, celui du patient et le lien Cary sera envoyé.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.45,
    },
    modePill: {
      flex: 1,
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[2],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center' as const,
    },
    modePillActive: {
      backgroundColor: c.primaryLight,
      borderColor: c.primaryMid,
    },
    modeText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      textAlign: 'center' as const,
    },
    modeTextActive: {
      color: c.primary,
    },
    body: { gap: spacing[3] },
    fieldLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    orLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      textAlign: 'center' as const,
    },
    nursePill: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    nursePillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    nursePillText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    nursePillTextActive: { color: c.textInverse },
    disabled: { opacity: 0.45 },
    loader: { alignSelf: 'flex-start' as const },
  };
}
