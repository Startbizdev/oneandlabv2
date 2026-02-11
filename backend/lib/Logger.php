<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Classe de logging HDS pour conformité
 * Enregistre tous les accès aux données sensibles dans access_logs
 */

class Logger
{
    private PDO $db;

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
    }

    /**
     * Log une action dans access_logs
     */
    private const ALLOWED_ROLES = ['super_admin', 'lab', 'subaccount', 'preleveur', 'nurse', 'pro', 'patient'];

    public function log(
        ?string $userId,
        ?string $role,
        string $action,
        string $resourceType,
        ?string $resourceId = null,
        ?array $details = null,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): void {
        // user_id doit référencer profiles.id : 'system' ou autre acteur non-profil → NULL
        if ($userId === 'system' || $userId === '' || $userId === null) {
            $userId = null;
        }
        // Sanitize role to match the access_logs ENUM — invalid values (e.g. 'system') become NULL
        if ($role !== null && !in_array($role, self::ALLOWED_ROLES, true)) {
            $role = null;
        }

        $stmt = $this->db->prepare('
            INSERT INTO access_logs
            (user_id, role, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');

        $stmt->execute([
            $userId,
            $role,
            $action,
            $resourceType,
            $resourceId,
            $details ? json_encode($details) : null,
            $ipAddress ?? $this->getIpAddress(),
            $userAgent ?? $this->getUserAgent(),
        ]);
    }

    /**
     * Log un déchiffrement (obligatoire pour HDS)
     */
    public function logDecrypt(
        string $userId,
        string $role,
        string $resourceType,
        string $resourceId,
        array $decryptedFields,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): void {
        $this->log(
            $userId,
            $role,
            'decrypt',
            $resourceType,
            $resourceId,
            ['fields' => array_keys($decryptedFields)],
            $ipAddress,
            $userAgent
        );
    }

    /**
     * Récupère l'adresse IP de la requête
     */
    private function getIpAddress(): ?string
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR',
        ];
        
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = $_SERVER[$header];
                // Prendre la première IP si plusieurs (X-Forwarded-For)
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                return $ip;
            }
        }
        
        return null;
    }

    /**
     * Récupère le User Agent de la requête
     */
    private function getUserAgent(): ?string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? null;
    }
}




