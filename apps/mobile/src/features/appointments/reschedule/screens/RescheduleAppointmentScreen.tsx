import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarPlus, RefreshCcw, User } from 'lucide-react-native';
import { FormScreen } from '@/components/layout/FormScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import { CategoryPicker } from '../../form/components/CategoryPicker';
import { FormScheduleSection } from '../../form/components/FormScheduleSection';
import { useRescheduleAppointment } from '../hooks/useRescheduleAppointment';
import {
  reschedulePatientDisplayName,
  reschedulePatientPhone,
} from '../utils/reschedule-patient-display';
import type { RescheduleChoiceMode } from '../utils/build-reschedule-payload';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  appointmentId: string;
  role: string;
  basePath: string;
}

const CHOICES: {
  mode: RescheduleChoiceMode;
  title: string;
  description: string;
  icon: typeof RefreshCcw;
}[] = [
  {
    mode: 'cancel_and_new',
    title: 'Remplacer le RDV',
    description: 'Annuler l’ancien, créer le nouveau.',
    icon: RefreshCcw,
  },
  {
    mode: 'create_only',
    title: 'Créer un nouveau RDV',
    description: 'L’ancien reste inchangé.',
    icon: CalendarPlus,
  },
];

export function RescheduleAppointmentScreen({ appointmentId, role, basePath }: Props) {
  const r = useRescheduleAppointment({ appointmentId, role, basePath });

  if (r.loading || !r.appointment) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (r.step === 'choice') {
    return (
      <FormScreen
        contentContainerStyle={styles.content}
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
        <Text style={styles.intro}>
          Choisissez comment reprendre ce rendez-vous, puis continuez.
        </Text>
        <View style={styles.choiceGrid}>
          {CHOICES.map((c) => {
            const on = r.choiceMode === c.mode;
            const Icon = c.icon;
            return (
              <Pressable
                key={c.mode}
                onPress={() => r.setChoiceMode(c.mode)}
                style={[styles.choiceCard, on && styles.choiceCardActive]}
              >
                <Icon size={24} color={on ? colors.primary : colors.textSecondary} strokeWidth={1.75} />
                <Text style={[styles.choiceTitle, on && styles.choiceTitleActive]}>{c.title}</Text>
                <Text style={styles.choiceDesc}>{c.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </FormScreen>
    );
  }

  const patientName = reschedulePatientDisplayName(r.appointment);
  const patientPhone = reschedulePatientPhone(r.appointment);

  return (
    <FormScreen
      contentContainerStyle={styles.content}
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

      <View style={styles.patientBanner}>
        <User size={16} color={colors.textSecondary} strokeWidth={2} />
        <Text style={styles.patientName}>{patientName}</Text>
        {patientPhone ? <Text style={styles.patientPhone}>· {patientPhone}</Text> : null}
      </View>

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
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  intro: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  choiceGrid: {
    gap: spacing[3],
  },
  choiceCard: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: colors.surface,
  },
  choiceCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  choiceTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  choiceTitleActive: {
    color: colors.primaryDark,
  },
  choiceDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
  backLink: {
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  patientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  patientName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  patientPhone: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
