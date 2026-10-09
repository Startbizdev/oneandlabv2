<?php

declare(strict_types=1);

/** Requêtes liste documents pour GET /medical-documents?appointment_id= (ordonnances remplacées exclues). */
final class MedicalDocumentListQuery
{
    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $appointment
     * @return list<array<string, mixed>>
     */
    public static function listForAppointment(PDO $db, array $user, array $appointment, string $appointmentId): array
    {
        $patientId = $appointment['patient_id'] ?? null;
        $relativeId = $appointment['relative_id'] ?? null;

        if ($patientId && $relativeId) {
            $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
            if ($tableExists) {
                $stmt = $db->prepare('
                    SELECT
                        md.id,
                        md.appointment_id,
                        md.uploaded_by,
                        md.file_name,
                        md.file_size,
                        md.mime_type,
                        COALESCE(prd.document_type, md.document_type) AS document_type,
                        md.encrypted,
                        md.created_at
                    FROM medical_documents md
                    LEFT JOIN patient_relative_documents prd
                        ON prd.medical_document_id = md.id
                        AND prd.patient_id = ?
                        AND prd.relative_id = ?
                    WHERE md.appointment_id = ? AND md.replaced_by_document_id IS NULL
                    ORDER BY md.created_at DESC
                ');
                $stmt->execute([$patientId, $relativeId, $appointmentId]);
            } else {
                $stmt = $db->prepare('
                    SELECT
                        id,
                        appointment_id,
                        uploaded_by,
                        file_name,
                        file_size,
                        mime_type,
                        document_type,
                        encrypted,
                        created_at
                    FROM medical_documents
                    WHERE appointment_id = ? AND replaced_by_document_id IS NULL
                    ORDER BY created_at DESC
                ');
                $stmt->execute([$appointmentId]);
            }
        } elseif ($patientId) {
            $stmt = $db->prepare('
                SELECT
                    md.id,
                    md.appointment_id,
                    md.uploaded_by,
                    md.file_name,
                    md.file_size,
                    md.mime_type,
                    COALESCE(pd.document_type, md.document_type) AS document_type,
                    md.encrypted,
                    md.created_at
                FROM medical_documents md
                LEFT JOIN patient_documents pd ON pd.medical_document_id = md.id AND pd.patient_id = ?
                WHERE md.appointment_id = ? AND md.replaced_by_document_id IS NULL
                ORDER BY md.created_at DESC
            ');
            $stmt->execute([$patientId, $appointmentId]);
        } else {
            $stmt = $db->prepare('
                SELECT
                    id,
                    appointment_id,
                    uploaded_by,
                    file_name,
                    file_size,
                    mime_type,
                    document_type,
                    encrypted,
                    created_at
                FROM medical_documents
                WHERE appointment_id = ? AND replaced_by_document_id IS NULL
                ORDER BY created_at DESC
            ');
            $stmt->execute([$appointmentId]);
        }

        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($documents as &$d) {
            $d['source'] = 'appointment';
        }
        unset($d);

        return self::mergePatientProfileDocuments($db, $user, $patientId, $relativeId, $documents);
    }

    /**
     * @param array<string, mixed> $user
     * @param list<array<string, mixed>> $documents
     * @return list<array<string, mixed>>
     */
    private static function mergePatientProfileDocuments(
        PDO $db,
        array $user,
        ?string $patientId,
        ?string $relativeId,
        array $documents
    ): array {
        $profileMergeTypes = ['carte_vitale', 'carte_mutuelle', 'attestation_droits_ame', 'autres_assurances'];
        $canMergeProfileDocs = $patientId && (
            ($user['role'] ?? '') === 'patient'
            || in_array($user['role'] ?? '', ['lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'super_admin'], true)
        );
        if ($canMergeProfileDocs && ($user['role'] ?? '') === 'patient' && (string) $patientId !== (string) $user['user_id']) {
            $canMergeProfileDocs = false;
        }
        if (!$canMergeProfileDocs) {
            return $documents;
        }

        $patientDocs = [];
        if ($relativeId) {
            $tableExists = $db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
            if ($tableExists) {
                $stmtPat = $db->prepare('
                    SELECT
                        md.id,
                        md.appointment_id,
                        md.uploaded_by,
                        md.file_name,
                        md.file_size,
                        md.mime_type,
                        COALESCE(prd.document_type, md.document_type) AS document_type,
                        md.encrypted,
                        md.created_at
                    FROM patient_relative_documents prd
                    JOIN medical_documents md ON prd.medical_document_id = md.id
                    WHERE prd.patient_id = ? AND prd.relative_id = ?
                    AND md.document_type <> \'care_photo\'
                    ORDER BY prd.document_type, md.created_at DESC
                ');
                $stmtPat->execute([$patientId, $relativeId]);
                $patientDocs = $stmtPat->fetchAll(PDO::FETCH_ASSOC);
            }
        } else {
            $stmtPat = $db->prepare('
                SELECT
                    md.id,
                    md.appointment_id,
                    md.uploaded_by,
                    md.file_name,
                    md.file_size,
                    md.mime_type,
                    COALESCE(pd.document_type, md.document_type) AS document_type,
                    md.encrypted,
                    md.created_at
                FROM patient_documents pd
                JOIN medical_documents md ON pd.medical_document_id = md.id
                WHERE pd.patient_id = ?
                AND md.document_type <> \'care_photo\'
                ORDER BY pd.document_type, md.created_at DESC
            ');
            $stmtPat->execute([$patientId]);
            $patientDocs = $stmtPat->fetchAll(PDO::FETCH_ASSOC);
        }

        $appointmentDocIds = array_column($documents, 'id');
        foreach ($patientDocs as $pd) {
            $canonicalType = (string) ($pd['document_type'] ?? '');
            if ($canonicalType === 'care_photo' || !in_array($canonicalType, $profileMergeTypes, true)) {
                continue;
            }
            if (in_array($pd['id'], $appointmentDocIds, true)) {
                continue;
            }
            $replacedExisting = false;
            foreach ($documents as $idx => $d) {
                if (($d['document_type'] ?? '') !== $canonicalType) {
                    continue;
                }
                if (($d['source'] ?? 'appointment') !== 'appointment') {
                    continue;
                }
                $aptCreated = strtotime($d['created_at'] ?? '') ?: 0;
                $profileCreated = strtotime($pd['created_at'] ?? '') ?: 0;
                if ($profileCreated > $aptCreated) {
                    unset($documents[$idx]);
                    $documents = array_values($documents);
                    $pd['source'] = 'patient_profile';
                    $pd['profile_newer_than_appointment'] = true;
                    $documents[] = $pd;
                    $replacedExisting = true;
                }
                break;
            }
            if ($replacedExisting) {
                continue;
            }
            $typeAlreadyOnAppointment = false;
            foreach ($documents as $d) {
                if (($d['document_type'] ?? '') === $canonicalType) {
                    $typeAlreadyOnAppointment = true;
                    break;
                }
            }
            if ($typeAlreadyOnAppointment) {
                continue;
            }
            $pd['source'] = 'patient_profile';
            $documents[] = $pd;
        }

        return $documents;
    }
}
