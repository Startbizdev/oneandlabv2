<?php

declare(strict_types=1);

require_once __DIR__ . '/../../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../../lib/Uuid.php';

/**
 * Données jetables des tests Cary : profils neufs par test (quotas de débit et historique isolés), rendez-vous,
 * documents. `cleanup()` supprime tout ce qui a été créé (les tables IA suivent par cascade sur profiles).
 */
final class AiTestFixtures
{
    /** @var list<string> */
    private array $profiles = [];
    /** @var list<string> */
    private array $appointments = [];
    /** @var list<string> */
    private array $documents = [];

    public function __construct(private readonly PDO $db)
    {
    }

    public function profile(string $role): string
    {
        $id = TestFixtures::insertProfile($this->db, $role);
        $this->profiles[] = $id;

        return $id;
    }

    public function appointment(string $patientId, ?string $nurseId = null, string $status = 'pending'): string
    {
        $id = Uuid::v4();
        $this->db->prepare('
            INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type, assigned_nurse_id,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, patient_id
            ) VALUES (?, \'blood_test\', ?, ?, \'patient\', \'blood_test\', ?, 48.86, 2.35, \'fixture-addr\', \'fixture-dek\', NOW(), ?)
        ')->execute([$id, $status, $patientId, $nurseId, $patientId]);
        $this->appointments[] = $id;

        return $id;
    }

    public function document(string $uploadedBy, ?string $patientId, ?string $appointmentId = null, string $type = 'resultats'): string
    {
        $id = Uuid::v4();
        $this->db->prepare('
            INSERT INTO medical_documents (id, appointment_id, patient_id, uploaded_by, document_type, file_name, file_path, file_size, mime_type)
            VALUES (?, ?, ?, ?, ?, \'bilan.pdf\', ?, 10, \'application/pdf\')
        ')->execute([$id, $appointmentId, $patientId, $uploadedBy, $type, '/uploads/medical/' . $id . '/bilan.pdf.encrypted']);
        $this->documents[] = $id;

        return $id;
    }

    public function cleanup(): void
    {
        foreach ($this->documents as $id) {
            $this->db->prepare('DELETE FROM medical_documents WHERE id = ?')->execute([$id]);
        }
        if ($this->profiles !== []) {
            $marks = implode(',', array_fill(0, count($this->profiles), '?'));
            $this->db->prepare("DELETE FROM ai_appointment_drafts WHERE user_id IN ($marks)")->execute($this->profiles);
            $this->db->prepare("DELETE FROM appointments WHERE patient_id IN ($marks) OR created_by IN ($marks)")
                ->execute([...$this->profiles, ...$this->profiles]);
        }
        foreach ($this->appointments as $id) {
            $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$id]);
        }
        foreach ($this->profiles as $id) {
            $this->db->prepare('DELETE FROM notifications WHERE user_id = ?')->execute([$id]);
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
        }
        $this->profiles = [];
        $this->appointments = [];
        $this->documents = [];
    }
}
