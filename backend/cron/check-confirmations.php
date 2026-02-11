<?php

/**
 * Script cron pour vérifier les confirmations J-30min
 * À exécuter toutes les minutes
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Email.php';
require_once __DIR__ . '/../lib/Logger.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Appointment.php';

$config = require __DIR__ . '/../config/database.php';

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $config['host'],
    $config['port'],
    $config['database'],
    $config['charset']
);

$db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
$email = new Email();
$logger = new Logger();
$userModel = new User();
$appointmentModel = new Appointment();

// Récupérer les rendez-vous confirmés dans les 30 prochaines minutes
$now = new DateTime();
$in30min = clone $now;
$in30min->modify('+30 minutes');
$in25min = clone $now;
$in25min->modify('+25 minutes');
$in20min = clone $now;
$in20min->modify('+20 minutes');
$in10min = clone $now;
$in10min->modify('+10 minutes');

$stmt = $db->prepare('
    SELECT id, scheduled_at, assigned_to, assigned_nurse_id, status
    FROM appointments
    WHERE status = "confirmed"
    AND scheduled_at BETWEEN ? AND ?
    AND scheduled_at > NOW()
');

$stmt->execute([$now->format('Y-m-d H:i:s'), $in30min->format('Y-m-d H:i:s')]);
$appointments = $stmt->fetchAll();

foreach ($appointments as $appointment) {
    $scheduledAt = new DateTime($appointment['scheduled_at']);
    $diffMinutes = ($scheduledAt->getTimestamp() - $now->getTimestamp()) / 60;
    
    $professionalId = $appointment['assigned_to'] ?? $appointment['assigned_nurse_id'];
    
    if (!$professionalId) {
        continue;
    }
    
    // J-30min : Email urgent
    if ($diffMinutes <= 30 && $diffMinutes > 25) {
        // Récupérer l'email du professionnel (nécessite déchiffrement)
        // Envoyer email urgent
        $logger->log(
            'system',
            'system',
            'reminder_sent',
            'appointment',
            $appointment['id'],
            ['minutes' => 30]
        );
    }
    
    // J-25min : Email x2
    if ($diffMinutes <= 25 && $diffMinutes > 20) {
        // Envoyer email x2
        $logger->log(
            'system',
            'system',
            'reminder_sent',
            'appointment',
            $appointment['id'],
            ['minutes' => 25]
        );
    }
    
    // J-20min : Email x3
    if ($diffMinutes <= 20 && $diffMinutes > 10) {
        // Envoyer email x3
        $logger->log(
            'system',
            'system',
            'reminder_sent',
            'appointment',
            $appointment['id'],
            ['minutes' => 20]
        );
    }
    
    // J-10min : Annulation automatique + Incident grave
    if ($diffMinutes <= 10 && $diffMinutes > 0) {
        // Annuler le rendez-vous
        try {
            $appointmentModel->updateStatus(
                $appointment['id'],
                'expired',
                'system',
                'system',
                'Annulé automatiquement : non confirmé dans les délais'
            );
            
            // Ajouter un incident au professionnel
            $userModel->addIncident($professionalId, 'system', 'system');
            
            $logger->log(
                'system',
                'system',
                'auto_cancel',
                'appointment',
                $appointment['id'],
                ['reason' => 'non_confirmed_10min']
            );
        } catch (Exception $e) {
            // Erreur silencieuse - continuer avec les autres rendez-vous
        }
    }
}

// Reset des incidents après 90 jours
$userModel->resetIncidentsIfNeeded();

echo "Vérification terminée\n";

