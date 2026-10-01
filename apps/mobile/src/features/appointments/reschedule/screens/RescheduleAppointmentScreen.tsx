import { useAppColors } from '@/theme/use-app-colors';

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppointmentDetailLoadError } from '../../detail/components/AppointmentDetailLoadError';
import { ArrowLeft, User } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { FormScreen } from '@/components/layout/FormScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import { CategoryPicker } from '../../form/components/CategoryPicker';
import { FormScheduleSection } from '../../form/components/FormScheduleSection';
import { RescheduleChoiceStep } from '../components/RescheduleChoiceStep';
import { useRescheduleAppointment } from '../hooks/useRescheduleAppointment';
import {
  reschedulePatientName,
  reschedulePatientPhone,
} from '../utils/reschedule-patient-display';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import type { RoleRoutePrefix } from '@/navigation/role-route-prefix';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  appointmentId: string;
  role: string;
  basePath: RoleRoutePrefix;
}

export function RescheduleAppointmentScreen({
  appointmentId, role, basePath }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const r = useRescheduleAppointment({ appointmentId, role, basePath });
  const { footerPadding } = useSceneBottomInset();

  if (r.loadError) {
    return (
      <StackChromeScreen>
        <AppointmentDetailLoadError
          error={r.loadError}
          onRetry={() => void r.retryLoad()}
          onBack={() => router.back()}
        />
      </StackChromeScreen>
    );
  }

  if (r.loading || !r.appointment) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <ActivityIndicator color={c.primary} />
        </View>
      </StackChromeScreen>
    );
  }

  if (r.step === 'choice') {
    const patientTitle = reschedulePatientName(r.appointment) || 'ce patient';

    return (
      <StackChromeScreen>
        <FormScreen
          contentContainerStyle={styles.content}
          footer={
          <View style={[styles.footer, { paddingBottom: footerPadding }]}>
            <Button
              title="Suivant"
              onPress={r.goToForm}
              disabled={!r.choiceMode}
              fullWidth
              size="lg"
            />
          </View>
        }
      >
        <RescheduleChoiceStep
          patientName={patientTitle}
          choiceMode={r.choiceMode}
          canReplace={r.canReplace}
          onSelect={r.setChoiceMode}
        />
      </FormScreen>
      </StackChromeScreen>
    );
  }

  const patientName = reschedulePatientName(r.appointment) || 'Patient';
  const patientPhone = reschedulePatientPhone(r.appointment);

  return (
    <StackChromeScreen>
      <FormScreen
        contentContainerStyle={styles.content}
        footer={
        <View style={[styles.footer, { paddingBottom: footerPadding }]}>
          <Button
            title={r.saving ? 'Enregistrement…' : r.submitLabel}
            onPress={r.submit}
            disabled={r.saving}
            fullWidth
            size="lg"
          />
        </View>
      }
    >
      <Button
        title="Retour au choix"
        variant="ghost"
        size="sm"
        style={styles.backLink}
        leftIcon={<ArrowLeft size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />}
        onPress={r.goBackToChoice}
      />

      <Row wrap align="center" gap={spacing[2]} style={styles.patientBanner}>
        <User size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        <AppText style={styles.patientName}>{patientName}</AppText>
        {patientPhone ? <AppText style={styles.patientPhone}>· {patientPhone}</AppText> : null}
      </Row>

      <CategoryPicker
        categories={r.categories}
        selectedId={r.form.category_id}
        onSelect={(cat) => r.setField('category_id', cat.id)}
      />

      <FormScheduleSection
        scheduledAt={r.form.scheduled_at}
        serviceType={r.appointment.type}
        availabilityType={r.form.availability_type}
        range={r.form.availability_range}
        onScheduledAt={(v) => r.setField('scheduled_at', v)}
        onAvailabilityType={(t) => {
          if (t === 'urgent') return;
          r.setField('availability_type', t);
        }}
        onRange={(range) => r.setField('availability_range', range)}
      />

      <AddressAutocomplete
        value={r.form.address}
        complement={r.form.address_complement}
        onChange={(addr) => r.setField('address', addr)}
        onComplementChange={(v) => r.setField('address_complement', v)}
      />

      <Input
        label="Note interne"
        value={r.form.notes}
        onChangeText={(v) => r.setField('notes', v)}
        placeholder="Optionnel"
        multiline
      />
    </FormScreen>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  loading: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: c.background,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  backLink: {
    alignSelf: 'flex-start' as const,
    // Aligne l'icône du bouton ghost `sm` sur le bord du contenu.
    marginLeft: -spacing[4],
  },
  patientBanner: {
    minWidth: 0,
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
  },
  patientName: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  patientPhone: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
};
}

