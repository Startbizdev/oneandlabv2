<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Email.php';
require_once __DIR__ . '/EmailQueue.php';
require_once __DIR__ . '/Twilio.php';
require_once __DIR__ . '/Crypto.php';
require_once __DIR__ . '/NotificationMessageFormatter.php';

/**
 * Service de gestion des notifications
 * Crée les notifications web et envoie SMS/Email selon les besoins
 */

class NotificationService
{
    private PDO $db;
    private Email $email;
    private ?Twilio $twilio = null;
    private ?Crypto $crypto = null;

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
        $this->email = new Email();
        
        // Twilio est optionnel - ne pas bloquer si les clés ne sont pas configurées
        try {
            $this->twilio = new Twilio();
        } catch (Exception $e) {
            // Twilio non configuré - SMS désactivés
            $this->twilio = null;
        }

        try {
            $this->crypto = new Crypto();
        } catch (Exception $e) {
            $this->crypto = null;
        }
    }

    /** Téléphone déchiffré d'un profil (infirmier, labo, patient…). */
    private function resolveProfilePhone(string $profileId): ?string
    {
        try {
            require_once __DIR__ . '/../models/User.php';
            $user = (new User())->getById($profileId, 'system', 'system');
            $phone = trim((string) ($user['phone'] ?? ''));
            return $phone !== '' ? $phone : null;
        } catch (Exception $e) {
            error_log('resolveProfilePhone: ' . $e->getMessage());
            return null;
        }
    }

    /** Envoie un SMS à un professionnel si Twilio + numéro disponibles. */
    private function sendProfileSms(string $profileId, string $message): void
    {
        if ($this->twilio === null) {
            return;
        }
        $phone = $this->resolveProfilePhone($profileId);
        if ($phone === null) {
            error_log('sendProfileSms: pas de téléphone pour ' . $profileId);
            return;
        }
        $this->twilio->sendProfessionalAppointmentUpdate($phone, $message);
    }

    private function resolveProfileRole(string $profileId): string
    {
        try {
            require_once __DIR__ . '/../models/User.php';
            $user = (new User())->getById($profileId, 'system', 'system');
            return (string) ($user['role'] ?? 'nurse');
        } catch (Exception $e) {
            return 'nurse';
        }
    }

    private function professionalAppointmentSmsUrl(string $role, string $appointmentId): string
    {
        $base = rtrim((string) ($_ENV['FRONTEND_URL'] ?? 'https://cary.bio'), '/');
        if ($role === 'preleveur') {
            return $base . '/preleveur/appointments/' . rawurlencode($appointmentId);
        }
        if (in_array($role, ['lab', 'subaccount'], true)) {
            return $base . '/lab/appointments/' . rawurlencode($appointmentId);
        }
        return $base . '/nurse/appointments/' . rawurlencode($appointmentId);
    }

    /** @return array<string, array{label: string, valueLabels: array<string,string>}> */
    private function fetchCareOptionMeta(?string $categoryId): array
    {
        if ($categoryId === null || trim($categoryId) === '') {
            return [];
        }
        try {
            require_once __DIR__ . '/../models/Appointment.php';
            return (new Appointment())->fetchCareCategoryOptionMeta($categoryId);
        } catch (Exception $e) {
            error_log('fetchCareOptionMeta: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Crée une notification web
     */
    public function createNotification(
        string $userId,
        string $type,
        string $title,
        string $message,
        ?array $data = null
    ): string {
        $id = $this->generateUUID();
        
        $stmt = $this->db->prepare('
            INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ');
        
        $stmt->execute([
            $id,
            $userId,
            $type,
            $title,
            $message,
            $data ? json_encode($data) : null,
        ]);

        $this->sendPushForNotification($userId, $type, $title, $message, $data);
        
        return $id;
    }

    /**
     * Push système mobile (Expo) — ne bloque pas si indisponible.
     *
     * @param array<string, mixed>|null $data
     */
    private function sendPushForNotification(
        string $userId,
        string $type,
        string $title,
        string $message,
        ?array $data
    ): void {
        try {
            require_once __DIR__ . '/PushDeviceTokenService.php';
            require_once __DIR__ . '/ExpoPushService.php';
            $push = new ExpoPushService(new PushDeviceTokenService($this->db));
            $push->sendToUser($userId, $title, $message, $data, $type);
        } catch (Throwable $e) {
            error_log('sendPushForNotification: ' . $e->getMessage());
        }
    }

    /**
     * Notifie la création d'un nouveau rendez-vous
     * 
     * @param string $appointmentId ID du rendez-vous créé
     * @param array $appointmentData Données du rendez-vous avec les clés suivantes :
     *   - patient_id (string|null) : ID du patient
     *   - patient_email (string|null) : Email du patient
     *   - type (string) : Type de rendez-vous ('blood_test' ou 'nursing')
     *   - scheduled_at (string) : Date et heure du rendez-vous
     */
    public function notifyNewAppointment(string $appointmentId, array $appointmentData): void
    {
        // Notification au patient uniquement si patient_id est présent
        if (!empty($appointmentData['patient_id'])) {
            try {
                // Récupérer le nom de la catégorie depuis la base de données
                $careType = '';
                if (!empty($appointmentData['category_name'])) {
                    $careType = $appointmentData['category_name'];
                } else {
                    // Récupérer depuis la base de données si non fourni
                    try {
                        $stmt = $this->db->prepare('
                            SELECT c.name as category_name
                            FROM appointments a
                            LEFT JOIN care_categories c ON a.category_id = c.id
                            WHERE a.id = ?
                        ');
                        $stmt->execute([$appointmentId]);
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        if ($result && !empty($result['category_name'])) {
                            $careType = $result['category_name'];
                        } else if (!empty($appointmentData['type'])) {
                            // Fallback sur le type si category_name n'est pas disponible
                            $careType = $appointmentData['type'] === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers';
                        }
                    } catch (Exception $e) {
                        // En cas d'erreur, utiliser le type comme fallback
                        if (!empty($appointmentData['type'])) {
                            $careType = $appointmentData['type'] === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers';
                        }
                    }
                }
                
                $formData = $appointmentData['form_data'] ?? null;
                $when = NotificationMessageFormatter::whenShort($formData, $appointmentData['scheduled_at'] ?? null);
                $message = NotificationMessageFormatter::joinParts([
                    'RDV enregistré',
                    $careType ?: null,
                    $when ?: null,
                ]);

                $this->createNotification(
                    $appointmentData['patient_id'],
                    'appointment_created',
                    'RDV créé',
                    $message,
                    ['appointment_id' => $appointmentId]
                );
            } catch (Exception $e) {
                // Logger l'erreur mais ne pas bloquer le processus
                error_log("Erreur notification patient pour RDV {$appointmentId}: " . $e->getMessage());
            }
        }
        
        // Email au patient (async pour ne pas bloquer le bouton)
        if (!empty($appointmentData['patient_email'])) {
            EmailQueue::add('appointment_created', $appointmentData['patient_email'], [
                'type' => $appointmentData['type'] ?? 'blood_test',
                'scheduled_at' => $appointmentData['scheduled_at'] ?? null,
                'form_data' => $appointmentData['form_data'] ?? null,
            ]);
        }
        
        // Les notifications aux professionnels (labos, sous-labos, infirmiers) 
        // sont gérées par dispatchGeographic dans Appointment.php
        // Les notifications aux admins sont gérées par notifyAllAdmins dans Appointment.php
    }

    /**
     * Une seule notification cloche (patient + créateur + admins) lorsque plusieurs RDV
     * sont créés dans le même lot (creation_batch_id + creation_batch_size).
     *
     * @param array<int,array<string,mixed>> $rows Lignes appointments avec category_name (JOIN care_categories)
     */
    public function notifyBatchAppointmentCreationCompleted(
        string $batchId,
        string $patientId,
        array $rows,
        array $lastAppointmentData
    ): void {
        if ($rows === []) {
            return;
        }

        $n = count($rows);
        $ids = array_map(static fn ($r) => (string) ($r['id'] ?? ''), $rows);

        $batchSummaries = [];
        foreach ($rows as $r) {
            $cat = isset($r['category_name']) && trim((string) $r['category_name']) !== ''
                ? trim((string) $r['category_name'])
                : ((($r['type'] ?? '') === 'blood_test') ? 'Prélèvement' : 'Soins infirmiers');
            $fd = isset($r['form_data']) && is_array($r['form_data']) ? $r['form_data'] : null;
            $when = NotificationMessageFormatter::whenShort($fd, $r['scheduled_at'] ?? null);
            $batchSummaries[] = $when !== '' ? "{$cat} · {$when}" : $cat;
        }

        $titlePatient = $n > 1 ? 'Nouveaux rendez-vous créés' : 'Nouveau rendez-vous créé';
        $messagePatient = $n > 1
            ? "{$n} RDV enregistrés."
            : 'RDV enregistré.';

        try {
            $this->createNotification(
                $patientId,
                'appointment_created',
                $titlePatient,
                $messagePatient,
                [
                    'appointment_id' => $ids[0],
                    'appointment_ids' => $ids,
                    'creation_batch_id' => $batchId,
                ]
            );
        } catch (Exception $e) {
            error_log('notifyBatchAppointmentCreationCompleted patient: ' . $e->getMessage());
        }

        if (!empty($lastAppointmentData['patient_email'])) {
            EmailQueue::add('appointment_created', $lastAppointmentData['patient_email'], [
                'batch_summaries' => $batchSummaries,
                'type' => $rows[0]['type'] ?? 'nursing',
                'scheduled_at' => $rows[0]['scheduled_at'] ?? null,
                'form_data' => $lastAppointmentData['form_data'] ?? null,
            ]);
        }

        $first = $rows[0];
        $types = array_unique(array_map(static fn ($r) => (string) ($r['type'] ?? ''), $rows));
        $typeLabel = count($types) === 1 && ($types[0] === 'blood_test')
            ? 'Prélèvement'
            : (count($types) === 1 ? 'Soins infirmiers' : 'Rendez-vous');
        $titleAdmin = $n > 1 ? 'Nouveaux RDV' : 'Nouveau RDV';
        $messageAdmin = $n > 1
            ? "{$n} RDV ({$typeLabel}) à traiter."
            : "1 RDV ({$typeLabel}) à traiter.";

        try {
            $stmt = $this->db->prepare('
                SELECT id FROM profiles WHERE role = ? AND id IS NOT NULL
            ');
            $stmt->execute(['super_admin']);
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($admins as $admin) {
                try {
                    $this->createNotification(
                        $admin['id'],
                        'new_appointment_created',
                        $titleAdmin,
                        $messageAdmin,
                        [
                            'appointment_id' => $ids[0],
                            'appointment_ids' => $ids,
                            'creation_batch_id' => $batchId,
                            'type' => $rows[0]['type'] ?? '',
                        ]
                    );
                } catch (Exception $e) {
                    error_log('notifyBatchAppointmentCreationCompleted admin: ' . $e->getMessage());
                }
            }
        } catch (Exception $e) {
            error_log('notifyBatchAppointmentCreationCompleted admins list: ' . $e->getMessage());
        }

        try {
            require_once __DIR__ . '/AdminEmailNotifier.php';
            AdminEmailNotifier::newAppointmentsBatch(
                $n,
                $ids[0],
                $batchSummaries,
                (string) ($rows[0]['type'] ?? '')
            );
        } catch (Throwable $e) {
            error_log('notifyBatchAppointmentCreationCompleted admin email: ' . $e->getMessage());
        }

        $allPending = true;
        foreach ($rows as $r) {
            if (($r['status'] ?? '') !== 'pending') {
                $allPending = false;
                break;
            }
        }
        $creatorRole = (string) ($first['created_by_role'] ?? '');
        $creatorId = (string) ($first['created_by'] ?? '');
        if (
            !$allPending
            || $creatorId === ''
            || !in_array($creatorRole, ['pro', 'nurse', 'lab', 'subaccount'], true)
        ) {
            return;
        }

        $allBloodTest = true;
        foreach ($rows as $r) {
            if (($r['type'] ?? '') !== 'blood_test') {
                $allBloodTest = false;
                break;
            }
        }

        if ($creatorRole === 'nurse' && $allBloodTest) {
            $message = $n > 1
                ? 'En attente laboratoire · ' . $n . ' rendez-vous. Vous serez informé dès validation.'
                : 'En attente laboratoire. Vous serez informé dès validation.';

            try {
                $this->createNotification(
                    $creatorId,
                    'appointment_request_sent',
                    'Le laboratoire doit confirmer',
                    $message,
                    ['appointment_id' => $ids[0], 'appointment_ids' => $ids, 'creation_batch_id' => $batchId]
                );
            } catch (Exception $e) {
                error_log('notifyBatchAppointmentCreationCompleted nurse blood: ' . $e->getMessage());
            }

            return;
        }

        try {
            if ($creatorRole !== '' && in_array($creatorRole, ['pro', 'nurse', 'lab', 'subaccount'], true)) {
                $firstType = (string) ($first['type'] ?? 'nursing');
                if ($firstType === 'blood_test') {
                    $title = 'En attente du laboratoire';
                    $message = 'Vos demandes de prise de sang (' . $n . ') sont en attente de confirmation.';
                } else {
                    $title = 'En attente d’un infirmier';
                    $message = 'Vos demandes de soins (' . $n . ') sont en attente d’acceptation.';
                }
            } else {
                $title = 'Demande envoyée';
                $message = 'Vos ' . $n . ' demandes ont été envoyées. Vous serez informé dès acceptation.';
            }
            $this->createNotification(
                $creatorId,
                'appointment_request_sent',
                $title,
                $message,
                ['appointment_id' => $ids[0], 'appointment_ids' => $ids, 'creation_batch_id' => $batchId]
            );
        } catch (Exception $e) {
            error_log('notifyBatchAppointmentCreationCompleted creator: ' . $e->getMessage());
        }
    }

    /**
     * Notifie le créateur (pro, infirmier, lab, sous-compte) que sa demande de RDV en attente a bien été transmise.
     * Précise qui doit valider : laboratoire (prise de sang) ou infirmier (soins).
     *
     * @param string|null $creatorRole Rôle du créateur (pro, nurse, lab, subaccount) pour adapter le libellé
     */
    public function notifyProfessionalRequestSent(
        string $creatorId,
        string $appointmentId,
        string $appointmentType,
        ?string $creatorRole = null
    ): void {
        try {
            if ($creatorRole !== null && in_array($creatorRole, ['pro', 'nurse', 'lab', 'subaccount'], true)) {
                if ($appointmentType === 'blood_test') {
                    $title = 'En attente labo';
                    $message = 'Demande envoyée au laboratoire.';
                } else {
                    $title = 'En attente infirmier';
                    $message = 'Demande envoyée aux infirmiers.';
                }
            } else {
                $title = 'Demande envoyée';
                $message = 'On vous prévient dès qu’il y a une réponse.';
            }

            $this->createNotification(
                $creatorId,
                'appointment_request_sent',
                $title,
                $message,
                ['appointment_id' => $appointmentId]
            );
        } catch (Exception $e) {
            error_log('notifyProfessionalRequestSent: ' . $e->getMessage());
        }
    }

    /**
     * Infirmier : prise de sang en attente — le laboratoire assigné (ou un labo de la zone) doit confirmer.
     */
    public function notifyNurseBloodTestLabAwaitingConfirmation(
        string $nurseId,
        string $appointmentId,
        string $scheduledAt
    ): void {
        try {
            $message = 'En attente de confirmation labo.';

            $this->createNotification(
                $nurseId,
                'appointment_request_sent',
                'En attente labo',
                $message,
                ['appointment_id' => $appointmentId]
            );
        } catch (Exception $e) {
            error_log('notifyNurseBloodTestLabAwaitingConfirmation: ' . $e->getMessage());
        }
    }

    /**
     * Notifie la confirmation d'un rendez-vous
     */
    public function notifyAppointmentConfirmed(string $appointmentId, array $appointmentData): void
    {
        $formData = $appointmentData['form_data'] ?? null;
        $when = NotificationMessageFormatter::whenShort($formData, $appointmentData['scheduled_at'] ?? null);
        $message = $when !== '' ? 'Confirmé · ' . $when : 'C’est confirmé.';

        $this->createNotification(
            $appointmentData['patient_id'],
            'appointment_confirmed',
            'RDV confirmé',
            $message,
            ['appointment_id' => $appointmentId]
        );
        
        // Email confirmation au patient (async) avec lien vers détail du RDV
        if (!empty($appointmentData['patient_email'])) {
            EmailQueue::add('appointment_confirmation', $appointmentData['patient_email'], [
                'id' => $appointmentId,
                'scheduled_at' => $appointmentData['scheduled_at'] ?? null,
                'appointment_type' => ($appointmentData['type'] ?? 'blood_test') === 'nursing' ? 'nursing' : 'blood_test',
                'category_name' => $appointmentData['category_name'] ?? null,
            ]);
        }
        
        // SMS au patient (si Twilio est configuré)
        if (!empty($appointmentData['patient_phone']) && $this->twilio !== null) {
            try {
                $smsPayload = $appointmentData;
                $smsPayload['option_meta'] = $this->fetchCareOptionMeta(
                    isset($appointmentData['category_id']) ? (string) $appointmentData['category_id'] : null
                );
                $this->twilio->sendAppointmentConfirmation(
                    $appointmentData['patient_phone'],
                    $smsPayload
                );
            } catch (Exception $e) {
                error_log('notifyAppointmentConfirmed SMS patient: ' . $e->getMessage());
            }
        }
    }

    /**
     * Patient prévenu quand l'infirmier déplace un créneau depuis la tournée (ou mise à jour horaire).
     */
    public function notifyAppointmentRescheduled(string $appointmentId, ?string $nurseActorId = null): void
    {
        $stmt = $this->db->prepare('
            SELECT a.patient_id, a.type, a.scheduled_at, a.category_id,
                   a.form_data_encrypted, a.form_data_dek,
                   c.name AS category_name
            FROM appointments a
            LEFT JOIN care_categories c ON c.id = a.category_id
            WHERE a.id = ?
            LIMIT 1
        ');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$appointment || empty($appointment['patient_id'])) {
            return;
        }

        $formData = null;
        if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
            try {
                require_once __DIR__ . '/Crypto.php';
                $crypto = new Crypto();
                $formDataJson = $crypto->decryptField(
                    $appointment['form_data_encrypted'],
                    $appointment['form_data_dek'],
                );
                $decoded = json_decode($formDataJson, true);
                $formData = is_array($decoded) ? $decoded : null;
            } catch (Exception $e) {
                $formData = null;
            }
        }

        $patientId = (string) $appointment['patient_id'];
        $scheduledAt = $appointment['scheduled_at'] ?? null;
        $when = NotificationMessageFormatter::whenShort($formData, is_string($scheduledAt) ? $scheduledAt : null);
        $message = $when !== '' ? 'Nouveau créneau · ' . $when : 'Votre rendez-vous a été déplacé.';

        $this->createNotification(
            $patientId,
            'appointment_rescheduled',
            'RDV déplacé',
            $message,
            ['appointment_id' => $appointmentId],
        );

        $patientEmail = null;
        $patientPhone = null;
        if (is_array($formData) && !empty($formData['phone'])) {
            $patientPhone = trim((string) $formData['phone']);
        }
        try {
            require_once __DIR__ . '/../models/User.php';
            $userModel = new User();
            $patient = $userModel->getById($patientId, 'system', 'system');
            if ($patient) {
                $patientEmail = $patient['email'] ?? null;
                if (empty($patientPhone)) {
                    $patientPhone = $patient['phone'] ?? null;
                }
            }
        } catch (Exception $e) {
            /* ignore */
        }

        if (!empty($patientEmail)) {
            EmailQueue::add('appointment_confirmation', $patientEmail, [
                'id' => $appointmentId,
                'scheduled_at' => $scheduledAt,
                'appointment_type' => ($appointment['type'] ?? 'blood_test') === 'nursing' ? 'nursing' : 'blood_test',
                'category_name' => $appointment['category_name'] ?? null,
            ]);
        }

        if (!empty($patientPhone) && $this->twilio !== null) {
            try {
                $professionalName = 'votre infirmier';
                if ($nurseActorId) {
                    require_once __DIR__ . '/../models/User.php';
                    $nurse = (new User())->getById($nurseActorId, 'system', 'system');
                    $first = trim((string) ($nurse['first_name'] ?? ''));
                    if ($first !== '') {
                        $professionalName = $first;
                    }
                }
                $smsPayload = [
                    'id' => $appointmentId,
                    'type' => $appointment['type'] ?? 'nursing',
                    'scheduled_at' => $scheduledAt,
                    'category_name' => $appointment['category_name'] ?? null,
                    'form_data' => $formData,
                    'option_meta' => $this->fetchCareOptionMeta(
                        isset($appointment['category_id']) ? (string) $appointment['category_id'] : null,
                    ),
                ];
                $this->twilio->sendAppointmentRescheduled($patientPhone, $smsPayload, $professionalName);
            } catch (Exception $e) {
                error_log('notifyAppointmentRescheduled SMS: ' . $e->getMessage());
            }
        }
    }

    /**
     * Notifie le créateur du RDV (pro, infirmier, lab, sous-compte) que la prise en charge est confirmée.
     */
    public function notifyCreatorAppointmentConfirmed(
        string $creatorId,
        string $appointmentId,
        string $appointmentType,
        ?string $categoryName = null,
        ?string $creatorRole = null,
        ?string $scheduledAt = null
    ): void {
        $message = in_array($creatorRole, ['nurse', 'lab', 'subaccount'], true)
            ? 'Demande confirmée.'
            : 'Demande confirmée · patient prévenu.';
        $this->createNotification(
            $creatorId,
            'appointment_confirmed_for_creator',
            'RDV confirmé',
            $message,
            ['appointment_id' => $appointmentId]
        );
    }

    /**
     * Lot multisoins (nursing) : une seule notification cloche par destinataire (patient, infirmier, créateur pro/lab).
     *
     * @param array<int,array<string,mixed>> $batchRows lignes avec id, scheduled_at, category_name
     */
    public function notifyNursingBatchConfirmed(
        string $primaryAppointmentId,
        string $batchId,
        string $patientId,
        array $batchRows,
        ?string $patientEmail,
        ?string $patientPhone,
        string $patientFirstName,
        string $patientLastName,
        ?string $assignedNurseId,
        ?string $createdBy,
        ?string $createdByRole,
        ?string $actorId,
        string $addressForMessage = ''
    ): void {
        $n = count($batchRows);
        if ($n < 2) {
            return;
        }

        $ids = [];
        foreach ($batchRows as $r) {
            if (!empty($r['id'])) {
                $ids[] = (string) $r['id'];
            }
        }
        if ($ids === []) {
            return;
        }

        $batchSummaries = [];
        foreach ($batchRows as $r) {
            $cat = isset($r['category_name']) && trim((string) $r['category_name']) !== ''
                ? trim((string) $r['category_name'])
                : 'Soins infirmiers';
            $fd = isset($r['form_data']) && is_array($r['form_data']) ? $r['form_data'] : null;
            $when = NotificationMessageFormatter::whenShort($fd, $r['scheduled_at'] ?? null);
            $batchSummaries[] = $when !== '' ? $cat . ' · ' . $when : $cat;
        }

        $patientName = trim($patientFirstName . ' ' . $patientLastName);
        if ($patientName === '') {
            $patientName = 'le patient';
        }

        $dataPayload = [
            'appointment_id' => $ids[0],
            'appointment_ids' => $ids,
            'creation_batch_id' => $batchId,
        ];

        // Patient
        try {
            $this->createNotification(
                $patientId,
                'appointment_confirmed',
                'Rendez-vous confirmés',
                "{$n} RDV confirmés.",
                $dataPayload
            );
        } catch (Exception $e) {
            error_log('notifyNursingBatchConfirmed patient: ' . $e->getMessage());
        }

        if (!empty($patientEmail)) {
            EmailQueue::add('appointment_confirmation', $patientEmail, [
                'id' => $primaryAppointmentId,
                'scheduled_at' => $batchRows[0]['scheduled_at'] ?? null,
                'appointment_type' => 'nursing',
                'category_name' => $batchRows[0]['category_name'] ?? null,
                'batch_summaries' => $batchSummaries,
            ]);
        }

        if (!empty($patientPhone) && $this->twilio !== null) {
            try {
                $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://cary.bio';
                $url = rtrim($baseUrl, '/') . '/patient/appointments/' . $ids[0];
                $fd0 = isset($batchRows[0]['form_data']) && is_array($batchRows[0]['form_data'])
                    ? $batchRows[0]['form_data']
                    : [];
                $genderLabel = NotificationMessageFormatter::preferredNurseGenderLabel(
                    isset($fd0['preferred_nurse_gender']) ? (string) $fd0['preferred_nurse_gender'] : ''
                );
                $genderPart = $genderLabel !== '' ? " · {$genderLabel}" : '';
                $this->twilio->sendSMS(
                    $patientPhone,
                    "[CONFIRME] Vos {$n} rendez-vous sont confirmés{$genderPart}. Détail : {$url}"
                );
            } catch (Exception $e) {
                // Ne pas bloquer
            }
        }

        // Infirmier ayant accepté le lot (une seule notif)
        if (!empty($assignedNurseId)) {
            $msg = "Lot {$n} soins · {$patientName}.";
            try {
                $this->createNotification(
                    (string) $assignedNurseId,
                    'appointment_accepted',
                    'Lot multisoins accepté',
                    $msg,
                    array_merge($dataPayload, [
                        'patient_name' => $patientName,
                        'batch_multisoins' => true,
                    ])
                );
            } catch (Exception $e) {
                error_log('notifyNursingBatchConfirmed nurse: ' . $e->getMessage());
            }
            // Pas de SMS à l’infirmier accepteur (déjà dans l’app).
        }

        // Créateur (pro / infirmier / lab) — pas l’acteur qui vient d’accepter, pas le patient si c’est lui seul
        $createdBy = $createdBy !== null ? (string) $createdBy : '';
        $creatorRole = is_string($createdByRole) ? $createdByRole : '';
        $actorIdStr = $actorId !== null ? (string) $actorId : '';
        $sameAsPatient = $createdBy !== '' && (string) $patientId === $createdBy;

        if (
            $createdBy !== ''
            && in_array($creatorRole, ['pro', 'nurse', 'lab', 'subaccount'], true)
            && $createdBy !== $actorIdStr
            && !$sameAsPatient
        ) {
            $message = in_array($creatorRole, ['nurse', 'lab', 'subaccount'], true)
                ? "Lot {$n} soins confirmé."
                : "Lot {$n} soins confirmé · patient prévenu.";
            try {
                $this->createNotification(
                    $createdBy,
                    'appointment_confirmed_for_creator',
                    'Rendez-vous confirmés',
                    $message,
                    $dataPayload
                );
            } catch (Exception $e) {
                error_log('notifyNursingBatchConfirmed creator: ' . $e->getMessage());
            }
        }
    }

    /**
     * Lot multisoins (blood_test) : une seule notification cloche par destinataire (patient, lab/sous-compte, créateur).
     *
     * @param array<int,array<string,mixed>> $batchRows lignes avec id, scheduled_at, category_name
     */
    public function notifyBloodTestBatchConfirmed(
        string $primaryAppointmentId,
        string $batchId,
        string $patientId,
        array $batchRows,
        ?string $patientEmail,
        ?string $patientPhone,
        string $patientFirstName,
        string $patientLastName,
        ?string $assignedLabId,
        ?string $createdBy,
        ?string $createdByRole,
        ?string $actorId
    ): void {
        $n = count($batchRows);
        if ($n < 2) {
            return;
        }

        $ids = [];
        foreach ($batchRows as $r) {
            if (!empty($r['id'])) {
                $ids[] = (string) $r['id'];
            }
        }
        if ($ids === []) {
            return;
        }

        $batchSummaries = [];
        foreach ($batchRows as $r) {
            $cat = isset($r['category_name']) && trim((string) $r['category_name']) !== ''
                ? trim((string) $r['category_name'])
                : 'Prélèvement';
            $fd = isset($r['form_data']) && is_array($r['form_data']) ? $r['form_data'] : null;
            $when = NotificationMessageFormatter::whenShort($fd, $r['scheduled_at'] ?? null);
            $batchSummaries[] = $when !== '' ? $cat . ' · ' . $when : $cat;
        }

        $patientName = trim($patientFirstName . ' ' . $patientLastName);
        if ($patientName === '') {
            $patientName = 'le patient';
        }

        $dataPayload = [
            'appointment_id' => $ids[0],
            'appointment_ids' => $ids,
            'creation_batch_id' => $batchId,
        ];

        try {
            $this->createNotification(
                $patientId,
                'appointment_confirmed',
                'Rendez-vous confirmés',
                "{$n} prélèvements confirmés.",
                $dataPayload
            );
        } catch (Exception $e) {
            error_log('notifyBloodTestBatchConfirmed patient: ' . $e->getMessage());
        }

        if (!empty($patientEmail)) {
            EmailQueue::add('appointment_confirmation', $patientEmail, [
                'id' => $primaryAppointmentId,
                'scheduled_at' => $batchRows[0]['scheduled_at'] ?? null,
                'appointment_type' => 'blood_test',
                'category_name' => $batchRows[0]['category_name'] ?? null,
                'batch_summaries' => $batchSummaries,
            ]);
        }

        if (!empty($patientPhone) && $this->twilio !== null) {
            try {
                $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://cary.bio';
                $url = rtrim($baseUrl, '/') . '/patient/appointments/' . $ids[0];
                $this->twilio->sendSMS(
                    $patientPhone,
                    "[CONFIRME] Vos {$n} rendez-vous de prélèvement sont confirmés. Détail : {$url}"
                );
            } catch (Exception $e) {
                // Ne pas bloquer
            }
        }

        if (!empty($assignedLabId)) {
            $msg = "Lot {$n} prélèvements · {$patientName}.";
            try {
                $this->createNotification(
                    (string) $assignedLabId,
                    'appointment_accepted_lab',
                    'Lot prises de sang accepté',
                    $msg,
                    array_merge($dataPayload, [
                        'patient_name' => $patientName,
                        'batch_multisoins' => true,
                    ])
                );
            } catch (Exception $e) {
                error_log('notifyBloodTestBatchConfirmed lab: ' . $e->getMessage());
            }
            // Pas de SMS au pro accepteur (déjà dans l’app).
        }

        $createdBy = $createdBy !== null ? (string) $createdBy : '';
        $creatorRole = is_string($createdByRole) ? $createdByRole : '';
        $actorIdStr = $actorId !== null ? (string) $actorId : '';
        $sameAsPatient = $createdBy !== '' && (string) $patientId === $createdBy;

        if (
            $createdBy !== ''
            && in_array($creatorRole, ['pro', 'nurse', 'lab', 'subaccount'], true)
            && $createdBy !== $actorIdStr
            && !$sameAsPatient
        ) {
            $message = in_array($creatorRole, ['nurse', 'lab', 'subaccount'], true)
                ? "Lot {$n} prélèvements confirmé."
                : "Lot {$n} prélèvements confirmé · patient prévenu.";
            try {
                $this->createNotification(
                    $createdBy,
                    'appointment_confirmed_for_creator',
                    'Rendez-vous confirmés',
                    $message,
                    $dataPayload
                );
            } catch (Exception $e) {
                error_log('notifyBloodTestBatchConfirmed creator: ' . $e->getMessage());
            }
        }
    }

    /**
     * Infirmier ayant partagé le lien : le RDV a été accepté par un confrère (information — pas de lien cliquable vers le détail).
     */
    public function notifyShareLinkAppointmentTakenByColleague(
        string $sharerNurseId,
        string $acceptingNurseId,
        string $appointmentId
    ): void {
        $first = '';
        $last = '';
        try {
            require_once __DIR__ . '/../models/User.php';
            $userModel = new User();
            $acceptor = $userModel->getById($acceptingNurseId, 'system', 'system');
            if ($acceptor) {
                $first = trim((string) ($acceptor['first_name'] ?? ''));
                $last = trim((string) ($acceptor['last_name'] ?? ''));
            }
        } catch (Exception $e) {
            error_log('notifyShareLinkAppointmentTakenByColleague name: ' . $e->getMessage());
        }
        $name = trim($first . ' ' . $last);
        if ($name === '') {
            $name = 'Un confrère';
        }
        $message = 'Votre demande de relais a été acceptée par ' . $name . '.';
        try {
            $this->createNotification(
                $sharerNurseId,
                'share_link_appointment_taken',
                'RDV accepté',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'accepting_nurse_id' => $acceptingNurseId,
                    'no_navigate' => true,
                ]
            );
        } catch (Exception $e) {
            error_log('notifyShareLinkAppointmentTakenByColleague: ' . $e->getMessage());
        }
    }

    /**
     * Lab / sous-compte / préleveur : confirmation d'une prise de sang (symétrique du message infirmier).
     */
    public function notifyLabBloodTestAccepted(
        string $recipientId,
        string $appointmentId,
        array $appointmentData
    ): void {
        try {
            $patientName = 'le patient';
            if (!empty($appointmentData['patient_first_name']) || !empty($appointmentData['patient_last_name'])) {
                $n = trim(($appointmentData['patient_first_name'] ?? '') . ' ' . ($appointmentData['patient_last_name'] ?? ''));
                if ($n !== '') {
                    $patientName = $n;
                }
            }
            $care = isset($appointmentData['category_name']) && trim((string) $appointmentData['category_name']) !== ''
                ? trim((string) $appointmentData['category_name'])
                : 'Prélèvement';
            $optionMeta = $this->fetchCareOptionMeta(
                isset($appointmentData['category_id']) ? (string) $appointmentData['category_id'] : null
            );
            $details = NotificationMessageFormatter::appointmentContextShort(
                is_array($appointmentData['form_data'] ?? null) ? $appointmentData['form_data'] : [],
                $appointmentData['category_name'] ?? null,
                'blood_test',
                isset($appointmentData['scheduled_at']) ? (string) $appointmentData['scheduled_at'] : null,
                $optionMeta
            );
            $message = NotificationMessageFormatter::joinParts([
                'Prélèvement confirmé',
                $patientName !== 'le patient' ? $patientName : null,
                $details !== '' ? $details : $care,
            ]);

            $this->createNotification(
                $recipientId,
                'appointment_accepted_lab',
                'RDV confirmé',
                $message,
                ['appointment_id' => $appointmentId]
            );

            // Pas de SMS à l’acteur : il est déjà dans l’app au moment de l’acceptation.
        } catch (Exception $e) {
            error_log('notifyLabBloodTestAccepted: ' . $e->getMessage());
        }
    }

    /**
     * Réassignation manuelle : informe l’infirmier ou le préleveur (ou le lab ciblé) qu’un RDV lui est attribué.
     */
    public function notifyAppointmentReassigned(
        string $recipientId,
        string $appointmentId,
        string $appointmentType,
        string $patientDisplayName,
        string $scheduledLabel,
        ?string $categoryName = null
    ): void {
        try {
            $care = NotificationMessageFormatter::careShortLabel($categoryName, $appointmentType);
            $patient = trim($patientDisplayName) !== '' ? trim($patientDisplayName) : 'Patient';
            $message = NotificationMessageFormatter::joinParts([
                'RDV assigné',
                $patient,
                $care,
                $scheduledLabel !== '' ? $scheduledLabel : null,
            ]);

            $this->createNotification(
                $recipientId,
                'appointment_reassigned',
                'RDV assigné',
                $message,
                ['appointment_id' => $appointmentId]
            );
        } catch (Exception $e) {
            error_log('notifyAppointmentReassigned: ' . $e->getMessage());
        }
    }

    /**
     * Patient : le laboratoire vient de désigner un préleveur pour la prise de sang (cloche + détail RDV).
     */
    public function notifyPatientPreleveurAssigned(
        string $patientId,
        string $appointmentId,
        string $preleveurId,
        string $preleveurFullName
    ): void {
        try {
            $name = trim($preleveurFullName);
            if ($name === '') {
                $name = 'Votre préleveur';
            }
            $title = 'Préleveur désigné';
            $message = $name . ' prend en charge votre prélèvement.';

            $this->createNotification(
                $patientId,
                'preleveur_assigned',
                $title,
                $message,
                ['appointment_id' => $appointmentId, 'assigned_to' => $preleveurId]
            );
        } catch (Exception $e) {
            error_log('notifyPatientPreleveurAssigned: ' . $e->getMessage());
        }
    }

    /**
     * Patient : l'infirmier est en route pour le passage à domicile.
     */
    public function notifyPatientNurseEnRoute(
        string $patientId,
        string $appointmentId,
        string $nurseId,
        string $nurseFullName,
    ): void {
        try {
            $name = trim($nurseFullName);
            if ($name === '') {
                $name = 'Votre infirmier·ère';
            }
            $this->createNotification(
                $patientId,
                'nurse_en_route',
                'Infirmier·ère en route',
                $name . ' est en route pour votre passage.',
                ['appointment_id' => $appointmentId, 'assigned_nurse_id' => $nurseId],
            );
        } catch (Exception $e) {
            error_log('notifyPatientNurseEnRoute: ' . $e->getMessage());
        }
    }

    /**
     * Notifie l'infirmier qu'il a accepté un rendez-vous
     */
    public function notifyNurseAcceptedAppointment(string $appointmentId, string $nurseId, array $appointmentData): void
    {
        $patientName = NotificationMessageFormatter::patientDisplayName(
            $appointmentData['patient_first_name'] ?? null,
            $appointmentData['patient_last_name'] ?? null
        );
        $careType = NotificationMessageFormatter::careShortLabel(
            $appointmentData['category_name'] ?? null,
            $appointmentData['type'] ?? 'nursing'
        );
        $optionMeta = $this->fetchCareOptionMeta(
            isset($appointmentData['category_id']) ? (string) $appointmentData['category_id'] : null
        );
        $details = NotificationMessageFormatter::appointmentContextShort(
            is_array($appointmentData['form_data'] ?? null) ? $appointmentData['form_data'] : [],
            $appointmentData['category_name'] ?? null,
            $appointmentData['type'] ?? 'nursing',
            isset($appointmentData['scheduled_at']) ? (string) $appointmentData['scheduled_at'] : null,
            $optionMeta
        );
        $message = NotificationMessageFormatter::joinParts([
            'RDV accepté',
            $patientName,
            $details !== '' ? $details : $careType,
        ]);

        $address = '';
        if (!empty($appointmentData['address'])) {
            $address = is_array($appointmentData['address'])
                ? ($appointmentData['address']['label'] ?? '')
                : (string) $appointmentData['address'];
        }

        $this->createNotification(
            $nurseId,
            'appointment_accepted',
            'RDV accepté',
            $message,
            [
                'appointment_id' => $appointmentId,
                'patient_name' => $patientName,
                'scheduled_at' => $appointmentData['scheduled_at'] ?? null,
                'address' => $address,
                'care_type' => $careType,
            ]
        );

        // Pas de SMS à l’acteur : il est déjà dans l’app au moment de l’acceptation.
    }

    /**
     * Notifie l'annulation d'un rendez-vous
     * @param string|null $actorDisplayLabel Ex: "Le laboratoire X", "Le préleveur Y" — si fourni, message personnalisé + notif admins
     * @param string|null $actorUserId Utilisateur ayant déclenché l’annulation (évite un doublon si créateur = annuleur)
     */
    public function notifyAppointmentCanceled(
        string $appointmentId,
        array $appointmentData,
        string $canceledBy,
        ?string $actorDisplayLabel = null,
        ?string $actorUserId = null
    ): void {
        $patientName = '';
        if (!empty($appointmentData['patient_first_name']) && !empty($appointmentData['patient_last_name'])) {
            $patientName = trim($appointmentData['patient_first_name'] . ' ' . $appointmentData['patient_last_name']);
        }
        
        $when = NotificationMessageFormatter::whenShort(
            $appointmentData['form_data'] ?? null,
            $appointmentData['scheduled_at'] ?? null
        );
        $careType = NotificationMessageFormatter::careShortLabel(
            $appointmentData['category_name'] ?? null,
            $appointmentData['type'] ?? null
        );
        $address = $appointmentData['address'] ?? '';
        
        // Notification au patient (si annulé par un professionnel : lab, sous-compte, préleveur, infirmier)
        if ($canceledBy === 'nurse' && !empty($appointmentData['patient_id'])) {
            if ($actorDisplayLabel !== null && $actorDisplayLabel !== '') {
                $message = $actorDisplayLabel . ' a annulé votre RDV.';
            } else {
                $message = NotificationMessageFormatter::joinParts([
                    'RDV annulé',
                    $careType,
                    $when ?: null,
                ]);
            }
            
            $patientNotifData = [
                'appointment_id' => $appointmentId,
                'canceled_by' => $canceledBy,
            ];
            foreach (['cancellation_reason', 'cancellation_comment', 'cancellation_photo_document_id'] as $ck) {
                if (!empty($appointmentData[$ck])) {
                    $patientNotifData[$ck] = $appointmentData[$ck];
                }
            }
            $this->createNotification(
                $appointmentData['patient_id'],
                'appointment_canceled',
                'RDV annulé',
                $message,
                $patientNotifData
            );
            
            // Email au patient (async)
            if (!empty($appointmentData['patient_email'])) {
                EmailQueue::add('appointment_canceled_patient', $appointmentData['patient_email'], [
                    'actor_display_label' => $actorDisplayLabel ?? 'Le professionnel de santé',
                    'scheduled_at' => $appointmentData['scheduled_at'] ?? null,
                    'form_data' => $appointmentData['form_data'] ?? null,
                ]);
            }
            // SMS au patient (annulation)
            if (!empty($appointmentData['patient_phone']) && $this->twilio !== null) {
                try {
                    $this->twilio->sendAppointmentCanceled($appointmentData['patient_phone']);
                } catch (Exception $e) {
                    // Ne pas bloquer si l'envoi SMS échoue
                }
            }
            // Notification aux admins + préleveur / lab / infirmier : "Le laboratoire NOM a annulé le RDV de PRÉNOM NOM"
            if ($actorDisplayLabel !== null && $actorDisplayLabel !== '' && $patientName !== '') {
                $messageToPros = $actorDisplayLabel . ' a annulé le RDV de ' . $patientName . '.';
                $cancelData = ['appointment_id' => $appointmentId];
                foreach (['cancellation_reason', 'cancellation_comment', 'cancellation_photo_document_id'] as $ck) {
                    if (!empty($appointmentData[$ck])) {
                        $cancelData[$ck] = $appointmentData[$ck];
                    }
                }
                $cancelData['scheduled_at'] = $appointmentData['scheduled_at'] ?? null;
                $cancelData['form_data'] = $appointmentData['form_data'] ?? null;
                $this->notifyAllAdmins('appointment_canceled_by_pro', 'RDV annulé', $messageToPros, $cancelData);
                $this->notifyAssignees(
                    $appointmentData['assigned_lab_id'] ?? null,
                    $appointmentData['assigned_to'] ?? null,
                    $appointmentData['assigned_nurse_id'] ?? null,
                    'appointment_canceled_by_pro',
                    'RDV annulé',
                    $messageToPros,
                    $cancelData
                );
            }

            // Prise de sang : notifier le lab / sous-compte créateur s’il n’a pas déjà été couvert (ex. sous-compte créateur non assigné)
            if (($appointmentData['type'] ?? '') === 'blood_test') {
                $createdBy = $appointmentData['created_by'] ?? null;
                $createdByRole = $appointmentData['created_by_role'] ?? null;
                if (
                    $createdBy
                    && in_array($createdByRole, ['lab', 'subaccount'], true)
                    && (string) $createdBy !== (string) ($actorUserId ?? '')
                    && (string) $createdBy !== (string) ($appointmentData['assigned_lab_id'] ?? '')
                    && (string) $createdBy !== (string) ($appointmentData['assigned_to'] ?? '')
                ) {
                    $messageCreator = ($actorDisplayLabel !== null && $actorDisplayLabel !== '' && $patientName !== '')
                        ? ($actorDisplayLabel . ' a annulé le RDV de ' . $patientName . '.')
                        : ('Un professionnel a annulé le RDV de ' . ($patientName !== '' ? $patientName : 'patient') . '.');
                    $cancelDataCreator = ['appointment_id' => $appointmentId];
                    foreach (['cancellation_reason', 'cancellation_comment', 'cancellation_photo_document_id'] as $ck) {
                        if (!empty($appointmentData[$ck])) {
                            $cancelDataCreator[$ck] = $appointmentData[$ck];
                        }
                    }
                    try {
                        $this->createNotification(
                            (string) $createdBy,
                            'appointment_canceled_by_pro',
                            'RDV annulé',
                            $messageCreator,
                            $cancelDataCreator
                        );
                    } catch (Exception $e) {
                        error_log('notifyAppointmentCanceled created_by: ' . $e->getMessage());
                    }
                }
            }
        }
        
        // Notification au patient qu'il a annulé son RDV (confirmation)
        if ($canceledBy === 'patient' && !empty($appointmentData['patient_id'])) {
            $message = NotificationMessageFormatter::joinParts([
                'Annulation enregistrée',
                $careType,
                $when ?: null,
            ]);

            $this->createNotification(
                $appointmentData['patient_id'],
                'appointment_canceled_confirmation',
                'RDV annulé',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'canceled_by' => $canceledBy,
                ]
            );
        }
        
        // Notification à l'infirmier (si annulé par le patient)
        if ($canceledBy === 'patient' && !empty($appointmentData['assigned_nurse_id'])) {
            $message = NotificationMessageFormatter::joinParts([
                'Annulé par le patient',
                $patientName !== '' ? $patientName : null,
                $careType,
                $when ?: null,
            ]);

            $this->createNotification(
                $appointmentData['assigned_nurse_id'],
                'appointment_canceled',
                'RDV annulé',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'patient_name' => $patientName,
                    'canceled_by' => $canceledBy,
                ]
            );
        }
        
        // Notification au lab / préleveur (si annulé par le patient — RDV prise de sang)
        if ($canceledBy === 'patient') {
            $messageLab = NotificationMessageFormatter::joinParts([
                'Annulé par le patient',
                $patientName !== '' ? $patientName : null,
                $careType,
                $when ?: null,
            ]);
            $dataLab = ['appointment_id' => $appointmentId, 'patient_name' => $patientName, 'canceled_by' => $canceledBy];
            if (!empty($appointmentData['assigned_lab_id'])) {
                $this->createNotification($appointmentData['assigned_lab_id'], 'appointment_canceled', 'RDV annulé', $messageLab, $dataLab);
            }
            if (!empty($appointmentData['assigned_to'])) {
                $this->createNotification($appointmentData['assigned_to'], 'appointment_canceled', 'RDV annulé', $messageLab, $dataLab);
            }

            $messageAdmin = ($patientName !== '' ? $patientName : 'Un patient') . ' a annulé son RDV.';
            $this->notifyAllAdmins(
                'appointment_canceled_by_patient',
                'RDV annulé',
                $messageAdmin,
                [
                    'appointment_id' => $appointmentId,
                    'scheduled_at' => $appointmentData['scheduled_at'] ?? null,
                    'form_data' => $appointmentData['form_data'] ?? null,
                ]
            );
        }
        
        // Notification à l'infirmier qu'il a annulé le RDV (confirmation)
        if ($canceledBy === 'nurse' && !empty($appointmentData['assigned_nurse_id'])) {
            $message = NotificationMessageFormatter::joinParts([
                'Annulation enregistrée',
                $patientName !== '' ? $patientName : null,
                $careType,
                $when ?: null,
            ]);

            $this->createNotification(
                $appointmentData['assigned_nurse_id'],
                'appointment_canceled_confirmation',
                'RDV annulé',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'patient_name' => $patientName,
                    'canceled_by' => $canceledBy,
                ]
            );
        }
    }

    /**
     * Notifie le patient que le RDV a expiré (aucun pro disponible)
     */
    public function notifyAppointmentExpired(string $appointmentId, array $appointmentData): void
    {
        if (empty($appointmentData['patient_id'])) {
            return;
        }
        $this->createNotification(
            $appointmentData['patient_id'],
            'appointment_expired',
            'Créneau expiré',
            'Aucun pro n’a confirmé à temps. Choisissez une autre date.',
            ['appointment_id' => $appointmentId]
        );
        if (!empty($appointmentData['patient_phone']) && $this->twilio !== null) {
            try {
                $this->twilio->sendAppointmentExpired($appointmentData['patient_phone']);
            } catch (Exception $e) {
                // Ne pas bloquer si l'envoi SMS échoue
            }
        }
    }

    /**
     * Notifie le refus d'un rendez-vous par l'infirmier
     */
    public function notifyAppointmentRefused(string $appointmentId, string $nurseId, array $appointmentData): void
    {
        $patientName = '';
        if (!empty($appointmentData['patient_first_name']) && !empty($appointmentData['patient_last_name'])) {
            $patientName = $appointmentData['patient_first_name'] . ' ' . $appointmentData['patient_last_name'];
        }
        
        $careType = NotificationMessageFormatter::careShortLabel(
            $appointmentData['category_name'] ?? null,
            $appointmentData['type'] ?? 'nursing'
        );
        $when = NotificationMessageFormatter::whenShort(
            $appointmentData['form_data'] ?? null,
            $appointmentData['scheduled_at'] ?? null
        );
        $message = NotificationMessageFormatter::joinParts([
            'RDV refusé',
            $patientName !== '' ? $patientName : null,
            $careType,
            $when ?: null,
        ]);

        $this->createNotification(
            $nurseId,
            'appointment_refused',
            'RDV refusé',
            $message,
            [
                'appointment_id' => $appointmentId,
                'patient_name' => $patientName,
            ]
        );
    }

    /**
     * Notifie le début d'un soin
     */
    public function notifyAppointmentStarted(string $appointmentId, string $patientId): void
    {
        $this->createNotification(
            $patientId,
            'appointment_started',
            'Soin en cours',
            'Votre professionnel a commencé le soin.',
            ['appointment_id' => $appointmentId]
        );
    }

    /**
     * Notifie la fin d'un soin
     * @param string|null $actorDisplayLabel Ex: "Le laboratoire X", "Le préleveur Y" — si fourni, message personnalisé + notif admins et assignés
     * @param string|null $patientFirstName
     * @param string|null $patientLastName
     * @param string|null $assignedLabId
     * @param string|null $assignedTo (préleveur)
     * @param string|null $assignedNurseId
     */
    public function notifyAppointmentCompleted(
        string $appointmentId,
        string $patientId,
        ?string $actorDisplayLabel = null,
        ?string $patientFirstName = null,
        ?string $patientLastName = null,
        ?string $assignedLabId = null,
        ?string $assignedTo = null,
        ?string $assignedNurseId = null
    ): void {
        $patientName = trim(($patientFirstName ?? '') . ' ' . ($patientLastName ?? ''));
        $patientTitle = NotificationMessageFormatter::completedAppointmentReviewTitle();
        $messageToPatient = NotificationMessageFormatter::completedAppointmentReviewMessage($actorDisplayLabel);
        // Notification web au patient
        $this->createNotification(
            $patientId,
            'appointment_completed',
            $patientTitle,
            $messageToPatient,
            ['appointment_id' => $appointmentId]
        );
        // Notification aux admins + préleveur / lab / infirmier : "Le laboratoire NOM a terminé le RDV de PRÉNOM NOM"
        if ($actorDisplayLabel !== null && $actorDisplayLabel !== '' && $patientName !== '') {
            $messageToPros = $actorDisplayLabel . ' a terminé le RDV de ' . $patientName . '.';
            $this->notifyAllAdmins('appointment_completed_by_pro', 'RDV terminé', $messageToPros, ['appointment_id' => $appointmentId]);
            $this->notifyAssignees($assignedLabId, $assignedTo, $assignedNurseId, 'appointment_completed_by_pro', 'RDV terminé', $messageToPros, ['appointment_id' => $appointmentId]);
        }
        
        // Email invitation à la review (async pour ne pas bloquer le bouton)
        try {
            require_once __DIR__ . '/../models/User.php';
            $userModel = new User();
            $patient = $userModel->getById($patientId, 'system', 'system');
            if (!$patient || empty($patient['email'])) {
                return;
            }
            $config = require __DIR__ . '/../config/database.php';
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $config['host'],
                $config['port'],
                $config['database'],
                $config['charset']
            );
            $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
            $stmt = $db->prepare('SELECT scheduled_at, type FROM appointments WHERE id = ?');
            $stmt->execute([$appointmentId]);
            $appointment = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($appointment) {
                EmailQueue::add('review_invitation', $patient['email'], [
                    'appointment_id' => $appointmentId,
                    'scheduled_at' => $appointment['scheduled_at'],
                    'type' => $appointment['type'] === 'blood_test' ? 'Prélèvement' : 'Soins infirmiers',
                ]);
            }
        } catch (Exception $e) {
            // Ne pas bloquer le processus
        }
    }

    /**
     * Notifie tous les super_admin (cloche) avec un message type "Le laboratoire NOM a terminé/annulé le RDV de PRÉNOM NOM"
     */
    private function notifyAllAdmins(string $type, string $title, string $message, ?array $data = null): void
    {
        try {
            $stmt = $this->db->prepare('SELECT id FROM profiles WHERE role = ? AND id IS NOT NULL');
            $stmt->execute(['super_admin']);
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($admins as $admin) {
                try {
                    $this->createNotification($admin['id'], $type, $title, $message, $data);
                } catch (Exception $e) {
                    error_log("Erreur notification admin {$admin['id']}: " . $e->getMessage());
                }
            }

            $appointmentId = (string) ($data['appointment_id'] ?? '');
            if ($appointmentId === '') {
                return;
            }

            try {
                require_once __DIR__ . '/AdminEmailNotifier.php';
                if ($type === 'appointment_canceled_by_pro') {
                    AdminEmailNotifier::appointmentCanceledByPro(
                        $appointmentId,
                        $message,
                        isset($data['scheduled_at']) ? (string) $data['scheduled_at'] : null,
                        is_array($data['form_data'] ?? null) ? $data['form_data'] : null
                    );
                } elseif ($type === 'appointment_completed_by_pro') {
                    AdminEmailNotifier::appointmentCompletedByPro($appointmentId, $message);
                } elseif ($type === 'appointment_canceled_by_patient') {
                    AdminEmailNotifier::appointmentCanceledByPatient(
                        $appointmentId,
                        $message,
                        isset($data['scheduled_at']) ? (string) $data['scheduled_at'] : null,
                        is_array($data['form_data'] ?? null) ? $data['form_data'] : null
                    );
                }
            } catch (Throwable $e) {
                error_log('notifyAllAdmins admin email: ' . $e->getMessage());
            }
        } catch (Exception $e) {
            error_log("Erreur récupération admins pour notification: " . $e->getMessage());
        }
    }

    /**
     * Notifie les assignés du RDV (lab, préleveur, infirmier) — chaque userId unique reçoit la notification
     */
    private function notifyAssignees(
        ?string $assignedLabId,
        ?string $assignedTo,
        ?string $assignedNurseId,
        string $type,
        string $title,
        string $message,
        ?array $data = null
    ): void {
        $seen = [];
        foreach ([$assignedLabId, $assignedTo, $assignedNurseId] as $userId) {
            if (empty($userId) || isset($seen[$userId])) {
                continue;
            }
            $seen[$userId] = true;
            try {
                $this->createNotification($userId, $type, $title, $message, $data);
            } catch (Exception $e) {
                error_log("Erreur notification assigné {$userId}: " . $e->getMessage());
            }
        }
    }

    /**
     * Cron : notifications patient « préleveur en route » (entre 30 min avant et l’heure du RDV) et « arrivé » (à partir de l’heure prévue).
     * Fenêtre temporelle interprétée en Europe/Paris (même logique que le bandeau patient).
     *
     * @return array{en_route: int, arrive: int}
     */
    public function processPreleveurPatientNotifications(): array
    {
        require_once __DIR__ . '/../models/User.php';

        $tz = new DateTimeZone('Europe/Paris');
        $now = new DateTime('now', $tz);
        $todayYmd = $now->format('Y-m-d');
        $nowMinutes = ((int) $now->format('H')) * 60 + (int) $now->format('i');
        $sentEnRoute = 0;
        $sentArrive = 0;

        $stmt = $this->db->query("
            SELECT id, patient_id, scheduled_at, assigned_to, status, form_data_encrypted, form_data_dek,
                   notif_preleveur_en_route_sent_at, notif_preleveur_arrive_sent_at
            FROM appointments
            WHERE type = 'blood_test'
            AND assigned_to IS NOT NULL AND assigned_to != ''
            AND patient_id IS NOT NULL
            AND status NOT IN ('completed', 'canceled', 'cancelled', 'expired', 'refused')
            AND scheduled_at >= DATE_SUB(NOW(), INTERVAL 6 HOUR)
            AND scheduled_at <= DATE_ADD(NOW(), INTERVAL 2 DAY)
        ");
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        if (!$rows) {
            return ['en_route' => 0, 'arrive' => 0];
        }

        $userModel = new User();
        $updEnRoute = $this->db->prepare('
            UPDATE appointments
            SET notif_preleveur_en_route_sent_at = NOW()
            WHERE id = ?
            AND notif_preleveur_en_route_sent_at IS NULL
            AND status NOT IN (\'completed\', \'canceled\', \'cancelled\', \'expired\', \'refused\')
        ');
        $updArrive = $this->db->prepare('
            UPDATE appointments
            SET notif_preleveur_arrive_sent_at = NOW()
            WHERE id = ?
            AND notif_preleveur_arrive_sent_at IS NULL
            AND status NOT IN (\'completed\', \'canceled\', \'cancelled\', \'expired\', \'refused\')
        ');

        foreach ($rows as $row) {
            $patientId = $row['patient_id'] ?? null;
            $assignedTo = $row['assigned_to'] ?? null;
            if (!$patientId || !$assignedTo) {
                continue;
            }

            try {
                $sched = new DateTime((string) $row['scheduled_at'], $tz);
            } catch (Exception $e) {
                continue;
            }

            if ($sched->format('Y-m-d') !== $todayYmd) {
                continue;
            }

            $slot = $this->appointmentSlotMinutesForPreleveurNotification($row, $sched);
            if ($slot === null) {
                continue;
            }
            [$slotStartMinutes, $slotEndMinutes] = $slot;
            $slotLabel = $this->formatSlotLabelForPreleveurNotification($slotStartMinutes, $slotEndMinutes);

            $preleveur = $userModel->getById((string) $assignedTo, 'system', 'system');
            $first = $preleveur ? trim((string) ($preleveur['first_name'] ?? '')) : '';
            $last = $preleveur ? trim((string) ($preleveur['last_name'] ?? '')) : '';
            $fullName = trim($first . ' ' . $last);
            if ($fullName === '') {
                $fullName = 'Votre préleveur';
            }

            $aptId = (string) $row['id'];
            $data = [
                'appointment_id' => $aptId,
                'assigned_to' => (string) $assignedTo,
                'slot_label' => $slotLabel,
            ];

            $enRouteStartsAt = max(0, $slotStartMinutes - 30);

            if (
                empty($row['notif_preleveur_en_route_sent_at'])
                && $nowMinutes >= $enRouteStartsAt
                && $nowMinutes < $slotStartMinutes
            ) {
                $updEnRoute->execute([$aptId]);
                if ($updEnRoute->rowCount() > 0) {
                    $title = 'Votre préleveur est en route';
                    $message = $fullName . ' est en route vers votre domicile. Arrivée prévue dans la fenêtre ' . $slotLabel . '.';
                    try {
                        $this->createNotification($patientId, 'preleveur_en_route', $title, $message, $data);
                        $sentEnRoute++;
                    } catch (Exception $e) {
                        error_log('preleveur_en_route notification: ' . $e->getMessage());
                    }
                }
            }

            if (empty($row['notif_preleveur_arrive_sent_at']) && $nowMinutes >= $slotStartMinutes) {
                $updArrive->execute([$aptId]);
                if ($updArrive->rowCount() > 0) {
                    $title = 'Votre préleveur est arrivé';
                    $message = $fullName !== 'Votre préleveur'
                        ? ($fullName . ' est arrivé sur le créneau ' . $slotLabel . '.')
                        : ('Votre préleveur est arrivé sur le créneau ' . $slotLabel . '.');
                    try {
                        $this->createNotification($patientId, 'preleveur_arrive', $title, $message, $data);
                        $sentArrive++;
                    } catch (Exception $e) {
                        error_log('preleveur_arrive notification: ' . $e->getMessage());
                    }
                }
            }
        }

        return ['en_route' => $sentEnRoute, 'arrive' => $sentArrive];
    }

    /**
     * Créneau patient en minutes Europe/Paris. Priorité à form_data.availability.range,
     * sinon fallback sur scheduled_at pour les anciens RDV sans disponibilité structurée.
     *
     * @return array{0:int,1:int}|null
     */
    private function appointmentSlotMinutesForPreleveurNotification(array $row, DateTime $scheduledAt): ?array
    {
        $formData = $this->decryptAppointmentFormDataForNotification($row);
        $availability = $formData['availability'] ?? null;
        if (is_string($availability) && trim($availability) !== '') {
            $decoded = json_decode($availability, true);
            if (is_array($decoded)) {
                $availability = $decoded;
            }
        }

        if (is_array($availability) && ($availability['type'] ?? '') === 'custom' && isset($availability['range']) && is_array($availability['range'])) {
            $start = isset($availability['range'][0]) ? (float) $availability['range'][0] : null;
            $end = isset($availability['range'][1]) ? (float) $availability['range'][1] : null;
            if ($start !== null && $end !== null && is_finite($start) && is_finite($end) && $end > $start) {
                return [(int) round($start * 60), (int) round($end * 60)];
            }
        }

        if (is_array($availability) && ($availability['type'] ?? '') === 'all_day') {
            return [9 * 60, 17 * 60];
        }

        $start = ((int) $scheduledAt->format('H')) * 60 + (int) $scheduledAt->format('i');
        return [$start, $start + 60];
    }

    private function decryptAppointmentFormDataForNotification(array $row): array
    {
        if (!$this->crypto || empty($row['form_data_encrypted']) || empty($row['form_data_dek'])) {
            return [];
        }
        try {
            $json = $this->crypto->decryptField((string) $row['form_data_encrypted'], (string) $row['form_data_dek']);
            $data = json_decode($json, true);
            return is_array($data) ? $data : [];
        } catch (Throwable $e) {
            error_log('preleveur_patient_notification form_data decrypt: ' . $e->getMessage());
            return [];
        }
    }

    private function formatSlotLabelForPreleveurNotification(int $startMinutes, int $endMinutes): string
    {
        return $this->formatSlotMinuteForPreleveurNotification($startMinutes) . ' - ' . $this->formatSlotMinuteForPreleveurNotification($endMinutes);
    }

    private function formatSlotMinuteForPreleveurNotification(int $minutes): string
    {
        $hour = intdiv($minutes, 60);
        $minute = $minutes % 60;
        return $minute === 0 ? ($hour . 'h') : ($hour . 'h' . str_pad((string) $minute, 2, '0', STR_PAD_LEFT));
    }

    /**
     * Génère un UUID v4
     */
    private function generateUUID(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}

