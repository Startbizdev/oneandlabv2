<?php

declare(strict_types=1);

/**
 * Liste unifiée des documents d'un dossier patient (profil + RDV).
 */
final class PatientDossierDocuments
{
    /** @var list<string> */
    private const PROFILE_DOC_TYPES = ['carte_vitale', 'carte_mutuelle', 'autres_assurances'];

    /** @var list<string> */
    private const EXCLUDED_RDV_TYPES = ['care_photo', 'cancellation_photo'];

    /**
     * @return list<array<string, mixed>>
     */
    public static function listForPatient(PDO $db, string $patientId): array
    {
        $stmt = $db->prepare('
            SELECT
                pd.id,
                pd.document_type,
                pd.created_at,
                pd.updated_at,
                pd.medical_document_id as pd_medical_document_id,
                md.id as medical_document_id,
                md.file_name,
                md.file_size,
                md.mime_type,
                md.created_at as uploaded_at
            FROM patient_documents pd
            LEFT JOIN medical_documents md ON pd.medical_document_id = md.id
            WHERE pd.patient_id = ?
            ORDER BY pd.document_type
        ');
        $stmt->execute([$patientId]);
        $profileRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $profileTypesPresent = [];
        $linkedMedicalIds = [];
        $merged = [];

        foreach ($profileRows as $row) {
            if (empty($row['medical_document_id'])) {
                continue;
            }
            $row['source'] = 'profile';
            $merged[] = $row;
            $type = (string) ($row['document_type'] ?? '');
            if ($type !== '') {
                $profileTypesPresent[$type] = true;
            }
            $linkedMedicalIds[(string) $row['medical_document_id']] = true;
        }

        $placeholders = implode(',', array_fill(0, count(self::EXCLUDED_RDV_TYPES), '?'));
        $rdvStmt = $db->prepare("
            SELECT
                md.id,
                md.id as medical_document_id,
                md.document_type,
                md.created_at,
                md.updated_at,
                md.file_name,
                md.file_size,
                md.mime_type,
                md.created_at as uploaded_at,
                md.appointment_id,
                a.scheduled_at as appointment_scheduled_at
            FROM medical_documents md
            INNER JOIN appointments a ON a.id = md.appointment_id
            WHERE a.patient_id = ?
              AND (a.relative_id IS NULL OR a.relative_id = '')
              AND md.document_type IS NOT NULL
              AND md.document_type NOT IN ($placeholders)
            ORDER BY md.created_at DESC
        ");
        $rdvStmt->execute(array_merge([$patientId], self::EXCLUDED_RDV_TYPES));
        $rdvRows = $rdvStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rdvRows as $row) {
            $medicalId = (string) ($row['medical_document_id'] ?? '');
            if ($medicalId === '' || isset($linkedMedicalIds[$medicalId])) {
                continue;
            }
            $type = (string) ($row['document_type'] ?? '');
            if (
                $type !== ''
                && isset($profileTypesPresent[$type])
                && in_array($type, self::PROFILE_DOC_TYPES, true)
            ) {
                continue;
            }
            $row['source'] = 'appointment';
            $merged[] = $row;
        }

        usort($merged, static function (array $a, array $b): int {
            $typeOrder = static function (string $type): int {
                $idx = array_search($type, self::PROFILE_DOC_TYPES, true);
                if ($idx !== false) {
                    return (int) $idx;
                }

                return 100;
            };
            $aType = (string) ($a['document_type'] ?? '');
            $bType = (string) ($b['document_type'] ?? '');
            $typeCmp = $typeOrder($aType) <=> $typeOrder($bType);
            if ($typeCmp !== 0) {
                return $typeCmp;
            }
            $aAt = strtotime((string) ($a['uploaded_at'] ?? $a['created_at'] ?? '')) ?: 0;
            $bAt = strtotime((string) ($b['uploaded_at'] ?? $b['created_at'] ?? '')) ?: 0;

            return $bAt <=> $aAt;
        });

        return $merged;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listForRelative(PDO $db, string $patientId, string $relativeId): array
    {
        $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
        if (!$tableExists) {
            return [];
        }

        $stmt = $db->prepare('
            SELECT
                prd.id,
                prd.document_type,
                prd.created_at,
                prd.updated_at,
                prd.medical_document_id as pd_medical_document_id,
                md.id as medical_document_id,
                md.file_name,
                md.file_size,
                md.mime_type,
                md.created_at as uploaded_at
            FROM patient_relative_documents prd
            LEFT JOIN medical_documents md ON prd.medical_document_id = md.id
            WHERE prd.patient_id = ? AND prd.relative_id = ?
            ORDER BY prd.document_type
        ');
        $stmt->execute([$patientId, $relativeId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $valid = [];
        foreach ($rows as $row) {
            if (empty($row['medical_document_id'])) {
                continue;
            }
            $row['source'] = 'profile';
            $valid[] = $row;
        }

        return $valid;
    }
}
