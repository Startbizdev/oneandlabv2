<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Email.php';
require_once __DIR__ . '/Twilio.php';

/**
 * Service de gestion des notifications
 * Crée les notifications web et envoie SMS/Email selon les besoins
 */

class NotificationService
{
    private PDO $db;
    private Email $email;
    private ?Twilio $twilio = null;

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
        
        return $id;
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
                            $careType = $appointmentData['type'] === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers';
                        }
                    } catch (Exception $e) {
                        // En cas d'erreur, utiliser le type comme fallback
                        if (!empty($appointmentData['type'])) {
                            $careType = $appointmentData['type'] === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers';
                        }
                    }
                }
                
                $scheduledAt = '';
                if (!empty($appointmentData['scheduled_at'])) {
                    $date = new DateTime($appointmentData['scheduled_at']);
                    $scheduledAt = $date->format('d/m/Y');
                }
                
                $message = 'Votre rendez-vous a été créé avec succès';
                if ($careType) {
                    $message .= " ({$careType})";
                }
                if ($scheduledAt) {
                    $message .= " du {$scheduledAt}";
                }
                $message .= ".";
                
                $this->createNotification(
                    $appointmentData['patient_id'],
                    'appointment_created',
                    'Nouveau rendez-vous créé',
                    $message,
                    ['appointment_id' => $appointmentId]
                );
            } catch (Exception $e) {
                // Logger l'erreur mais ne pas bloquer le processus
                error_log("Erreur notification patient pour RDV {$appointmentId}: " . $e->getMessage());
            }
        }
        
        // Email au patient si email disponible
        if (!empty($appointmentData['patient_email'])) {
            try {
                $this->email->sendAppointmentConfirmation(
                    $appointmentData['patient_email'],
                    $appointmentData
                );
            } catch (Exception $e) {
                // Logger l'erreur mais ne pas bloquer le processus
                error_log("Erreur envoi email patient pour RDV {$appointmentId}: " . $e->getMessage());
            }
        }
        
        // Les notifications aux professionnels (labos, sous-labos, infirmiers) 
        // sont gérées par dispatchGeographic dans Appointment.php
        // Les notifications aux admins sont gérées par notifyAllAdmins dans Appointment.php
    }

    /**
     * Notifie la confirmation d'un rendez-vous
     */
    public function notifyAppointmentConfirmed(string $appointmentId, array $appointmentData): void
    {
        // Notification au patient
        $this->createNotification(
            $appointmentData['patient_id'],
            'appointment_confirmed',
            'Rendez-vous confirmé',
            'Votre rendez-vous a été confirmé',
            ['appointment_id' => $appointmentId]
        );
        
        // SMS au patient (si Twilio est configuré)
        if (!empty($appointmentData['patient_phone']) && $this->twilio !== null) {
            try {
                $this->twilio->sendAppointmentConfirmation(
                    $appointmentData['patient_phone'],
                    $appointmentData
                );
            } catch (Exception $e) {
                // Ne pas bloquer le processus si l'envoi SMS échoue
            }
        }
    }

    /**
     * Notifie l'infirmier qu'il a accepté un rendez-vous
     */
    public function notifyNurseAcceptedAppointment(string $appointmentId, string $nurseId, array $appointmentData): void
    {
        // Récupérer les infos du patient pour le message
        $patientName = 'Un patient';
        $address = '';
        $scheduledAt = '';
        $careType = '';
        
        if (!empty($appointmentData['patient_first_name']) && !empty($appointmentData['patient_last_name'])) {
            $patientName = $appointmentData['patient_first_name'] . ' ' . $appointmentData['patient_last_name'];
        }
        
        if (!empty($appointmentData['address'])) {
            $address = is_array($appointmentData['address']) 
                ? ($appointmentData['address']['label'] ?? '')
                : $appointmentData['address'];
        }
        
        if (!empty($appointmentData['scheduled_at'])) {
            $date = new DateTime($appointmentData['scheduled_at']);
            $scheduledAt = $date->format('d/m/Y');
        }
        
        if (!empty($appointmentData['category_name'])) {
            $careType = $appointmentData['category_name'];
        } else {
            $careType = 'Soins infirmiers';
        }
        
        // Construire le message détaillé
        $message = "Vous avez accepté le rendez-vous de {$patientName}";
        if ($careType) {
            $message .= " ({$careType})";
        }
        if ($scheduledAt) {
            $message .= " prévu le {$scheduledAt}";
        }
        if ($address) {
            $message .= " à {$address}";
        }
        $message .= ".";
        
        // Notification web pour l'infirmier
        $this->createNotification(
            $nurseId,
            'appointment_accepted',
            'Rendez-vous accepté',
            $message,
            [
                'appointment_id' => $appointmentId,
                'patient_name' => $patientName,
                'scheduled_at' => $appointmentData['scheduled_at'] ?? null,
                'address' => $address,
                'care_type' => $careType,
            ]
        );
    }

    /**
     * Notifie l'annulation d'un rendez-vous
     */
    public function notifyAppointmentCanceled(string $appointmentId, array $appointmentData, string $canceledBy): void
    {
        $patientName = '';
        if (!empty($appointmentData['patient_first_name']) && !empty($appointmentData['patient_last_name'])) {
            $patientName = $appointmentData['patient_first_name'] . ' ' . $appointmentData['patient_last_name'];
        }
        
        $scheduledAt = '';
        if (!empty($appointmentData['scheduled_at'])) {
            $date = new DateTime($appointmentData['scheduled_at']);
            $scheduledAt = $date->format('d/m/Y');
        }
        
        $careType = $appointmentData['category_name'] ?? 'Soins infirmiers';
        $address = $appointmentData['address'] ?? '';
        
        // Notification au patient (si annulé par l'infirmier)
        if ($canceledBy === 'nurse' && !empty($appointmentData['patient_id'])) {
            $message = "Votre rendez-vous";
            if ($careType) $message .= " ({$careType})";
            if ($scheduledAt) $message .= " du {$scheduledAt}";
            $message .= " a été annulé par le professionnel de santé.";
            
            $this->createNotification(
                $appointmentData['patient_id'],
                'appointment_canceled',
                'Rendez-vous annulé',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'canceled_by' => $canceledBy,
                ]
            );
        }
        
        // Notification au patient qu'il a annulé son RDV (confirmation)
        if ($canceledBy === 'patient' && !empty($appointmentData['patient_id'])) {
            $message = "Vous avez annulé votre rendez-vous";
            if ($careType) $message .= " ({$careType})";
            if ($scheduledAt) $message .= " du {$scheduledAt}";
            $message .= ".";
            
            $this->createNotification(
                $appointmentData['patient_id'],
                'appointment_canceled_confirmation',
                'Rendez-vous annulé',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'canceled_by' => $canceledBy,
                ]
            );
        }
        
        // Notification à l'infirmier (si annulé par le patient)
        if ($canceledBy === 'patient' && !empty($appointmentData['assigned_nurse_id'])) {
            $message = "Le rendez-vous de {$patientName}";
            if ($careType) $message .= " ({$careType})";
            if ($scheduledAt) $message .= " prévu le {$scheduledAt}";
            $message .= " a été annulé par le patient.";
            
            $this->createNotification(
                $appointmentData['assigned_nurse_id'],
                'appointment_canceled',
                'Rendez-vous annulé par le patient',
                $message,
                [
                    'appointment_id' => $appointmentId,
                    'patient_name' => $patientName,
                    'canceled_by' => $canceledBy,
                ]
            );
        }
        
        // Notification à l'infirmier qu'il a annulé le RDV (confirmation)
        if ($canceledBy === 'nurse' && !empty($appointmentData['assigned_nurse_id'])) {
            $message = "Vous avez annulé le rendez-vous de {$patientName}";
            if ($careType) $message .= " ({$careType})";
            if ($scheduledAt) $message .= " prévu le {$scheduledAt}";
            $message .= ".";
            
            $this->createNotification(
                $appointmentData['assigned_nurse_id'],
                'appointment_canceled_confirmation',
                'Rendez-vous annulé',
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
     * Notifie le refus d'un rendez-vous par l'infirmier
     */
    public function notifyAppointmentRefused(string $appointmentId, string $nurseId, array $appointmentData): void
    {
        $patientName = '';
        if (!empty($appointmentData['patient_first_name']) && !empty($appointmentData['patient_last_name'])) {
            $patientName = $appointmentData['patient_first_name'] . ' ' . $appointmentData['patient_last_name'];
        }
        
        $scheduledAt = '';
        if (!empty($appointmentData['scheduled_at'])) {
            $date = new DateTime($appointmentData['scheduled_at']);
            $scheduledAt = $date->format('d/m/Y');
        }
        
        $careType = $appointmentData['category_name'] ?? 'Soins infirmiers';
        
        // Notification de confirmation pour l'infirmier
        $message = "Vous avez refusé le rendez-vous de {$patientName}";
        if ($careType) $message .= " ({$careType})";
        if ($scheduledAt) $message .= " prévu le {$scheduledAt}";
        $message .= ". Le rendez-vous sera proposé à un autre professionnel.";
        
        $this->createNotification(
            $nurseId,
            'appointment_refused',
            'Rendez-vous refusé',
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
            'Votre professionnel a commencé le soin',
            ['appointment_id' => $appointmentId]
        );
    }

    /**
     * Notifie la fin d'un soin
     */
    public function notifyAppointmentCompleted(string $appointmentId, string $patientId): void
    {
        // Notification web
        $this->createNotification(
            $patientId,
            'appointment_completed',
            'Soin terminé',
            'Votre rendez-vous est terminé. N\'oubliez pas de laisser un avis !',
            ['appointment_id' => $appointmentId]
        );
        
        // Récupérer l'email du patient pour envoyer l'invitation à noter
        try {
            require_once __DIR__ . '/../models/User.php';
            $userModel = new User();
            $patient = $userModel->getById($patientId, 'system', 'system');
            
            if ($patient && !empty($patient['email'])) {
                // Récupérer les infos du rendez-vous pour l'email
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
                    // Envoyer l'email d'invitation à noter
                    $this->email->sendReviewInvitation(
                        $patient['email'],
                        $appointmentId,
                        [
                            'scheduled_at' => $appointment['scheduled_at'],
                            'type' => $appointment['type'] === 'blood_test' ? 'Prise de sang' : 'Soins infirmiers',
                        ]
                    );
                }
            }
        } catch (Exception $e) {
            // Ne pas bloquer le processus si l'envoi échoue
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

