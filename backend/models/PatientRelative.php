<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../lib/Logger.php';

/**
 * Modèle PatientRelative
 * Gestion des proches des patients
 */
class PatientRelative
{
    private PDO $db;
    private Crypto $crypto;
    private Logger $logger;

    public function __construct()
    {
        $config = require __DIR__ . '/../config/database.php';

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );

        $this->db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        $this->crypto = new Crypto();
        $this->logger = new Logger();
    }

    /**
     * Génère un UUID
     */
    private function generateUUID(): string
    {
        return bin2hex(random_bytes(18));
    }

    /**
     * Crée un nouveau proche
     */
    public function create(array $data, string $patientId): string
    {
        $id = $this->generateUUID();

        // Chiffrer les champs obligatoires
        $firstNameData = $this->crypto->encryptField($data['first_name']);
        $firstNameEncrypted = $firstNameData['encrypted'];
        $firstNameDek = $firstNameData['dek'];
        
        $lastNameData = $this->crypto->encryptField($data['last_name']);
        $lastNameEncrypted = $lastNameData['encrypted'];
        $lastNameDek = $lastNameData['dek'];

        // Préparer les champs optionnels
        $emailEncrypted = null;
        $emailDek = null;
        $emailHash = null;
        if (!empty($data['email'])) {
            $emailData = $this->crypto->encryptField($data['email']);
            $emailEncrypted = $emailData['encrypted'];
            $emailDek = $emailData['dek'];
            $emailHash = hash('sha256', strtolower($data['email']));
        }

        $phoneEncrypted = null;
        $phoneDek = null;
        if (!empty($data['phone'])) {
            $phoneData = $this->crypto->encryptField($data['phone']);
            $phoneEncrypted = $phoneData['encrypted'];
            $phoneDek = $phoneData['dek'];
        }

        $addressEncrypted = null;
        $addressDek = null;
        if (!empty($data['address'])) {
            // Convertir en JSON si c'est un array (cas adresse avec lat/lng/label)
            $addressToEncrypt = is_array($data['address']) ? json_encode($data['address']) : $data['address'];
            $addressData = $this->crypto->encryptField($addressToEncrypt);
            $addressEncrypted = $addressData['encrypted'];
            $addressDek = $addressData['dek'];
        }

        $genderEncrypted = null;
        $genderDek = null;
        if (!empty($data['gender'])) {
            $genderData = $this->crypto->encryptField($data['gender']);
            $genderEncrypted = $genderData['encrypted'];
            $genderDek = $genderData['dek'];
        }

        $birthDateEncrypted = null;
        $birthDateDek = null;
        if (!empty($data['birth_date'])) {
            $birthDateData = $this->crypto->encryptField($data['birth_date']);
            $birthDateEncrypted = $birthDateData['encrypted'];
            $birthDateDek = $birthDateData['dek'];
        }

        $stmt = $this->db->prepare('
            INSERT INTO patient_relatives (
                id, patient_id,
                first_name_encrypted, first_name_dek,
                last_name_encrypted, last_name_dek,
                relationship_type,
                email_encrypted, email_dek, email_hash,
                phone_encrypted, phone_dek,
                address_encrypted, address_dek,
                gender_encrypted, gender_dek,
                birth_date_encrypted, birth_date_dek,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ');

        $stmt->execute([
            $id,
            $patientId,
            $firstNameEncrypted,
            $firstNameDek,
            $lastNameEncrypted,
            $lastNameDek,
            $data['relationship_type'],
            $emailEncrypted,
            $emailDek,
            $emailHash,
            $phoneEncrypted,
            $phoneDek,
            $addressEncrypted,
            $addressDek,
            $genderEncrypted,
            $genderDek,
            $birthDateEncrypted,
            $birthDateDek,
        ]);

        // Logger la création
        $this->logger->log(
            $patientId,
            'patient',
            'create',
            'patient_relative',
            $id,
            ['relationship_type' => $data['relationship_type']]
        );

        return $id;
    }

    /**
     * Récupère les proches d'un patient
     */
    public function getByPatientId(string $patientId): array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM patient_relatives
            WHERE patient_id = ?
            ORDER BY created_at DESC
        ');
        $stmt->execute([$patientId]);
        $relatives = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Déchiffrer les données
        $result = [];
        foreach ($relatives as $relative) {
            $result[] = $this->decryptRelative($relative);
        }

        return $result;
    }

    /**
     * Récupère un proche par ID
     */
    public function getById(string $id, string $patientId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM patient_relatives
            WHERE id = ? AND patient_id = ?
        ');
        $stmt->execute([$id, $patientId]);
        $relative = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$relative) {
            return null;
        }

        return $this->decryptRelative($relative);
    }

    /**
     * Met à jour un proche
     */
    public function update(string $id, array $data, string $patientId): bool
    {
        $relative = $this->getById($id, $patientId);
        if (!$relative) {
            return false;
        }

        // Préparer les champs à mettre à jour
        $updates = [];
        $params = [];

        // Champs obligatoires
        if (isset($data['first_name'])) {
            $firstNameEncrypted = $this->crypto->encryptField($data['first_name']);
            $updates[] = 'first_name_encrypted = ?, first_name_dek = ?';
            $params[] = $firstNameEncrypted['encrypted'];
            $params[] = $firstNameEncrypted['dek'];
        }

        if (isset($data['last_name'])) {
            $lastNameEncrypted = $this->crypto->encryptField($data['last_name']);
            $updates[] = 'last_name_encrypted = ?, last_name_dek = ?';
            $params[] = $lastNameEncrypted['encrypted'];
            $params[] = $lastNameEncrypted['dek'];
        }

        if (isset($data['relationship_type'])) {
            $updates[] = 'relationship_type = ?';
            $params[] = $data['relationship_type'];
        }

        // Champs optionnels
        if (isset($data['email'])) {
            if (!empty($data['email'])) {
                $emailEncrypted = $this->crypto->encryptField($data['email']);
                $emailHash = hash('sha256', strtolower($data['email']));
                $updates[] = 'email_encrypted = ?, email_dek = ?, email_hash = ?';
                $params[] = $emailEncrypted['encrypted'];
                $params[] = $emailEncrypted['dek'];
                $params[] = $emailHash;
            } else {
                $updates[] = 'email_encrypted = NULL, email_dek = NULL, email_hash = NULL';
            }
        }

        if (isset($data['phone'])) {
            if (!empty($data['phone'])) {
                $phoneData = $this->crypto->encryptField($data['phone']);
                $updates[] = 'phone_encrypted = ?, phone_dek = ?';
                $params[] = $phoneData['encrypted'];
                $params[] = $phoneData['dek'];
            } else {
                $updates[] = 'phone_encrypted = NULL, phone_dek = NULL';
            }
        }

        if (isset($data['address'])) {
            if (!empty($data['address'])) {
                $addressData = $this->crypto->encryptField($data['address']);
                $updates[] = 'address_encrypted = ?, address_dek = ?';
                $params[] = $addressData['encrypted'];
                $params[] = $addressData['dek'];
            } else {
                $updates[] = 'address_encrypted = NULL, address_dek = NULL';
            }
        }

        if (isset($data['gender'])) {
            if (!empty($data['gender'])) {
                $genderData = $this->crypto->encryptField($data['gender']);
                $updates[] = 'gender_encrypted = ?, gender_dek = ?';
                $params[] = $genderData['encrypted'];
                $params[] = $genderData['dek'];
            } else {
                $updates[] = 'gender_encrypted = NULL, gender_dek = NULL';
            }
        }

        if (isset($data['birth_date'])) {
            if (!empty($data['birth_date'])) {
                $birthDateData = $this->crypto->encryptField($data['birth_date']);
                $updates[] = 'birth_date_encrypted = ?, birth_date_dek = ?';
                $params[] = $birthDateData['encrypted'];
                $params[] = $birthDateData['dek'];
            } else {
                $updates[] = 'birth_date_encrypted = NULL, birth_date_dek = NULL';
            }
        }

        if (empty($updates)) {
            return true; // Rien à mettre à jour
        }

        $sql = 'UPDATE patient_relatives SET ' . implode(', ', $updates) . ', updated_at = NOW() WHERE id = ? AND patient_id = ?';
        $params[] = $id;
        $params[] = $patientId;

        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute($params);

        if ($result) {
            $this->logger->log(
                $patientId,
                'patient',
                'update',
                'patient_relative',
                $id,
                $data
            );
        }

        return $result;
    }

    /**
     * Supprime un proche
     */
    public function delete(string $id, string $patientId): bool
    {
        $relative = $this->getById($id, $patientId);
        if (!$relative) {
            return false;
        }

        $stmt = $this->db->prepare('DELETE FROM patient_relatives WHERE id = ? AND patient_id = ?');
        $result = $stmt->execute([$id, $patientId]);

        if ($result) {
            $this->logger->log(
                $patientId,
                'patient',
                'delete',
                'patient_relative',
                $id,
                ['relationship_type' => $relative['relationship_type']]
            );
        }

        return $result;
    }

    /**
     * Déchiffre les données d'un proche
     */
    private function decryptRelative(array $relative): array
    {
        return [
            'id' => $relative['id'],
            'patient_id' => $relative['patient_id'],
            'first_name' => $this->crypto->decryptField(
                $relative['first_name_encrypted'],
                $relative['first_name_dek']
            ),
            'last_name' => $this->crypto->decryptField(
                $relative['last_name_encrypted'],
                $relative['last_name_dek']
            ),
            'relationship_type' => $relative['relationship_type'],
            'email' => $relative['email_encrypted'] ? $this->crypto->decryptField(
                $relative['email_encrypted'],
                $relative['email_dek']
            ) : null,
            'phone' => $relative['phone_encrypted'] ? $this->crypto->decryptField(
                $relative['phone_encrypted'],
                $relative['phone_dek']
            ) : null,
            'address' => $relative['address_encrypted'] ? 
                json_decode($this->crypto->decryptField(
                    $relative['address_encrypted'],
                    $relative['address_dek']
                ), true) : null,
            'gender' => $relative['gender_encrypted'] ? $this->crypto->decryptField(
                $relative['gender_encrypted'],
                $relative['gender_dek']
            ) : null,
            'birth_date' => $relative['birth_date_encrypted'] ? $this->crypto->decryptField(
                $relative['birth_date_encrypted'],
                $relative['birth_date_dek']
            ) : null,
            'created_at' => $relative['created_at'],
            'updated_at' => $relative['updated_at'],
        ];
    }
}



