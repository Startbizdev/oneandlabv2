<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Logger.php';

/**
 * Modèle Review
 */

class Review
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
     * Crée un nouvel avis
     */
    public function create(array $data, string $patientId): string
    {
        $id = $this->generateUUID();
        
        $stmt = $this->db->prepare('
            INSERT INTO reviews (
                id, appointment_id, patient_id, reviewee_id, reviewee_type,
                rating, comment, is_visible, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())
        ');
        
        $stmt->execute([
            $id,
            $data['appointment_id'],
            $patientId,
            $data['reviewee_id'],
            $data['reviewee_type'],
            $data['rating'],
            $data['comment'] ?? null,
        ]);
        
        // Logger la création
        $this->logger->log(
            $patientId,
            'patient',
            'create',
            'review',
            $id,
            ['reviewee_id' => $data['reviewee_id'], 'rating' => $data['rating']]
        );
        
        return $id;
    }

    /**
     * Récupère les statistiques d'un professionnel
     */
    public function getStats(string $revieweeId): array
    {
        $stmt = $this->db->prepare('
            SELECT 
                COUNT(*) as total_reviews,
                AVG(rating) as average_rating,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5
            FROM reviews
            WHERE reviewee_id = ? AND is_visible = TRUE
        ');
        $stmt->execute([$revieweeId]);
        $stats = $stmt->fetch();
        
        return [
            'total_reviews' => (int) $stats['total_reviews'],
            'average_rating' => round((float) $stats['average_rating'], 1),
            'rating_distribution' => [
                '1' => (int) $stats['rating_1'],
                '2' => (int) $stats['rating_2'],
                '3' => (int) $stats['rating_3'],
                '4' => (int) $stats['rating_4'],
                '5' => (int) $stats['rating_5'],
            ],
        ];
    }

    /**
     * Récupère la liste des avis avec pagination et filtres
     */
    public function getAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $sql = 'SELECT r.*, 
                       p.first_name_encrypted, p.first_name_dek,
                       p.last_name_encrypted, p.last_name_dek
                FROM reviews r
                LEFT JOIN profiles p ON r.patient_id = p.id
                WHERE 1=1';
        $params = [];
        
        // Filtrer par reviewee_id
        if (!empty($filters['reviewee_id'])) {
            $sql .= ' AND r.reviewee_id = ?';
            $params[] = $filters['reviewee_id'];
        }
        
        // Filtrer par appointment_id
        if (!empty($filters['appointment_id'])) {
            $sql .= ' AND r.appointment_id = ?';
            $params[] = $filters['appointment_id'];
        }
        
        // Filtrer par reviewee_type
        if (!empty($filters['reviewee_type'])) {
            $sql .= ' AND r.reviewee_type = ?';
            $params[] = $filters['reviewee_type'];
        }
        
        // Filtrer par is_visible (par défaut, seulement les visibles)
        if (isset($filters['is_visible'])) {
            $sql .= ' AND r.is_visible = ?';
            $params[] = $filters['is_visible'] ? 1 : 0;
        } else {
            // Par défaut, seulement les avis visibles
            $sql .= ' AND r.is_visible = TRUE';
        }
        
        // Compter le total
        $countSql = 'SELECT COUNT(*) as total FROM reviews r WHERE 1=1';
        $countParams = [];
        if (!empty($filters['reviewee_id'])) {
            $countSql .= ' AND r.reviewee_id = ?';
            $countParams[] = $filters['reviewee_id'];
        }
        if (!empty($filters['appointment_id'])) {
            $countSql .= ' AND r.appointment_id = ?';
            $countParams[] = $filters['appointment_id'];
        }
        if (!empty($filters['reviewee_type'])) {
            $countSql .= ' AND r.reviewee_type = ?';
            $countParams[] = $filters['reviewee_type'];
        }
        if (isset($filters['is_visible'])) {
            $countSql .= ' AND r.is_visible = ?';
            $countParams[] = $filters['is_visible'] ? 1 : 0;
        } else {
            $countSql .= ' AND r.is_visible = TRUE';
        }
        
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($countParams);
        $total = (int) $countStmt->fetch()['total'];
        
        // Pagination
        $offset = ($page - 1) * $limit;
        $sql .= ' ORDER BY r.created_at DESC LIMIT ' . (int)$limit . ' OFFSET ' . (int)$offset;
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $reviews = $stmt->fetchAll();
        
        // Déchiffrer les noms des patients si disponibles
        require_once __DIR__ . '/../lib/Crypto.php';
        $crypto = new Crypto();
        
        $decryptedReviews = [];
        foreach ($reviews as $review) {
            $decryptedReview = [
                'id' => $review['id'],
                'appointment_id' => $review['appointment_id'],
                'patient_id' => $review['patient_id'],
                'reviewee_id' => $review['reviewee_id'],
                'reviewee_type' => $review['reviewee_type'],
                'rating' => (int) $review['rating'],
                'comment' => $review['comment'],
                'is_visible' => (bool) $review['is_visible'],
                'response' => $review['response'],
                'moderation_note' => $review['moderation_note'],
                'created_at' => $review['created_at'],
                'updated_at' => $review['updated_at'],
            ];
            
            // Déchiffrer le nom du patient si disponible
            if (!empty($review['first_name_encrypted']) && !empty($review['first_name_dek'])) {
                try {
                    $decryptedReview['patient_first_name'] = $crypto->decryptField($review['first_name_encrypted'], $review['first_name_dek']);
                } catch (Exception $e) {
                    $decryptedReview['patient_first_name'] = null;
                }
            }
            
            if (!empty($review['last_name_encrypted']) && !empty($review['last_name_dek'])) {
                try {
                    $decryptedReview['patient_last_name'] = $crypto->decryptField($review['last_name_encrypted'], $review['last_name_dek']);
                } catch (Exception $e) {
                    $decryptedReview['patient_last_name'] = null;
                }
            }
            
            $decryptedReviews[] = $decryptedReview;
        }
        
        return [
            'data' => $decryptedReviews,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit),
        ];
    }

    /**
     * Modère un avis (masquer/afficher)
     */
    public function moderate(string $id, bool $isVisible, string $moderatedBy, ?string $moderationNote = null): void
    {
        $stmt = $this->db->prepare('
            UPDATE reviews 
            SET 
                is_visible = ?,
                moderation_note = ?,
                moderated_by = ?,
                moderated_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ');
        
        $stmt->execute([
            $isVisible ? 1 : 0,
            $moderationNote,
            $moderatedBy,
            $id,
        ]);
        
        // Logger la modération
        $this->logger->log(
            $moderatedBy,
            'super_admin',
            'update',
            'review',
            $id,
            [
                'action' => $isVisible ? 'show' : 'hide',
                'moderation_note' => $moderationNote,
            ]
        );
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

