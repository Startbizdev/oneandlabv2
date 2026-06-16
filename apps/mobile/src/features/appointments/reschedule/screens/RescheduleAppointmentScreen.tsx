import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { User } from 'lucide-react-native';
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
  reschedulePatientDisplayName,
  reschedulePatientPhone,
  reschedulePatientTitleName,
} from '../utils/reschedule-patient-display';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  appointmentId: string;
  role: string;
  basePath: string;
}

export function RescheduleAppointmentScreen({
  appointmentId, role, basePath }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_reschedule_screens_RescheduleAppointmentScreen_tsx_styles');
  const r = useRescheduleAppointment({ appointmentId, role, basePath });
  const scrollConfig = useStackScrollConfig(styles.content);

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
    const patientTitle = reschedulePatientTitleName(r.appointment);

    return (
      <StackChromeScreen>
        <FormScreen
          contentContainerStyle={scrollConfig.contentContainerStyle}
          {...spreadTabSceneScrollProps(scrollConfig)}
          footer={
          <View style={styles.footer}>
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
          onSelect={r.setChoiceMode}
        />
      </FormScreen>
      </StackChromeScreen>
    );
  }

  const patientName = reschedulePatientDisplayName(r.appointment);
  const patientPhone = reschedulePatientPhone(r.appointment);

  return (
    <StackChromeScreen>
      <FormScreen
        contentContainerStyle={scrollConfig.contentContainerStyle}
        {...spreadTabSceneScrollProps(scrollConfig)}
        footer={
        <View style={styles.footer}>
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
      <Pressable onPress={r.goBackToChoice} style={styles.backLink}>
        <Text style={styles.backLinkText}>← Retour au choix</Text>
      </Pressable>

      <Row wrap align="center" gap={spacing[2]} style={styles.patientBanner}>
        <User size={16} color={c.textSecondary} strokeWidth={2} />
        <Text style={styles.patientName}>{patientName}</Text>
        {patientPhone ? <Text style={styles.patientPhone}>· {patientPhone}</Text> : null}
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
        onAvailabilityType={(t) => r.setField('availability_type', t)}
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

function buildStyles(c: AppColors) {
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
    paddingBottom: spacing[3],
    backgroundColor: c.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  backLink: {
    alignSelf: 'flex-start' as const,
  },
  backLinkText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.primary,
  },
  patientBanner: {
    minWidth: 0,
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
  },
  patientName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  patientPhone: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
};
}

