<?php

require_once __DIR__ . '/PrescriptionPdf.php';

class PrescriptionService
{
    public const KIND_MEDICAL = 'medical';
    public const KIND_NURSING = 'nursing';

    /** Mots-clés médicaments interdits en prescription infirmière (actes only). */
    private const NURSING_FORBIDDEN_PATTERNS = [
        '/\b(mg|ml|cp|comprim[eé]|gélule|sirop|antibiotique|doliprane|paracétamol|ibuprofène|amoxicilline)\b/ui',
    ];

    public static function resolveKindForRole(string $role, ?string $requestedKind): string
    {
        if ($role === 'nurse') {
            return self::KIND_NURSING;
        }
        if ($role === 'pro' || $role === 'super_admin') {
            return $requestedKind === self::KIND_NURSING ? self::KIND_NURSING : self::KIND_MEDICAL;
        }

        throw new InvalidArgumentException('Rôle non autorisé pour la génération d\'ordonnance');
    }

    public static function validatePrescriberCredentials(string $role, array $prescriber): ?string
    {
        if ($role === 'nurse') {
            $adeli = trim((string) ($prescriber['adeli'] ?? ''));
            if ($adeli === '') {
                return 'Numéro ADELI requis pour générer une prescription d\'actes infirmiers.';
            }

            return null;
        }

        if (in_array($role, ['pro', 'super_admin'], true)) {
            $rpps = trim((string) ($prescriber['rpps'] ?? ''));
            if ($rpps === '') {
                return 'Numéro RPPS requis pour générer une ordonnance médicale.';
            }

            return null;
        }

        return 'Rôle non autorisé';
    }

    public static function validatePrescriptionText(string $kind, string $text): ?string
    {
        $text = trim($text);
        if ($text === '') {
            return 'Le contenu de la prescription est requis';
        }
        if (strlen($text) > 10000) {
            return 'La prescription ne doit pas dépasser 10 000 caractères';
        }

        if ($kind === self::KIND_NURSING) {
            foreach (self::NURSING_FORBIDDEN_PATTERNS as $pattern) {
                if (preg_match($pattern, $text)) {
                    return 'Les prescriptions infirmières ne peuvent porter que sur des actes de soins (pas de médicaments).';
                }
            }
        }

        return null;
    }

    public static function generatePrescriptionNumber(): string
    {
        return 'RX-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    /**
     * @return array{pdf_base64: string, file_name: string, prescription_number: string, prescription_kind: string}
     */
    public static function generatePdf(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        string $kind,
        ?string $prescriptionNumber = null
    ): array {
        $number = $prescriptionNumber ?: self::generatePrescriptionNumber();
        $pdfContent = PrescriptionPdf::generate($prescriber, $patient, $prescriptionText, [
            'kind' => $kind,
            'prescription_number' => $number,
        ]);

        return [
            'pdf_base64' => base64_encode($pdfContent),
            'file_name' => 'ordonnance-' . $number . '.pdf',
            'prescription_number' => $number,
            'prescription_kind' => $kind,
        ];
    }

    /**
     * @return array{data: array<int, array<string, mixed>>, pagination: array<string, int>}
     */
    public static function listPrescriptions(
        PDO $db,
        Crypto $crypto,
        string $profileId,
        string $role,
        int $page,
        int $limit,
        ?string $patientId = null
    ): array {
        $page = max(1, $page);
        if ($limit < 1) {
            $limit = 20;
        }
        if ($limit > 100) {
            $limit = 100;
        }
        $offset = ($page - 1) * $limit;

        $where = 'md.uploaded_by = ? AND md.document_type = \'ordonnance\'';
        $params = [$profileId];

        if ($role === 'nurse') {
            $where .= ' AND (md.prescription_kind = \'nursing\' OR md.prescription_kind IS NULL)';
        } elseif ($role === 'pro') {
            $where .= ' AND (md.prescription_kind IS NULL OR md.prescription_kind IN (\'medical\', \'nursing\'))';
        }

        if ($patientId) {
            $where .= ' AND a.patient_id = ?';
            $params[] = $patientId;
        }

        $countStmt = $db->prepare("SELECT COUNT(*) AS total FROM medical_documents md LEFT JOIN appointments a ON a.id = md.appointment_id WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        $pages = $total > 0 ? (int) ceil($total / $limit) : 1;

        $sql = "
            SELECT
                md.id,
                md.appointment_id,
                md.file_name,
                md.file_size,
                md.mime_type,
                md.prescription_kind,
                md.prescription_number,
                md.generated_at,
                md.created_at,
                a.scheduled_at AS appointment_scheduled_at,
                a.status AS appointment_status,
                a.patient_id,
                p.first_name_encrypted AS patient_fn_enc,
                p.first_name_dek AS patient_fn_dek,
                p.last_name_encrypted AS patient_ln_enc,
                p.last_name_dek AS patient_ln_dek
            FROM medical_documents md
            LEFT JOIN appointments a ON a.id = md.appointment_id
            LEFT JOIN profiles p ON p.id = a.patient_id
            WHERE {$where}
            ORDER BY COALESCE(md.generated_at, md.created_at) DESC
            LIMIT ? OFFSET ?
        ";
        $stmt = $db->prepare($sql);
        $bindIndex = 1;
        foreach ($params as $param) {
            $stmt->bindValue($bindIndex++, $param, PDO::PARAM_STR);
        }
        $stmt->bindValue($bindIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($bindIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $safeDecrypt = static function ($encrypted, $dek) use ($crypto) {
            if ($encrypted === null || $encrypted === '' || $dek === null || $dek === '') {
                return '';
            }
            try {
                return $crypto->decryptField((string) $encrypted, (string) $dek);
            } catch (Throwable $e) {
                return '';
            }
        };

        $out = [];
        foreach ($rows as $row) {
            $row['patient_first_name'] = $safeDecrypt($row['patient_fn_enc'] ?? null, $row['patient_fn_dek'] ?? null);
            $row['patient_last_name'] = $safeDecrypt($row['patient_ln_enc'] ?? null, $row['patient_ln_dek'] ?? null);
            unset($row['patient_fn_enc'], $row['patient_fn_dek'], $row['patient_ln_enc'], $row['patient_ln_dek']);
            $out[] = $row;
        }

        return [
            'data' => $out,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => $pages,
            ],
        ];
    }

    public static function canGenerateForAppointment(array $user, array $appointment, PDO $db): bool
    {
        $hasAccess = (
            ($appointment['assigned_nurse_id'] ?? '') === ($user['user_id'] ?? '') ||
            ($appointment['created_by'] ?? '') === ($user['user_id'] ?? '') ||
            ($user['role'] ?? '') === 'super_admin'
        );

        if (!$hasAccess && ($appointment['type'] ?? '') === 'blood_test') {
            require_once __DIR__ . '/LabTeamAccess.php';
            $teamIds = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role'] ?? '');
            if (in_array($appointment['assigned_lab_id'] ?? '', $teamIds, true)
                || (!empty($appointment['assigned_to']) && in_array($appointment['assigned_to'], $teamIds, true))) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess && ($user['role'] ?? '') === 'pro') {
            require_once __DIR__ . '/../models/User.php';
            $userModel = new User();
            if (
                ($appointment['created_by'] ?? '') === ($user['user_id'] ?? '')
                || $userModel->hasProfessionalAccessToPatient($user['user_id'], (string) ($appointment['patient_id'] ?? ''))
            ) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess && ($user['role'] ?? '') === 'nurse') {
            $hasAccess = ($appointment['assigned_nurse_id'] ?? '') === ($user['user_id'] ?? '')
                && ($appointment['type'] ?? '') === 'nursing';
        }

        return $hasAccess;
    }
}
