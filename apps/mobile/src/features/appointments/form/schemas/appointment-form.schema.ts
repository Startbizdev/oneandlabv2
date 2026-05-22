import { isValidBirthDateIso } from '@oneandlab/shared-utils';
import { z } from 'zod';

const addressSchema = z.object({
  label: z.string().min(1, "L'adresse est obligatoire"),
  lat: z.number().finite(),
  lng: z.number().finite(),
});

export const appointmentFormSchema = z.object({
  patient_id: z.string().optional(),
  is_new_patient: z.boolean(),
  first_name: z.string().min(1, 'Le prénom est obligatoire'),
  last_name: z.string().min(1, 'Le nom est obligatoire'),
  email: z.string().optional(),
  phone: z.string().min(1, 'Le téléphone est obligatoire'),
  gender: z.string().min(1, 'Le genre est obligatoire'),
  birth_date: z
    .string()
    .min(1, 'La date de naissance est obligatoire')
    .refine((v) => isValidBirthDateIso(v), {
      message: 'Indiquez le jour, le mois et l’année de naissance.',
    }),
  address: addressSchema
    .nullable()
    .optional()
    .refine((a) => a != null && a.label?.trim(), { message: "L'adresse est obligatoire" }),
  type: z.string().min(1),
  category_id: z.string().min(1, 'Le type de soin est obligatoire'),
  scheduled_at: z.string().min(1, 'La date souhaitée est obligatoire'),
  availability_type: z.enum(['all_day', 'custom']),
  availability_range: z.tuple([z.number(), z.number()]),
  blood_test_type: z.string().optional(),
  duration_days: z.string().optional(),
  custom_days: z.number().optional(),
  frequency: z.string().optional(),
  preferred_nurse_gender: z.string().optional(),
  notes: z.string().optional(),
  files: z
    .record(
      z.string(),
      z.object({ uri: z.string(), name: z.string(), mimeType: z.string().optional() }).optional(),
    )
    .optional(),
});

export type AppointmentFormSchema = z.infer<typeof appointmentFormSchema>;
