<?php

declare(strict_types=1);

require_once __DIR__ . '/../../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../../lib/Crypto.php';
require_once __DIR__ . '/../../../lib/Uuid.php';
require_once __DIR__ . '/../../../lib/MedicalDocumentsInternal.php';

/**
 * Données jetables des tests de l'assistant : profils neufs nommés (quotas et historique isolés), rendez-vous,
 * documents chiffrés. `cleanup()` supprime tout (les tables assistant_* suivent par cascade sur profiles).
 */
final class AssistantFixtures
{
    /** @var list<string> */
    private array $profiles = [];
    /** @var list<string> */
    private array $documents = [];

    public function __construct(private readonly PDO $db)
    {
    }

    public function profile(string $role, string $firstName = 'Profil', string $lastName = 'Test', ?string $birthDate = null): string
    {
        $id = TestFixtures::insertProfile($this->db, $role);
        $this->profiles[] = $id;
        $crypto = new Crypto();
        $first = $crypto->encryptField($firstName);
        $last = $crypto->encryptField($lastName);
        $birth = $birthDate !== null ? $crypto->encryptField($birthDate) : ['encrypted' => null, 'dek' => null];
        $this->db->prepare('
            UPDATE profiles SET first_name_encrypted = ?, first_name_dek = ?, last_name_encrypted = ?, last_name_dek = ?,
                birth_date_encrypted = ?, birth_date_dek = ? WHERE id = ?
        ')->execute([$first['encrypted'], $first['dek'], $last['encrypted'], $last['dek'], $birth['encrypted'], $birth['dek'], $id]);

        return $id;
    }

    public function appointment(string $patientId, ?string $nurseId, string $status = 'confirmed', string $when = '+1 day 09:30'): string
    {
        $id = Uuid::v4();
        $this->db->prepare('
            INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type, assigned_nurse_id,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, patient_id
            ) VALUES (?, \'nursing\', ?, ?, \'patient\', \'nursing\', ?, 48.86, 2.35, \'fixture-addr\', \'fixture-dek\', ?, ?)
        ')->execute([$id, $status, $patientId, $nurseId, (new DateTimeImmutable($when))->format('Y-m-d H:i:s'), $patientId]);

        return $id;
    }

    /** Document chiffré sur disque (uploads/medical), comme un dépôt réel. */
    public function document(string $uploadedBy, string $patientId, string $mime, string $bytes): string
    {
        $id = bin2hex(random_bytes(16));
        $encrypted = (new Crypto())->encryptFile($bytes);
        $dir = MedicalDocumentsInternal::backendRoot() . '/uploads/medical/' . $id;
        mkdir($dir, 0755, true);
        file_put_contents($dir . '/doc.encrypted', base64_decode($encrypted['encrypted']));
        $this->db->prepare('
            INSERT INTO medical_documents (id, appointment_id, patient_id, uploaded_by, document_type, file_name, file_path, file_size, mime_type, file_dek)
            VALUES (?, NULL, ?, ?, \'ordonnance\', \'doc\', ?, ?, ?, ?)
        ')->execute([$id, $patientId, $uploadedBy, '/uploads/medical/' . $id . '/doc.encrypted', strlen($bytes), $mime, $encrypted['dek']]);
        $this->documents[] = $id;

        return $id;
    }

    public function cleanup(): void
    {
        foreach ($this->documents as $id) {
            $this->db->prepare('DELETE FROM medical_documents WHERE id = ?')->execute([$id]);
            MedicalDocumentsInternal::deleteStoredFile('/uploads/medical/' . $id . '/doc.encrypted');
        }
        if ($this->profiles !== []) {
            $marks = implode(',', array_fill(0, count($this->profiles), '?'));
            $this->db->prepare("DELETE FROM appointments WHERE patient_id IN ($marks) OR created_by IN ($marks)")->execute([...$this->profiles, ...$this->profiles]);
            foreach ($this->profiles as $id) {
                $this->db->prepare('DELETE FROM notifications WHERE user_id = ?')->execute([$id]);
                $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
            }
        }
        $this->profiles = [];
        $this->documents = [];
    }
}
