<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Logger.php';

/**
 * Modèle Notification
 * Gestion des notifications web pour les utilisateurs
 */
class Notification
{
    private PDO $db;
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
        $this->logger = new Logger();
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

    /**
     * Crée une notification
     */
    public function create(string $userId, string $type, string $title, string $message, ?array $metadata = null): string
    {
        $id = $this->generateUUID();
        
        $stmt = $this->db->prepare('
            INSERT INTO notifications (
                id, user_id, type, title, message, data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        ');
        
        $stmt->execute([
            $id,
            $userId,
            $type,
            $title,
            $message,
            $metadata ? json_encode($metadata) : null,
        ]);
        
        // Logger la création
        $this->logger->log(
            'system',
            'system',
            'create',
            'notification',
            $id,
            [
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
            ]
        );
        
        return $id;
    }

    /**
     * Récupère les notifications non lues d'un utilisateur
     */
    public function getUnreadByUser(string $userId, int $limit = 50): array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM notifications
            WHERE user_id = ? AND read_at IS NULL
            ORDER BY created_at DESC
            LIMIT ?
        ');
        
        $stmt->execute([$userId, $limit]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Décoder le champ data (JSON)
        foreach ($notifications as &$notification) {
            if (!empty($notification['data'])) {
                $notification['data'] = is_string($notification['data']) ? json_decode($notification['data'], true) : $notification['data'];
            }
        }
        
        return $notifications;
    }

    /**
     * Récupère toutes les notifications d'un utilisateur
     */
    public function getByUser(string $userId, int $limit = 100, int $offset = 0): array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ');
        
        $stmt->execute([$userId, $limit, $offset]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Décoder le champ data (JSON)
        foreach ($notifications as &$notification) {
            if (!empty($notification['data'])) {
                $notification['data'] = is_string($notification['data']) ? json_decode($notification['data'], true) : $notification['data'];
            }
        }
        
        return $notifications;
    }

    /**
     * Marque une notification comme lue
     */
    public function markAsRead(string $id, string $userId): bool
    {
        $stmt = $this->db->prepare('
            UPDATE notifications
            SET read_at = NOW()
            WHERE id = ? AND user_id = ?
        ');
        
        $result = $stmt->execute([$id, $userId]);
        
        if ($result) {
            $this->logger->log(
                $userId,
                null,
                'update',
                'notification',
                $id,
                ['action' => 'mark_as_read']
            );
        }
        
        return $result;
    }

    /**
     * Marque toutes les notifications d'un utilisateur comme lues
     */
    public function markAllAsRead(string $userId): int
    {
        $stmt = $this->db->prepare('
            UPDATE notifications
            SET read_at = NOW()
            WHERE user_id = ? AND read_at IS NULL
        ');
        
        $stmt->execute([$userId]);
        $count = $stmt->rowCount();
        
        if ($count > 0) {
            $this->logger->log(
                $userId,
                null,
                'update',
                'notifications',
                $userId,
                ['action' => 'mark_all_as_read', 'count' => $count]
            );
        }
        
        return $count;
    }

    /**
     * Compte les notifications non lues d'un utilisateur
     */
    public function countUnreadByUser(string $userId): int
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) as count FROM notifications
            WHERE user_id = ? AND read_at IS NULL
        ');
        
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return (int) ($result['count'] ?? 0);
    }

    /**
     * Supprime une notification
     */
    public function delete(string $id, string $userId): bool
    {
        $stmt = $this->db->prepare('
            DELETE FROM notifications
            WHERE id = ? AND user_id = ?
        ');
        
        $result = $stmt->execute([$id, $userId]);
        
        if ($result) {
            $this->logger->log(
                $userId,
                null,
                'delete',
                'notification',
                $id,
                []
            );
        }
        
        return $result;
    }

    /**
     * Nettoie les anciennes notifications (> 90 jours)
     */
    public function cleanOldNotifications(): int
    {
        $stmt = $this->db->prepare('
            DELETE FROM notifications
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        ');
        
        $stmt->execute();
        $count = $stmt->rowCount();
        
        if ($count > 0) {
            $this->logger->log(
                'system',
                'system',
                'cleanup',
                'notifications',
                null,
                ['deleted_count' => $count]
            );
        }
        
        return $count;
    }

    /**
     * Vérifie si l'utilisateur a déjà une notification de bienvenue
     */
    public function hasWelcomeNotification(string $userId): bool
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*) as count FROM notifications
            WHERE user_id = ? AND type = ?
        ');
        
        $stmt->execute([$userId, 'welcome']);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return (int) ($result['count'] ?? 0) > 0;
    }

    /**
     * Crée une notification de bienvenue personnalisée selon le rôle
     */
    public function createWelcomeNotification(string $userId, string $role): string
    {
        $messages = [
            'patient' => [
                'title' => '👋 Bienvenue sur OneAndLab !',
                'message' => 'Bonjour ! 👋 Merci de nous faire confiance pour vos soins à domicile. Nous sommes là pour vous accompagner dans vos prises de sang et soins infirmiers. N\'hésitez pas à prendre rendez-vous dès maintenant !'
            ],
            'nurse' => [
                'title' => '👋 Bienvenue sur OneAndLab !',
                'message' => 'Salut ! 👋 Merci de rejoindre notre équipe d\'infirmiers. Vous pouvez maintenant gérer vos rendez-vous, consulter votre calendrier et offrir des soins de qualité à nos patients. Bon travail !'
            ],
            'lab' => [
                'title' => '👋 Bienvenue sur OneAndLab !',
                'message' => 'Bonjour ! 👋 Merci de nous faire confiance pour gérer vos prélèvements. Vous pouvez maintenant organiser vos rendez-vous, gérer vos préleveurs et suivre vos statistiques. Bienvenue dans l\'équipe !'
            ],
            'preleveur' => [
                'title' => '👋 Bienvenue sur OneAndLab !',
                'message' => 'Salut ! 👋 Merci de rejoindre notre équipe de préleveurs. Vous pouvez maintenant consulter votre calendrier et gérer vos rendez-vous de prélèvement. Bon travail !'
            ],
            'pro' => [
                'title' => '👋 Bienvenue sur OneAndLab !',
                'message' => 'Bonjour ! 👋 Merci de nous faire confiance pour vos besoins médicaux. Vous pouvez maintenant gérer vos rendez-vous, vos patients et votre calendrier. Bienvenue !'
            ],
            'super_admin' => [
                'title' => '👋 Bienvenue sur OneAndLab !',
                'message' => 'Bonjour ! 👋 Bienvenue dans l\'administration de OneAndLab. Vous avez accès à tous les outils de gestion de la plateforme. Bonne journée !'
            ],
            'subaccount' => [
                'title' => '👋 Bienvenue sur OneAndLab !',
                'message' => 'Bonjour ! 👋 Merci de nous faire confiance pour gérer vos prélèvements. Vous pouvez maintenant organiser vos rendez-vous et gérer vos préleveurs. Bienvenue !'
            ],
        ];

        $welcome = $messages[$role] ?? $messages['patient'];
        
        return $this->create(
            $userId,
            'welcome',
            $welcome['title'],
            $welcome['message'],
            ['is_welcome' => true]
        );
    }
}

