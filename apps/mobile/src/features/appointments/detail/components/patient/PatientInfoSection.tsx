import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Linking, StyleSheet, View } from 'react-native';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { Users } from 'lucide-react-native';
import { spacing, AppText } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { fontFamily, fontSize } from '@/theme/typography';
import {
  beneficiaryBirthLine,
  beneficiaryDisplayName,
  bookingContactEmail,
  bookingContactFullName,
  bookingContactPhone,
  patientContactEmail,
  patientPhone,
  relationshipLine,
  showBookingContactBlock,
} from '../../utils/patient-appointment-display';
import {
  PatientActionChips,
  PatientListCard,
  PatientListRow,
  PatientRowValue,
} from './PatientListPrimitives';

type AptExt = Appointment & {
  relative?: {
    first_name?: string;
    last_name?: string;
    relationship_type?: string;
    is_minor?: boolean;
    age_years?: number;
  };
};

function contactActions(phone: string, emailHref: string | null) {
  const actions: { label: string; onPress: () => void }[] = [];
  const tel = phone.replace(/\s/g, '');
  if (tel) {
    actions.push({ label: 'Appeler', onPress: () => void Linking.openURL(`tel:${tel}`) });
    actions.push({ label: 'Message', onPress: () => void Linking.openURL(`sms:${tel}`) });
  }
  if (emailHref) {
    actions.push({ label: 'E-mail', onPress: () => void Linking.openURL(emailHref) });
  }
  return actions;
}

function EmailBlock({ text, href }: { text: string; href: string | null }) {
  if (!text) return null;
  return <PatientRowValue text={text} muted={!href} />;
}

interface Props {
  apt: Appointment;
  viewer: AuthUser | null;
}

export function PatientInfoSection({ apt, viewer }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_patient_PatientInfoSection_tsx_PatientInfoSection_styles');

  const ext = apt as AptExt;
  const hasRelative = Boolean(ext.relative);
  const birth = beneficiaryBirthLine(apt);
  const rel = relationshipLine(apt);
  const phone = patientPhone(apt);
  const email = patientContactEmail(apt, viewer ?? undefined);

  const showBc = showBookingContactBlock(apt);
  const bcName = bookingContactFullName(apt);
  const bcPhone = bookingContactPhone(apt);
  const bcEmail = bookingContactEmail(apt, viewer ?? undefined);

  const beneficiaryLabel = hasRelative ? 'Bénéficiaire' : 'Patient';

  if (!apt.form_data && !ext.relative) return null;

  return (
    <PatientListCard title="Personnes" Icon={Users}>
      {hasRelative ? (
        <PatientListRow label="Pour qui" highlight={false}>
          <PatientRowValue
            text={`${ext.relative!.first_name ?? ''} ${ext.relative!.last_name ?? ''}`.trim() || '—'}
            sub={rel || undefined}
          />
        </PatientListRow>
      ) : null}

      <PatientListRow label={beneficiaryLabel} last={!showBc && !ext.relative?.is_minor}>
        <PatientRowValue
          text={beneficiaryDisplayName(apt)}
          sub={[birth, hasRelative && rel ? `Lien : ${rel}` : ''].filter(Boolean).join('\n') || undefined}
        />
        <EmailBlock text={email.text} href={email.href} />
        <PatientActionChips actions={contactActions(phone, email.href)} />
      </PatientListRow>

      {ext.relative?.is_minor === true ? (
        <View
          style={[
            styles.minorBanner,
            { backgroundColor: c.warningLight, borderTopColor: c.warningMid },
          ]}
        >
          <AppText style={[styles.minorText, { color: c.warning }]}>
            <AppText style={styles.minorBold}>Personne mineure</AppText>
            {ext.relative.age_years != null
              ? ` (${ext.relative.age_years} an${ext.relative.age_years === 1 ? '' : 's'})`
              : ''}
            {' · '}
            Le rendez-vous est réservé par le titulaire du compte (contact principal ci-dessous),
            habilité à représenter le patient.
          </AppText>
        </View>
      ) : null}

      {showBc ? (
        <PatientListRow label="Contact principal" last>
          <PatientRowValue
            text={bcName || '—'}
            sub="Titulaire du compte · personne qui a pris le rendez-vous"
          />
          <EmailBlock text={bcEmail.text} href={bcEmail.href} />
          <PatientActionChips actions={contactActions(bcPhone, bcEmail.href)} />
        </PatientListRow>
      ) : null}
    </PatientListCard>
  );
}

function buildStyles(c: AppColors) {
  return {
  minorBanner: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  minorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.45,
  },
  minorBold: {
    fontFamily: fontFamily.semiBold,
  },
};
}
