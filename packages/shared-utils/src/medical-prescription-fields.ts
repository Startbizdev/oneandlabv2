export const MEDICAL_PRESCRIPTION_ALD_LABEL =
  "Prescriptions relatives au traitement de l'ALD";

export const MEDICAL_PRESCRIPTION_HORS_ALD_LABEL =
  "Prescriptions sans rapport avec l'ALD";

export const MEDICAL_PRESCRIPTION_FIELD_PLACEHOLDER = 'Prescription 1\nPrescription 2';

export interface MedicalPrescriptionFields {
  ald: string;
  horsAld: string;
}

export function hasMedicalPrescriptionContent(fields: MedicalPrescriptionFields): boolean {
  return fields.ald.trim().length > 0 || fields.horsAld.trim().length > 0;
}

export function composeMedicalPrescriptionText(fields: MedicalPrescriptionFields): string {
  const parts: string[] = [];
  const ald = fields.ald.trim();
  const horsAld = fields.horsAld.trim();
  if (ald !== '') {
    parts.push(`${MEDICAL_PRESCRIPTION_ALD_LABEL}\n${ald}`);
  }
  if (horsAld !== '') {
    parts.push(`${MEDICAL_PRESCRIPTION_HORS_ALD_LABEL}\n${horsAld}`);
  }
  return parts.join('\n\n');
}

export function parseMedicalPrescriptionText(text: string): MedicalPrescriptionFields {
  const raw = text.trim();
  if (raw === '') {
    return { ald: '', horsAld: '' };
  }

  const aldIdx = raw.indexOf(MEDICAL_PRESCRIPTION_ALD_LABEL);
  const horsIdx = raw.indexOf(MEDICAL_PRESCRIPTION_HORS_ALD_LABEL);

  if (aldIdx === -1 && horsIdx === -1) {
    return { ald: raw, horsAld: '' };
  }

  const extract = (label: string, start: number, end: number): string => {
    const bodyStart = start + label.length;
    let chunk = raw.slice(bodyStart, end).replace(/^\s*\n+/, '').trim();
    return chunk;
  };

  let ald = '';
  let horsAld = '';

  if (aldIdx !== -1) {
    const end = horsIdx !== -1 && horsIdx > aldIdx ? horsIdx : raw.length;
    ald = extract(MEDICAL_PRESCRIPTION_ALD_LABEL, aldIdx, end);
  }
  if (horsIdx !== -1) {
    const end = raw.length;
    horsAld = extract(MEDICAL_PRESCRIPTION_HORS_ALD_LABEL, horsIdx, end);
  }

  return { ald, horsAld };
}

export function buildMedicalPrescriptionSections(
  fields: MedicalPrescriptionFields,
): Array<{ title: string; body: string }> {
  const sections: Array<{ title: string; body: string }> = [];
  const ald = fields.ald.trim();
  const horsAld = fields.horsAld.trim();
  if (ald !== '') {
    sections.push({ title: MEDICAL_PRESCRIPTION_ALD_LABEL, body: ald });
  }
  if (horsAld !== '') {
    sections.push({ title: MEDICAL_PRESCRIPTION_HORS_ALD_LABEL, body: horsAld });
  }
  return sections;
}
