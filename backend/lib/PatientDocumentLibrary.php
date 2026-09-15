<?php

declare(strict_types=1);

/** Metadata only for the authenticated patient's own document library. */
final class PatientDocumentLibrary
{
    public static function list(PDO $db, string $patientId): array
    {
        if ($patientId === '') throw new InvalidArgumentException('Patient requis');
        $query = $db->prepare("
            SELECT md.id, md.file_name, md.file_size, md.mime_type, md.document_type,
                   md.created_at, md.appointment_id, (md.uploaded_by = ?) AS can_delete
            FROM medical_documents md
            LEFT JOIN appointments a ON a.id = md.appointment_id
            WHERE md.document_type NOT IN ('care_photo', 'cancellation_photo')
              AND (a.relative_id IS NULL OR a.relative_id = '')
              AND (
                a.patient_id = ?
                OR (md.appointment_id IS NULL AND md.patient_id = ?)
                OR EXISTS (SELECT 1 FROM patient_documents pd WHERE pd.medical_document_id = md.id AND pd.patient_id = ?)
              )
            ORDER BY md.created_at DESC, md.id
        ");
        $query->execute([$patientId, $patientId, $patientId, $patientId]);
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
}
