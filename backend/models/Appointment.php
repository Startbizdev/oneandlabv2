<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Crypto.php';
require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../lib/Twilio.php';
require_once __DIR__ . '/../lib/Email.php';
require_once __DIR__ . '/../lib/NotificationService.php';
require_once __DIR__ . '/../lib/EmailQueue.php';
require_once __DIR__ . '/../lib/SmsQueue.php';
require_once __DIR__ . '/../lib/Validation.php';

/**
 * Modèle Appointment
 */

class Appointment
{
    private PDO $db;
    private Crypto $crypto;
    private Logger $logger;
    private ?Twilio $twilio = null;
    private Email $email;
    private NotificationService $notificationService;

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
        
        // Twilio est optionnel - ne pas bloquer si les clés ne sont pas configurées
        try {
            $this->twilio = new Twilio();
        } catch (Exception $e) {
            // Twilio non configuré - SMS désactivés
            $this->twilio = null;
        }
        
        $this->email = new Email();
        $this->notificationService = new NotificationService();
    }

    /**
     * Crée un nouveau rendez-vous
     * 
     * @param array $data Données du rendez-vous avec les clés suivantes :
     *   - type (string) : 'blood_test' ou 'nursing' (requis)
     *   - form_type (string) : 'blood_test' ou 'nursing' (requis)
     *   - patient_id (string|null) : ID du patient (optionnel si guest)
     *   - relative_id (string|null) : ID du proche (optionnel)
     *   - category_id (string|null) : ID de la catégorie de soin (optionnel)
     *   - address (array) : Adresse avec 'label', 'lat', 'lng' (requis)
     *   - scheduled_at (string) : Date et heure du rendez-vous au format 'Y-m-d H:i:s' (requis)
     *   - form_data (array) : Données du formulaire (optionnel)
     *   - guest_email (string|null) : Email pour les invités (optionnel si patient_id présent)
     * @param string $createdBy ID de l'utilisateur créateur
     * @param string $createdByRole Rôle de l'utilisateur créateur
     * @return string ID du rendez-vous créé
     * @throws Exception Si les données sont invalides
     */
    public function create(array $data, string $createdBy, string $createdByRole): string
    {
        // Validation des champs requis
        if (empty($data['type']) || !Validation::appointmentType($data['type'])) {
            throw new Exception('Type de rendez-vous invalide. Doit être "blood_test" ou "nursing".');
        }
        
        if (empty($data['form_type']) || !Validation::appointmentType($data['form_type'])) {
            throw new Exception('Type de formulaire invalide. Doit être "blood_test" ou "nursing".');
        }
        
        if (empty($data['address']) || !is_array($data['address'])) {
            throw new Exception('Adresse requise et doit être un tableau.');
        }
        
        if (empty($data['address']['label']) || empty($data['address']['lat']) || empty($data['address']['lng'])) {
            throw new Exception('Adresse incomplète. Requis: label, lat, lng.');
        }
        
        // Validation des coordonnées géographiques
        $lat = floatval($data['address']['lat']);
        $lng = floatval($data['address']['lng']);
        
        if (!Validation::latitude($lat)) {
            throw new Exception('Latitude invalide. Doit être entre -90 et 90.');
        }
        
        if (!Validation::longitude($lng)) {
            throw new Exception('Longitude invalide. Doit être entre -180 et 180.');
        }
        
        if (empty($data['scheduled_at'])) {
            throw new Exception('Date de rendez-vous requise.');
        }
        
        // Convertir la date au format attendu (Y-m-d H:i:s)
        // Accepter plusieurs formats : ISO, datetime-local, ou format français
        $scheduledDate = null;
        $dateFormats = [
            'Y-m-d H:i:s',      // Format standard
            'Y-m-d\TH:i',       // Format datetime-local HTML5
            'Y-m-d\TH:i:s',     // Format ISO avec secondes
            'Y-m-d H:i',        // Format sans secondes
            'd/m/Y H:i',        // Format français
            'd/m/Y H:i:s',      // Format français avec secondes
        ];
        
        foreach ($dateFormats as $format) {
            $parsed = DateTime::createFromFormat($format, $data['scheduled_at']);
            if ($parsed && $parsed->format($format) === $data['scheduled_at']) {
                $scheduledDate = $parsed;
                break;
            }
        }
        
        // Si aucun format ne correspond, essayer avec DateTime natif (ISO 8601)
        if (!$scheduledDate) {
            try {
                $scheduledDate = new DateTime($data['scheduled_at']);
            } catch (Exception $e) {
                throw new Exception('Format de date invalide. Formats acceptés: Y-m-d H:i:s, Y-m-dTH:i, d/m/Y H:i');
            }
        }
        
        // Normaliser la date au format attendu
        $data['scheduled_at'] = $scheduledDate->format('Y-m-d H:i:s');
        
        // Vérifier que la date n'est pas dans le passé
        $now = new DateTime();
        if ($scheduledDate < $now) {
            throw new Exception('La date du rendez-vous ne peut pas être dans le passé.');
        }
        
        // Validation patient_id ou guest_email
        if (empty($data['patient_id']) && empty($data['guest_email'])) {
            throw new Exception('patient_id ou guest_email requis.');
        }
        
        if (!empty($data['guest_email']) && !Validation::email($data['guest_email'])) {
            throw new Exception('Email invité invalide.');
        }
        
        // Validation category_id si présent
        if (!empty($data['category_id']) && !Validation::uuid($data['category_id'])) {
            throw new Exception('ID de catégorie invalide (format UUID requis).');
        }
        
        // Validation relative_id si présent
        if (!empty($data['relative_id']) && !Validation::uuid($data['relative_id'])) {
            throw new Exception('ID de proche invalide (format UUID requis).');
        }
        
        $status = 'pending';
        if (!empty($data['status']) && Validation::appointmentStatus($data['status'])) {
            $status = $data['status'];
        }
        
        $id = $this->generateUUID();
        
        // Chiffrer l'adresse
        $addressEncrypted = $this->crypto->encryptField($data['address']['label']);
        
        // Chiffrer les données du formulaire (JSON)
        $formDataJson = json_encode($data['form_data'] ?? []);
        $formDataEncrypted = $this->crypto->encryptField($formDataJson);
        
        // Générer token guest si nécessaire
        $guestToken = null;
        $guestEmailEncrypted = null;
        $guestEmailDek = null;
        
        if (empty($data['patient_id']) && !empty($data['guest_email'])) {
            $guestToken = bin2hex(random_bytes(32));
            $guestEmailData = $this->crypto->encryptField($data['guest_email']);
            $guestEmailEncrypted = $guestEmailData['encrypted'];
            $guestEmailDek = $guestEmailData['dek'];
        }
        
        $assignedLabId = null;
        $assignedNurseId = null;
        $assignedTo = null;
        if (!empty($data['type'])) {
            if ($data['type'] === 'blood_test') {
                if (!empty($data['assigned_lab_id'])) {
                    $assignedLabId = $data['assigned_lab_id'];
                }
                if (!empty($data['assigned_to'])) {
                    $assignedTo = $data['assigned_to'];
                }
            }
            if (($data['type'] === 'nursing') && !empty($data['assigned_nurse_id'])) {
                $assignedNurseId = $data['assigned_nurse_id'];
            }
        }

        // Validation paramètres lab pour RDV prise de sang (création par pro ou assignation à un lab)
        if ($data['type'] === 'blood_test') {
            $effectiveLabId = $assignedLabId;
            if (!$effectiveLabId && in_array($createdByRole, ['lab', 'subaccount'], true)) {
                $effectiveLabId = $createdBy;
            }
            if ($effectiveLabId) {
                $this->validateLabAppointmentParams($effectiveLabId, $data['scheduled_at'], $scheduledDate);
            }
        }

        $stmt = $this->db->prepare('
            INSERT INTO appointments (
                id, type, status, patient_id, relative_id, created_by, created_by_role,
                category_id, form_type,
                location_lat, location_lng,
                address_encrypted, address_dek,
                form_data_encrypted, form_data_dek,
                guest_token, guest_email_encrypted, guest_email_dek,
                scheduled_at,
                assigned_lab_id, assigned_nurse_id, assigned_to,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ');

        $stmt->execute([
            $id,
            $data['type'],
            $status,
            $data['patient_id'] ?? null,
            $data['relative_id'] ?? null,
            $createdBy,
            $createdByRole,
            $data['category_id'] ?? null,
            $data['form_type'],
            $data['address']['lat'],
            $data['address']['lng'],
            $addressEncrypted['encrypted'],
            $addressEncrypted['dek'],
            $formDataEncrypted['encrypted'],
            $formDataEncrypted['dek'],
            $guestToken ? hash('sha256', $guestToken) : null,
            $guestEmailEncrypted,
            $guestEmailDek,
            $data['scheduled_at'],
            $assignedLabId,
            $assignedNurseId,
            $assignedTo,
        ]);
        
        // Logger la création
        $this->logger->log(
            $createdBy,
            $createdByRole,
            'create',
            'appointment',
            $id,
            ['type' => $data['type'], 'status' => $status]
        );
        
        // Dispatch et notifications sont exécutés après l'envoi de la réponse HTTP (voir API POST /appointments) pour éviter timeout
        return $id;
    }

    /**
     * À appeler après l'envoi de la réponse HTTP (création RDV) : dispatch géo + notifications.
     * Évite le timeout côté client quand le dispatch/SMS prennent du temps.
     */
    public function runPostCreateNotifications(string $id, array $data): void
    {
        $lat = isset($data['address']['lat']) ? (float) $data['address']['lat'] : 0.0;
        $lng = isset($data['address']['lng']) ? (float) $data['address']['lng'] : 0.0;
        $this->dispatchGeographic($id, $data['type'] ?? '', $lat, $lng, $data['scheduled_at'] ?? null);
        $this->notificationService->notifyNewAppointment($id, [
            'patient_id' => $data['patient_id'] ?? null,
            'patient_email' => $data['patient_email'] ?? null,
            'type' => $data['type'] ?? null,
            'scheduled_at' => $data['scheduled_at'] ?? null,
        ]);
        $this->notifyAllAdmins($id, $data['type'] ?? '', $data['scheduled_at'] ?? '');
    }

    /**
     * Valide que la date du RDV respecte les paramètres du lab (délai min, samedi, dimanche).
     * @throws Exception si la date ne respecte pas les contraintes
     */
    private function validateLabAppointmentParams(string $labId, string $scheduledAtIso, DateTime $scheduledDate): void
    {
        try {
            $stmt = $this->db->prepare('
                SELECT min_booking_lead_time_hours,
                       COALESCE(accept_rdv_saturday, 1) as accept_rdv_saturday,
                       COALESCE(accept_rdv_sunday, 1) as accept_rdv_sunday
                FROM profiles WHERE id = ?
            ');
            $stmt->execute([$labId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            return;
        }
        if (!$row) {
            return;
        }
        $minHours = (int) ($row['min_booking_lead_time_hours'] ?? 48);
        $acceptSaturday = (bool) ($row['accept_rdv_saturday'] ?? true);
        $acceptSunday = (bool) ($row['accept_rdv_sunday'] ?? true);

        $now = new DateTime();
        if ($minHours > 0) {
            $minAllowed = (clone $now)->modify("+{$minHours} hours");
            if ($scheduledDate < $minAllowed) {
                throw new Exception("La date du rendez-vous doit être au moins {$minHours}h à l'avance par rapport à maintenant.");
            }
        }
        $dayOfWeek = (int) $scheduledDate->format('w'); // 0 = dimanche, 6 = samedi
        if ($dayOfWeek === 0 && !$acceptSunday) {
            throw new Exception('Ce laboratoire n\'accepte pas les rendez-vous le dimanche.');
        }
        if ($dayOfWeek === 6 && !$acceptSaturday) {
            throw new Exception('Ce laboratoire n\'accepte pas les rendez-vous le samedi.');
        }
    }

    /**
     * Récupère un rendez-vous par ID (avec déchiffrement)
     */
    public function getById(string $id, string $requesterId, string $requesterRole): ?array
    {
        $stmt = $this->db->prepare('
            SELECT
                a.*,
                pr.first_name_encrypted as relative_first_name_encrypted,
                pr.first_name_dek as relative_first_name_dek,
                pr.last_name_encrypted as relative_last_name_encrypted,
                pr.last_name_dek as relative_last_name_dek,
                pr.email_encrypted as relative_email_encrypted,
                pr.email_dek as relative_email_dek,
                pr.phone_encrypted as relative_phone_encrypted,
                pr.phone_dek as relative_phone_dek,
                pr.relationship_type as relative_relationship_type,
                pr.birth_date_encrypted as relative_birth_date_encrypted,
                pr.birth_date_dek as relative_birth_date_dek,
                cc.name as category_name,
                cc.type as category_type
            FROM appointments a
            LEFT JOIN patient_relatives pr ON a.relative_id = pr.id
            LEFT JOIN care_categories cc ON a.category_id = cc.id
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            return null;
        }

        // Traiter les données du proche si présent
        if ($appointment['relative_id']) {
            $appointment['relative'] = [
                'id' => $appointment['relative_id'],
                'first_name' => $this->crypto->decryptField(
                    $appointment['relative_first_name_encrypted'],
                    $appointment['relative_first_name_dek']
                ),
                'last_name' => $this->crypto->decryptField(
                    $appointment['relative_last_name_encrypted'],
                    $appointment['relative_last_name_dek']
                ),
                'email' => $appointment['relative_email_encrypted'] ? $this->crypto->decryptField(
                    $appointment['relative_email_encrypted'],
                    $appointment['relative_email_dek']
                ) : null,
                'phone' => $appointment['relative_phone_encrypted'] ? $this->crypto->decryptField(
                    $appointment['relative_phone_encrypted'],
                    $appointment['relative_phone_dek']
                ) : null,
                'relationship_type' => $appointment['relative_relationship_type'],
                'birth_date' => (!empty($appointment['relative_birth_date_encrypted']) && !empty($appointment['relative_birth_date_dek']))
                    ? $this->crypto->decryptField($appointment['relative_birth_date_encrypted'], $appointment['relative_birth_date_dek'])
                    : null,
                'contact_is_parent' => false,
            ];

            // Fallback : si le proche n'a pas d'email/téléphone, utiliser ceux du patient parent
            if ((!$appointment['relative']['email'] || !$appointment['relative']['phone']) && $appointment['patient_id']) {
                try {
                    $stmtParent = $this->db->prepare('
                        SELECT email_encrypted, email_dek, phone_encrypted, phone_dek 
                        FROM profiles 
                        WHERE id = ?
                    ');
                    $stmtParent->execute([$appointment['patient_id']]);
                    $parent = $stmtParent->fetch();
                    
                    if ($parent) {
                        // Utiliser l'email du parent si le proche n'en a pas
                        if (!$appointment['relative']['email'] && $parent['email_encrypted'] && $parent['email_dek']) {
                            $appointment['relative']['email'] = $this->crypto->decryptField(
                                $parent['email_encrypted'],
                                $parent['email_dek']
                            );
                            $appointment['relative']['contact_is_parent'] = true;
                        }
                        
                        // Utiliser le téléphone du parent si le proche n'en a pas
                        if (!$appointment['relative']['phone'] && $parent['phone_encrypted'] && $parent['phone_dek']) {
                            $appointment['relative']['phone'] = $this->crypto->decryptField(
                                $parent['phone_encrypted'],
                                $parent['phone_dek']
                            );
                            $appointment['relative']['contact_is_parent'] = true;
                        }
                    }
                } catch (Exception $e) {
                    // Ignorer les erreurs de fallback, continuer avec les données du proche uniquement
                }
            }

            // Nettoyer les champs chiffrés du proche
            unset(
                $appointment['relative_first_name_encrypted'],
                $appointment['relative_first_name_dek'],
                $appointment['relative_last_name_encrypted'],
                $appointment['relative_last_name_dek'],
                $appointment['relative_email_encrypted'],
                $appointment['relative_email_dek'],
                $appointment['relative_phone_encrypted'],
                $appointment['relative_phone_dek'],
                $appointment['relative_relationship_type'],
                $appointment['relative_birth_date_encrypted'],
                $appointment['relative_birth_date_dek']
            );
        }
        
        // Déchiffrer les champs
        try {
            $appointment['address'] = $this->crypto->decryptField(
                $appointment['address_encrypted'],
                $appointment['address_dek']
            );
            
            if ($appointment['form_data_encrypted']) {
                $formDataJson = $this->crypto->decryptField(
                    $appointment['form_data_encrypted'],
                    $appointment['form_data_dek']
                );
                $appointment['form_data'] = json_decode($formDataJson, true);
            }
            
            // Logger le déchiffrement
            $this->logger->logDecrypt(
                $requesterId,
                $requesterRole,
                'appointment',
                $id,
                ['address', 'form_data']
            );
        } catch (Exception $e) {
            throw new Exception('Erreur lors du déchiffrement des données');
        }
        
        // Nettoyer les champs chiffrés
        unset($appointment['address_encrypted'], $appointment['address_dek']);
        unset($appointment['form_data_encrypted'], $appointment['form_data_dek']);
        
        // Libellés et infos d'assignation (lab / préleveur) pour la liste et pour la page patient (logo, adresse, tél)
        $appointment['assigned_lab_display_name'] = null;
        $appointment['assigned_lab_role'] = null;
        $appointment['assigned_lab_phone'] = null;
        $appointment['assigned_lab_address'] = null;
        $appointment['assigned_lab_profile_image_url'] = null;
        $appointment['assigned_lab_public_slug'] = null;
        $appointment['assigned_to_display_name'] = null;
        $appointment['assigned_to_phone'] = null;
        $appointment['assigned_to_address'] = null;
        $appointment['assigned_to_profile_image_url'] = null;
        $appointment['assigned_to_email'] = null;
        try {
            require_once __DIR__ . '/User.php';
            $userModel = new User();
            if (!empty($appointment['assigned_lab_id'])) {
                $labProfile = $userModel->getById($appointment['assigned_lab_id'], 'system', 'system');
                if ($labProfile) {
                    $company = isset($labProfile['company_name']) ? trim((string)$labProfile['company_name']) : '';
                    $first = trim((string)($labProfile['first_name'] ?? ''));
                    $last = trim((string)($labProfile['last_name'] ?? ''));
                    $name = trim($first . ' ' . $last);
                    $appointment['assigned_lab_display_name'] = $company !== '' ? $company : ($name !== '' ? $name : null);
                    $appointment['assigned_lab_role'] = $labProfile['role'] ?? null;
                    $appointment['assigned_lab_phone'] = isset($labProfile['phone']) ? trim((string)$labProfile['phone']) : null;
                    $appointment['assigned_lab_address'] = isset($labProfile['address']['label']) ? trim((string)$labProfile['address']['label']) : (is_string($labProfile['address'] ?? null) ? trim($labProfile['address']) : null);
                    $appointment['assigned_lab_profile_image_url'] = isset($labProfile['profile_image_url']) ? trim((string)$labProfile['profile_image_url']) : null;
                    $appointment['assigned_lab_public_slug'] = isset($labProfile['public_slug']) && trim((string)$labProfile['public_slug']) !== '' ? trim((string)$labProfile['public_slug']) : null;
                }
            }
            if (!empty($appointment['assigned_to'])) {
                $preleveurProfile = $userModel->getById($appointment['assigned_to'], 'system', 'system');
                if ($preleveurProfile) {
                    $first = trim((string)($preleveurProfile['first_name'] ?? ''));
                    $last = trim((string)($preleveurProfile['last_name'] ?? ''));
                    $appointment['assigned_to_display_name'] = trim($first . ' ' . $last) ?: null;
                    $appointment['assigned_to_phone'] = isset($preleveurProfile['phone']) ? trim((string)$preleveurProfile['phone']) : null;
                    $appointment['assigned_to_address'] = isset($preleveurProfile['address']['label']) ? trim((string)$preleveurProfile['address']['label']) : (is_string($preleveurProfile['address'] ?? null) ? trim($preleveurProfile['address']) : null);
                    $appointment['assigned_to_profile_image_url'] = isset($preleveurProfile['profile_image_url']) ? trim((string)$preleveurProfile['profile_image_url']) : null;
                    $appointment['assigned_to_email'] = isset($preleveurProfile['email']) ? trim((string)$preleveurProfile['email']) : null;
                }
            }
        } catch (Exception $e) {
            // Ne pas faire échouer getById si résolution des noms échoue
        }
        
        return $appointment;
    }

    /**
     * Change le statut d'un rendez-vous
     * Pour status = canceled, optionnel : cancellation_reason, cancellation_comment, cancellation_photo_document_id
     */
    public function updateStatus(
        string $id,
        string $newStatus,
        string $actorId,
        string $actorRole,
        ?string $note = null,
        bool $redispatch = false,
        ?string $cancellationReason = null,
        ?string $cancellationComment = null,
        ?string $cancellationPhotoDocumentId = null
    ): void {
        // Récupérer le statut actuel et le type
        $stmt = $this->db->prepare('SELECT status, type, assigned_nurse_id, assigned_lab_id, assigned_to, location_lat, location_lng, scheduled_at FROM appointments WHERE id = ?');
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();
        
        if (!$appointment) {
            throw new Exception('Rendez-vous introuvable');
        }
        
        $oldStatus = $appointment['status'];
        
        // Préparer la requête de mise à jour
        $updateFields = ['status = ?', 'updated_at = NOW()'];
        $params = [$newStatus];
        
        // Annulation par un pro : enregistrer motif, commentaire, photo
        if ($newStatus === 'canceled') {
            $updateFields[] = 'canceled_by = ?';
            $params[] = $actorId;
            $updateFields[] = 'canceled_at = NOW()';
            $updateFields[] = 'cancellation_reason = ?';
            $params[] = $cancellationReason;
            $updateFields[] = 'cancellation_comment = ?';
            $params[] = $cancellationComment ?? '';
            $updateFields[] = 'cancellation_photo_document_id = ?';
            $params[] = $cancellationPhotoDocumentId;
        }
        
        // Si c'est un redispatch, on remet les assignations à NULL et on relance le dispatch
        if ($redispatch && $newStatus === 'pending') {
            // Vérifier que l'infirmier/labo est bien celui assigné
            if ($appointment['type'] === 'nursing') {
                if ($appointment['assigned_nurse_id'] !== $actorId) {
                    throw new Exception('Vous ne pouvez redispatcher que les rendez-vous qui vous sont assignés');
                }
                $updateFields[] = 'assigned_nurse_id = NULL';
            } else if ($appointment['type'] === 'blood_test') {
                if ($appointment['assigned_lab_id'] !== $actorId) {
                    throw new Exception('Vous ne pouvez redispatcher que les rendez-vous qui vous sont assignés');
                }
                $updateFields[] = 'assigned_lab_id = NULL';
            }
        }
        
        // Si le statut passe à "confirmed" et que l'acteur est un infirmier, l'assigner au rendez-vous
        if ($newStatus === 'confirmed' && $actorRole === 'nurse' && $appointment['type'] === 'nursing') {
            $updateFields[] = 'assigned_nurse_id = ?';
            $params[] = $actorId;
        }
        
        // Si le statut passe à "confirmed" et que l'acteur est un lab/subaccount, l'assigner au rendez-vous
        if ($newStatus === 'confirmed' && in_array($actorRole, ['lab', 'subaccount']) && $appointment['type'] === 'blood_test') {
            $updateFields[] = 'assigned_lab_id = ?';
            $params[] = $actorId;
        }
        
        // Quand le RDV est marqué terminé, enregistrer completed_at
        if ($newStatus === 'completed') {
            $updateFields[] = 'completed_at = NOW()';
        }
        
        // Ajouter l'ID à la fin des paramètres
        $params[] = $id;
        
        // Mettre à jour le statut (et potentiellement l'assignation)
        $sql = 'UPDATE appointments SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        // Enregistrer dans l'historique
        $updateId = $this->generateUUID();
        $noteToSave = $redispatch ? 'Rendez-vous redispatché par le professionnel' : $note;
        $stmt = $this->db->prepare('
            INSERT INTO appointment_status_updates 
            (id, appointment_id, status, actor_id, actor_role, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ');
        $stmt->execute([$updateId, $id, $newStatus, $actorId, $actorRole, $noteToSave]);
        
        // Logger le changement
        $this->logger->log(
            $actorId,
            $actorRole,
            'update',
            'appointment',
            $id,
            [
                'old_status' => $oldStatus, 
                'new_status' => $newStatus, 
                'assigned' => in_array($actorRole, ['nurse', 'lab', 'subaccount']),
                'redispatch' => $redispatch
            ]
        );
        
        // Si redispatch, relancer le dispatch géographique
        if ($redispatch && $newStatus === 'pending') {
            $this->dispatchGeographic(
                $id,
                $appointment['type'],
                (float) $appointment['location_lat'],
                (float) $appointment['location_lng'],
                $appointment['scheduled_at'] ?? null
            );
        }
        
        // Envoyer notifications selon le nouveau statut (sauf pour redispatch)
        if (!$redispatch) {
            $this->sendStatusNotifications($id, $newStatus, $actorId, $actorRole);
        }
    }

    /**
     * Met à jour un rendez-vous (form_data, scheduled_at, address, status) - admin / super_admin
     */
    public function update(string $id, array $data, string $actorId, string $actorRole): void
    {
        $stmt = $this->db->prepare('SELECT id, type FROM appointments WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            throw new Exception('Rendez-vous introuvable');
        }

        $updateFields = ['updated_at = NOW()'];
        $params = [];

        if (isset($data['status'])) {
            $updateFields[] = 'status = ?';
            $params[] = $data['status'];
        }

        if (!empty($data['scheduled_at'])) {
            $scheduledAt = $data['scheduled_at'];
            if (is_string($scheduledAt) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/', $scheduledAt)) {
                $dt = new \DateTime($scheduledAt);
                $scheduledAt = $dt->format('Y-m-d H:i:s');
            }
            $updateFields[] = 'scheduled_at = ?';
            $params[] = $scheduledAt;
        }

        if (!empty($data['address']) && is_array($data['address']) && !empty($data['address']['label'])) {
            $lat = floatval($data['address']['lat'] ?? 0);
            $lng = floatval($data['address']['lng'] ?? 0);
            $addressEncrypted = $this->crypto->encryptField($data['address']['label']);
            $updateFields[] = 'address_encrypted = ?, address_dek = ?, location_lat = ?, location_lng = ?';
            $params[] = $addressEncrypted['encrypted'];
            $params[] = $addressEncrypted['dek'];
            $params[] = $lat;
            $params[] = $lng;
        }

        if (isset($data['form_data']) && is_array($data['form_data'])) {
            $formDataJson = json_encode($data['form_data']);
            $formDataEncrypted = $this->crypto->encryptField($formDataJson);
            $updateFields[] = 'form_data_encrypted = ?, form_data_dek = ?';
            $params[] = $formDataEncrypted['encrypted'];
            $params[] = $formDataEncrypted['dek'];
        }

        if (array_key_exists('assigned_lab_id', $data)) {
            $updateFields[] = 'assigned_lab_id = ?';
            $params[] = !empty($data['assigned_lab_id']) ? $data['assigned_lab_id'] : null;
        }
        if (array_key_exists('assigned_nurse_id', $data)) {
            $updateFields[] = 'assigned_nurse_id = ?';
            $params[] = !empty($data['assigned_nurse_id']) ? $data['assigned_nurse_id'] : null;
        }

        if (array_key_exists('category_id', $data)) {
            if (!empty($data['category_id']) && !Validation::uuid($data['category_id'])) {
                throw new Exception('ID de catégorie invalide (format UUID requis).');
            }
            $updateFields[] = 'category_id = ?';
            $params[] = !empty($data['category_id']) ? $data['category_id'] : null;
        }

        if (empty($params)) {
            return;
        }

        $params[] = $id;
        $sql = 'UPDATE appointments SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $this->logger->log($actorId, $actorRole, 'update', 'appointment', $id, [
            'fields' => array_keys($data),
        ]);
    }

    /**
     * Envoie les notifications selon le statut
     */
    private function sendStatusNotifications(string $appointmentId, string $status, ?string $actorId = null, ?string $actorRole = null): void
    {
        // Récupérer les informations complètes du rendez-vous
        $stmt = $this->db->prepare('
            SELECT a.patient_id, a.type, a.assigned_to, a.assigned_nurse_id, a.assigned_lab_id,
                   a.scheduled_at, a.address_encrypted, a.address_dek, a.category_id,
                   c.name as category_name
            FROM appointments a
            LEFT JOIN care_categories c ON a.category_id = c.id
            WHERE a.id = ?
        ');
        $stmt->execute([$appointmentId]);
        $appointment = $stmt->fetch();
        
        if (!$appointment) {
            return;
        }
        
        $patientId = $appointment['patient_id'];
        
        // Déchiffrer l'adresse si disponible
        $address = '';
        if (!empty($appointment['address_encrypted']) && !empty($appointment['address_dek'])) {
            try {
                $address = $this->crypto->decryptField($appointment['address_encrypted'], $appointment['address_dek']);
            } catch (Exception $e) {
                // Ignorer les erreurs de déchiffrement
            }
        }
        
        // Récupérer les infos du patient
        $patientFirstName = '';
        $patientLastName = '';
        $patientEmail = null;
        if ($patientId) {
            try {
                require_once __DIR__ . '/User.php';
                $userModel = new User();
                $patient = $userModel->getById($patientId, 'system', 'system');
                if ($patient) {
                    $patientFirstName = $patient['first_name'] ?? '';
                    $patientLastName = $patient['last_name'] ?? '';
                    $patientEmail = $patient['email'] ?? null;
                }
            } catch (Exception $e) {
                // Ignorer les erreurs
            }
        }
        
        // Libellé de l'acteur (labo, sous-compte, préleveur, infirmier) pour les messages de notification
        $actorDisplayLabel = null;
        if ($actorId && $actorRole && in_array($actorRole, ['nurse', 'lab', 'subaccount', 'preleveur'])) {
            $actorDisplayLabel = $this->getActorDisplayLabel($actorId, $actorRole);
        }
        
        switch ($status) {
            case 'confirmed':
                // Notification au patient (si patient existe) + email confirmation (async)
                if ($patientId) {
                    $this->notificationService->notifyAppointmentConfirmed($appointmentId, [
                        'patient_id' => $patientId,
                        'patient_email' => $patientEmail,
                        'id' => $appointmentId,
                        'scheduled_at' => $appointment['scheduled_at'] ?? null,
                        'type' => $appointment['type'] ?? 'blood_test',
                    ]);
                }
                
                // Notification à l'infirmier qui a accepté
                if (!empty($appointment['assigned_nurse_id'])) {
                    $this->notificationService->notifyNurseAcceptedAppointment(
                        $appointmentId,
                        $appointment['assigned_nurse_id'],
                        [
                            'patient_first_name' => $patientFirstName,
                            'patient_last_name' => $patientLastName,
                            'scheduled_at' => $appointment['scheduled_at'],
                            'address' => $address,
                            'category_name' => $appointment['category_name'] ?? 'Soins infirmiers',
                        ]
                    );
                }
                break;
                
            case 'inProgress':
                if ($patientId) {
                    $this->notificationService->notifyAppointmentStarted($appointmentId, $patientId);
                }
                break;
                
            case 'completed':
                if ($patientId) {
                    $this->notificationService->notifyAppointmentCompleted(
                        $appointmentId,
                        $patientId,
                        $actorDisplayLabel,
                        $patientFirstName,
                        $patientLastName,
                        $appointment['assigned_lab_id'] ?? null,
                        $appointment['assigned_to'] ?? null,
                        $appointment['assigned_nurse_id'] ?? null
                    );
                }
                break;
                
            case 'canceled':
                // Déterminer qui a annulé (patient ou professionnel) selon le rôle de l'acteur
                $canceledBy = 'patient'; // Par défaut
                if ($actorRole && in_array($actorRole, ['nurse', 'lab', 'subaccount', 'preleveur', 'super_admin'])) {
                    $canceledBy = 'nurse'; // Ou 'professional' mais on garde 'nurse' pour simplifier
                }
                
                $appointmentType = $appointment['type'] ?? null;
                $careTypeLabel = $appointment['category_name'] ?? (
                    $appointmentType === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers'
                );
                $this->notificationService->notifyAppointmentCanceled(
                    $appointmentId,
                    [
                        'patient_id' => $patientId,
                        'patient_email' => $patientEmail,
                        'patient_first_name' => $patientFirstName,
                        'patient_last_name' => $patientLastName,
                        'scheduled_at' => $appointment['scheduled_at'],
                        'address' => $address,
                        'category_name' => $careTypeLabel,
                        'type' => $appointmentType,
                        'assigned_nurse_id' => $appointment['assigned_nurse_id'],
                        'assigned_lab_id' => $appointment['assigned_lab_id'] ?? null,
                        'assigned_to' => $appointment['assigned_to'] ?? null,
                        'actor_display_label' => $actorDisplayLabel,
                    ],
                    $canceledBy,
                    $actorDisplayLabel
                );
                break;
                
            case 'refused':
                // L'infirmier refuse le RDV
                if (!empty($appointment['assigned_nurse_id'])) {
                    $this->notificationService->notifyAppointmentRefused(
                        $appointmentId,
                        $appointment['assigned_nurse_id'],
                        [
                            'patient_first_name' => $patientFirstName,
                            'patient_last_name' => $patientLastName,
                            'scheduled_at' => $appointment['scheduled_at'],
                            'category_name' => $appointment['category_name'] ?? 'Soins infirmiers',
                        ]
                    );
                }
                break;
        }
    }

    /**
     * Vérifie si un point est dans un polygone (algorithme ray casting)
     */
    private function pointInPolygon(float $lat, float $lng, array $polygon): bool
    {
        if (count($polygon) < 3) {
            return false;
        }

        $inside = false;
        $j = count($polygon) - 1;

        for ($i = 0; $i < count($polygon); $i++) {
            $xi = $polygon[$i][0];
            $yi = $polygon[$i][1];
            $xj = $polygon[$j][0];
            $yj = $polygon[$j][1];

            $intersect = (($yi > $lat) !== ($yj > $lat)) &&
                         ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi);

            if ($intersect) {
                $inside = !$inside;
            }

            $j = $i;
        }

        return $inside;
    }

    /**
     * Dispatch géographique : trouve les professionnels disponibles.
     * Pour blood_test : ne notifie que les labs qui acceptent les RDV et dont le délai min (min_booking_lead_time_hours) est respecté.
     * @param string|null $scheduledAt Date/heure du RDV (Y-m-d H:i:s) pour filtrer les labs par délai min
     */
    private function dispatchGeographic(string $appointmentId, string $type, float $lat, float $lng, ?string $scheduledAt = null): void
    {
        if ($type === 'nursing') {
            $roleFilter = 'nurse';
        } else {
            $roleFilter = "('lab', 'subaccount')";
        }
        
        // Récupérer toutes les zones de couverture actives avec l'adresse de l'infirmier
        if ($type === 'nursing') {
            $sql = "
                SELECT cz.*, p.id as profile_id, p.role,
                       p.address_encrypted, p.address_dek
                FROM coverage_zones cz
                INNER JOIN profiles p ON cz.owner_id = p.id
                WHERE cz.role = ?
                AND cz.is_active = TRUE
                AND cz.radius_km IS NOT NULL
                AND p.address_encrypted IS NOT NULL
                AND p.address_dek IS NOT NULL
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$roleFilter]);
        } else {
            // Labs/subaccounts : inclure toute zone active (centre ou adresse profil pour la distance)
            // p.lab_id : pour que le lab parent reçoive toujours les RDV des sous-comptes
            $sql = "
                SELECT cz.*, p.id as profile_id, p.role,
                       p.address_encrypted, p.address_dek,
                       p.is_accepting_appointments,
                       COALESCE(p.min_booking_lead_time_hours, 48) as min_booking_lead_time_hours,
                       COALESCE(p.accept_rdv_saturday, 1) as accept_rdv_saturday,
                       COALESCE(p.accept_rdv_sunday, 1) as accept_rdv_sunday,
                       p.lab_id
                FROM coverage_zones cz
                INNER JOIN profiles p ON cz.owner_id = p.id
                WHERE cz.role IN ('lab', 'subaccount')
                AND cz.is_active = TRUE
                AND cz.radius_km IS NOT NULL
                AND (cz.center_lat IS NOT NULL AND cz.center_lng IS NOT NULL
                     OR (p.address_encrypted IS NOT NULL AND p.address_dek IS NOT NULL))
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
        }
        
        $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $professionals = [];
        
        foreach ($zones as $zone) {
            $isInZone = false;
            
            // Utiliser l'adresse depuis profiles pour tous les professionnels (nurse, lab, subaccount)
            if ($zone['address_encrypted'] && $zone['address_dek']) {
                try {
                    $addressJson = $this->crypto->decryptField($zone['address_encrypted'], $zone['address_dek']);
                    $address = json_decode($addressJson, true);
                    
                    if ($address && isset($address['lat'], $address['lng'], $zone['radius_km'])) {
                        // Calculer la distance avec la formule Haversine
                        $profLat = floatval($address['lat']);
                        $profLng = floatval($address['lng']);
                        $radiusKm = floatval($zone['radius_km']);
                        
                        $distance = 6371 * acos(
                            cos(deg2rad($lat)) * cos(deg2rad($profLat)) *
                            cos(deg2rad($profLng) - deg2rad($lng)) +
                            sin(deg2rad($lat)) * sin(deg2rad($profLat))
                        );
                        
                        $isInZone = $distance <= $radiusKm;
                    }
                } catch (Exception $e) {
                    // Continuer avec le prochain professionnel si erreur de déchiffrement
                    continue;
                }
            } else {
                // Fallback : utiliser center_lat/lng si l'adresse n'est pas disponible
                if (isset($zone['center_lat'], $zone['center_lng'], $zone['radius_km'])) {
                    $distance = 6371 * acos(
                        cos(deg2rad($lat)) * cos(deg2rad($zone['center_lat'])) *
                        cos(deg2rad($zone['center_lng']) - deg2rad($lng)) +
                        sin(deg2rad($lat)) * sin(deg2rad($zone['center_lat']))
                    );
                    
                    $isInZone = $distance <= floatval($zone['radius_km']);
                }
            }
            
            if ($isInZone) {
                $entry = [
                    'id' => $zone['profile_id'],
                    'role' => $zone['role'],
                ];
                if ($type === 'blood_test' && isset($zone['is_accepting_appointments'], $zone['min_booking_lead_time_hours'])) {
                    $entry['is_accepting_appointments'] = (bool) $zone['is_accepting_appointments'];
                    $entry['min_booking_lead_time_hours'] = (int) $zone['min_booking_lead_time_hours'];
                    $entry['accept_rdv_saturday'] = (bool) ($zone['accept_rdv_saturday'] ?? true);
                    $entry['accept_rdv_sunday'] = (bool) ($zone['accept_rdv_sunday'] ?? true);
                    $entry['lab_id'] = !empty($zone['lab_id']) ? $zone['lab_id'] : null;
                }
                $professionals[] = $entry;
            }
        }
        
        // Pour blood_test sans lab assigné : exclure les labs qui n'acceptent pas les RDV, dont le délai min n'est pas respecté, ou qui n'acceptent pas samedi/dimanche
        if ($type === 'blood_test' && $scheduledAt !== null && $scheduledAt !== '') {
            $scheduledTs = strtotime($scheduledAt);
            $dayOfWeek = (int) date('w', $scheduledTs); // 0 = dimanche, 6 = samedi
            $now = time();
            $professionals = array_filter($professionals, function ($p) use ($scheduledTs, $now, $dayOfWeek) {
                if (empty($p['is_accepting_appointments'])) {
                    return false;
                }
                if ($dayOfWeek === 0 && empty($p['accept_rdv_sunday'])) {
                    return false;
                }
                if ($dayOfWeek === 6 && empty($p['accept_rdv_saturday'])) {
                    return false;
                }
                $minHours = (int) ($p['min_booking_lead_time_hours'] ?? 48);
                if ($minHours <= 0) {
                    return true;
                }
                $minAllowedTs = $now + ($minHours * 3600);
                return $scheduledTs >= $minAllowedTs;
            });
        }
        
        // Pour blood_test : ajouter le lab parent pour chaque sous-compte restant, afin qu'il reçoive toujours les RDV et puisse accepter pour eux
        if ($type === 'blood_test') {
            $labIdsToNotify = [];
            foreach ($professionals as $p) {
                if (($p['role'] ?? '') === 'subaccount' && !empty($p['lab_id'])) {
                    $labIdsToNotify[$p['lab_id']] = true;
                }
            }
            foreach (array_keys($labIdsToNotify) as $labId) {
                $professionals[] = ['id' => $labId, 'role' => 'lab'];
            }
            // Dédupliquer par id (un lab peut être déjà dans la liste via sa propre zone)
            $seen = [];
            $professionals = array_values(array_filter($professionals, function ($p) use (&$seen) {
                $id = $p['id'];
                if (in_array($id, $seen, true)) {
                    return false;
                }
                $seen[] = $id;
                return true;
            }));
        }
        
        // Limiter le nombre de professionnels notifiés pour éviter surcharge/timeout (100 max)
        $professionals = array_slice($professionals, 0, 100);
        
        // Enregistrer les offres (labs + infirmiers) pour afficher les RDV dans les listes et permettre la popup accepter/refuser
        $this->insertAppointmentOffers($appointmentId, $professionals);
        
        // Créer une notification web pour chaque professionnel trouvé
        foreach ($professionals as $professional) {
            try {
                $this->notificationService->createNotification(
                    $professional['id'],
                    'new_appointment_available',
                    'Nouveau rendez-vous disponible',
                    'Un nouveau rendez-vous est disponible dans votre zone de couverture',
                    ['appointment_id' => $appointmentId]
                );
                // Email async (envoyé après la réponse HTTP)
                EmailQueue::add('new_appointment_pro', null, [
                    'appointment_id' => $appointmentId,
                    'scheduled_at' => $scheduledAt ?? date('Y-m-d H:i:s'),
                    'role' => $type === 'nursing' ? 'nurse' : 'lab',
                ], $professional['id']);
            } catch (Exception $e) {
                // Continuer même si une notification échoue
            }
        }
        
        // SMS en file (shutdown) pour ne pas bloquer la réponse
        $scheduledAtStr = $scheduledAt ?? date('Y-m-d H:i:s');
        foreach ($professionals as $professional) {
            SmsQueue::addNewAppointment($professional['id'], $appointmentId, $scheduledAtStr);
        }
    }

    /**
     * Retourne le libellé d'affichage de l'acteur (laboratoire, sous-compte, préleveur, infirmier) pour les notifications
     */
    private function getActorDisplayLabel(string $actorId, string $actorRole): string
    {
        try {
            require_once __DIR__ . '/User.php';
            $userModel = new User();
            $actor = $userModel->getById($actorId, 'system', 'system');
            if (!$actor) {
                return $actorRole === 'nurse' ? "L'infirmier" : ($actorRole === 'preleveur' ? 'Le préleveur' : 'Le laboratoire');
            }
            $first = trim((string)($actor['first_name'] ?? ''));
            $last = trim((string)($actor['last_name'] ?? ''));
            $name = trim($first . ' ' . $last);
            $company = isset($actor['company_name']) ? trim((string)$actor['company_name']) : '';
            if ($actorRole === 'lab' || $actorRole === 'subaccount') {
                $labName = $company !== '' ? $company : ($name !== '' ? $name : 'Ce laboratoire');
                return 'Le laboratoire ' . $labName;
            }
            if ($actorRole === 'preleveur') {
                return 'Le préleveur ' . ($name !== '' ? $name : '');
            }
            if ($actorRole === 'nurse') {
                return ($name !== '' ? "L'infirmier " . $name : "L'infirmier");
            }
        } catch (Exception $e) {
            // Ignorer
        }
        return $actorRole === 'nurse' ? "L'infirmier" : ($actorRole === 'preleveur' ? 'Le préleveur' : 'Le laboratoire');
    }

    /**
     * Notifie tous les administrateurs super_admin de la création d'un nouveau rendez-vous
     */
    private function notifyAllAdmins(string $appointmentId, string $appointmentType, string $scheduledAt): void
    {
        try {
            // Récupérer tous les profils avec le rôle super_admin
            $stmt = $this->db->prepare('
                SELECT id 
                FROM profiles 
                WHERE role = ? 
                AND id IS NOT NULL
            ');
            $stmt->execute(['super_admin']);
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Type de rendez-vous en français pour le message
            $typeLabel = $appointmentType === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers';
            
            // Créer une notification pour chaque admin
            foreach ($admins as $admin) {
                try {
                    $this->notificationService->createNotification(
                        $admin['id'],
                        'new_appointment_created',
                        'Nouveau rendez-vous créé',
                        "Un nouveau rendez-vous de type \"{$typeLabel}\" a été créé et nécessite votre attention.",
                        [
                            'appointment_id' => $appointmentId,
                            'type' => $appointmentType,
                            'scheduled_at' => $scheduledAt,
                        ]
                    );
                } catch (Exception $e) {
                    // Logger l'erreur mais continuer avec les autres admins
                    error_log("Erreur lors de la notification admin {$admin['id']}: " . $e->getMessage());
                }
            }
        } catch (Exception $e) {
            // Logger l'erreur mais ne pas bloquer la création du rendez-vous
            error_log("Erreur lors de la récupération des admins: " . $e->getMessage());
        }
    }

    /**
     * Enregistre les offres (appointment_offers) pour que les labs/infirmiers voient le RDV dans leur liste.
     */
    private function insertAppointmentOffers(string $appointmentId, array $professionals): void
    {
        try {
            $stmt = $this->db->prepare('INSERT IGNORE INTO appointment_offers (appointment_id, profile_id) VALUES (?, ?)');
            foreach ($professionals as $p) {
                $profileId = $p['id'] ?? null;
                if ($profileId) {
                    $stmt->execute([$appointmentId, $profileId]);
                }
            }
        } catch (Throwable $e) {
            // Table peut ne pas exister si migration 040 non exécutée
            error_log('insertAppointmentOffers: ' . $e->getMessage());
        }
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

