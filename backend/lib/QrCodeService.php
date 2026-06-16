<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Crypto.php';
require_once __DIR__ . '/QrPosterRenderer.php';
require_once __DIR__ . '/NotificationService.php';
require_once __DIR__ . '/../models/User.php';

class QrCodeService
{
    private const ELIGIBLE_ROLES = ['nurse', 'lab', 'subaccount', 'pro'];

    private PDO $db;
    private Crypto $crypto;
    private QrPosterRenderer $poster;
    private string $siteUrl;

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
        $this->poster = new QrPosterRenderer();
        $app = require __DIR__ . '/../config/app.php';
        $this->siteUrl = (string) ($app['site_url'] ?? 'https://cary.bio');
    }

    public static function isEligibleRole(string $role): bool
    {
        return in_array($role, self::ELIGIBLE_ROLES, true);
    }

    /** @return array<string, mixed> */
    public function ensureForProfile(string $profileId): array
    {
        $profile = $this->fetchProfileRow($profileId);
        if ($profile === null) {
            throw new InvalidArgumentException('Profil introuvable');
        }
        $role = (string) ($profile['role'] ?? '');
        if (!self::isEligibleRole($role)) {
            throw new InvalidArgumentException('Rôle non éligible au QR');
        }

        $existing = $this->getByProfileId($profileId);
        if ($existing !== null) {
            $redirect = $this->buildRedirectUrl($profileId, $role);
            if (($existing['redirect_url'] ?? '') !== $redirect) {
                $upd = $this->db->prepare('UPDATE qr_codes SET redirect_url = ?, user_role = ?, updated_at = NOW() WHERE id = ?');
                $upd->execute([$redirect, $role, $existing['id']]);
                $existing['redirect_url'] = $redirect;
                $existing['user_role'] = $role;
            }

            return $this->enrichQrRow($existing, $profile);
        }

        $id = $this->generateUuid();
        $token = $this->generateUniqueToken();
        $redirect = $this->buildRedirectUrl($profileId, $role);
        $ins = $this->db->prepare('
            INSERT INTO qr_codes (id, profile_id, user_role, token, redirect_url, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
        ');
        $ins->execute([$id, $profileId, $role, $token, $redirect]);

        return $this->enrichQrRow([
            'id' => $id,
            'profile_id' => $profileId,
            'user_role' => $role,
            'token' => $token,
            'redirect_url' => $redirect,
            'marketing_tagline' => null,
            'is_active' => 1,
        ], $profile);
    }

    /** @return array<string, mixed>|null */
    public function getByProfileId(string $profileId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM qr_codes WHERE profile_id = ? LIMIT 1');
        $stmt->execute([$profileId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** @return array<string, mixed> */
    public function getMePayload(string $profileId): array
    {
        $qr = $this->ensureForProfile($profileId);
        $stats = $this->getAnalyticsSummary($qr['id']);

        return [
            'qr' => $qr,
            'analytics' => $stats,
        ];
    }

    /** @param array{user_agent?:string,referrer?:string,ip?:string} $meta */
    public function resolveToken(string $token, array $meta = []): array
    {
        $token = trim($token);
        $stmt = $this->db->prepare('SELECT * FROM qr_codes WHERE token = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('QR introuvable', 404);
        }

        $scanId = $this->recordScan((string) $row['id'], $meta);
        $redirect = (string) $row['redirect_url'];
        $sep = strpos($redirect, '?') !== false ? '&' : '?';
        $redirect .= $sep . 'utm_qr=' . rawurlencode($token);

        return [
            'redirect_url' => $redirect,
            'token' => (string) $row['token'],
            'scan_id' => $scanId,
        ];
    }

    public function recordVisit(string $token, ?string $sessionId = null): string
    {
        $stmt = $this->db->prepare('SELECT id FROM qr_codes WHERE token = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([trim($token)]);
        $qrId = $stmt->fetchColumn();
        if (!$qrId) {
            throw new RuntimeException('QR introuvable', 404);
        }
        $visitId = $this->generateUuid();
        $ins = $this->db->prepare('
            INSERT INTO qr_visits (id, qr_code_id, visited_at, session_id) VALUES (?, ?, NOW(), ?)
        ');
        $ins->execute([$visitId, $qrId, $sessionId]);

        return $visitId;
    }

    public function recordConversion(string $qrCodeId, string $appointmentId, ?string $visitId = null): void
    {
        $check = $this->db->prepare('SELECT id FROM qr_conversions WHERE appointment_id = ? LIMIT 1');
        $check->execute([$appointmentId]);
        if ($check->fetchColumn()) {
            return;
        }
        $id = $this->generateUuid();
        $ins = $this->db->prepare('
            INSERT INTO qr_conversions (id, qr_code_id, visit_id, appointment_id, converted_at)
            VALUES (?, ?, ?, ?, NOW())
        ');
        $ins->execute([$id, $qrCodeId, $visitId, $appointmentId]);

        $stmt = $this->db->prepare('SELECT profile_id FROM qr_codes WHERE id = ? LIMIT 1');
        $stmt->execute([$qrCodeId]);
        $profileId = $stmt->fetchColumn();
        if ($profileId) {
            try {
                $notif = new NotificationService();
                $notif->createNotification(
                    (string) $profileId,
                    'qr_conversion',
                    'Nouveau rendez-vous via QR',
                    'Un patient a pris rendez-vous en scannant votre QR code.',
                    ['appointment_id' => $appointmentId, 'qr_code_id' => $qrCodeId]
                );
            } catch (Throwable $e) {
                error_log('qr_conversion notification: ' . $e->getMessage());
            }
        }
    }

    /** @return array<string, mixed>|null */
    public function findByToken(string $token): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM qr_codes WHERE token = ? LIMIT 1');
        $stmt->execute([trim($token)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function resolveAttributionQrId(?string $utmQr): ?string
    {
        if ($utmQr === null || trim($utmQr) === '') {
            return null;
        }
        $row = $this->findByToken($utmQr);
        if (!$row) {
            return null;
        }

        return (string) $row['id'];
    }

    public function updateMarketingTagline(string $profileId, ?string $tagline): array
    {
        $qr = $this->ensureForProfile($profileId);
        $clean = $tagline !== null ? trim($tagline) : null;
        if ($clean !== null && $clean !== '') {
            $clean = mb_substr($clean, 0, 120);
        } else {
            $clean = null;
        }
        $upd = $this->db->prepare('UPDATE qr_codes SET marketing_tagline = ?, updated_at = NOW() WHERE id = ?');
        $upd->execute([$clean, $qr['id']]);
        $profile = $this->fetchProfileRow($profileId);
        $qr['marketing_tagline'] = $clean;

        return $this->enrichQrRow($qr, $profile ?? []);
    }

    /** @return array<string, mixed> */
    public function getAnalyticsSummary(string $qrCodeId): array
    {
        return [
            'days_7' => $this->countFunnel($qrCodeId, 7),
            'days_30' => $this->countFunnel($qrCodeId, 30),
            'all_time' => $this->countFunnel($qrCodeId, null),
        ];
    }

    /** @return array{scans:int,visits:int,conversions:int,conversion_rate:float} */
    private function countFunnel(string $qrCodeId, ?int $days): array
    {
        $since = $days !== null ? date('Y-m-d H:i:s', strtotime("-{$days} days")) : null;
        $scans = $this->countSince('qr_scans', 'scanned_at', $qrCodeId, $since);
        $visits = $this->countSince('qr_visits', 'visited_at', $qrCodeId, $since);
        $conversions = $this->countSince('qr_conversions', 'converted_at', $qrCodeId, $since);
        $rate = $scans > 0 ? round(($conversions / $scans) * 100, 1) : 0.0;

        return [
            'scans' => $scans,
            'visits' => $visits,
            'conversions' => $conversions,
            'conversion_rate' => $rate,
        ];
    }

    private function countSince(string $table, string $dateCol, string $qrCodeId, ?string $since): int
    {
        $sql = "SELECT COUNT(*) FROM {$table} WHERE qr_code_id = ?";
        $params = [$qrCodeId];
        if ($since !== null) {
            $sql .= " AND {$dateCol} >= ?";
            $params[] = $since;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /** @return array{items:array<int,array<string,mixed>>,total:int} */
    public function adminList(?string $roleFilter, ?string $search, int $limit = 50, int $offset = 0): array
    {
        $where = ['1=1'];
        $params = [];
        if ($roleFilter !== null && $roleFilter !== '') {
            $where[] = 'q.user_role = ?';
            $params[] = $roleFilter;
        }
        $sql = '
            SELECT q.*, p.role AS profile_role
            FROM qr_codes q
            INNER JOIN profiles p ON p.id = q.profile_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY q.updated_at DESC
            LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset;
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $items = [];
        foreach ($rows as $row) {
            $profile = $this->fetchProfileRow((string) $row['profile_id']);
            $enriched = $this->enrichQrRow($row, $profile ?? []);
            $stats = $this->getAnalyticsSummary((string) $row['id']);
            $items[] = array_merge($enriched, [
                'analytics' => $stats['all_time'],
            ]);
        }
        if ($search !== null && trim($search) !== '') {
            $needle = mb_strtolower(trim($search));
            $items = array_values(array_filter($items, static function ($it) use ($needle) {
                $name = mb_strtolower((string) ($it['display_name'] ?? ''));

                return strpos($name, $needle) !== false || strpos((string) ($it['token'] ?? ''), $needle) !== false;
            }));
        }
        $countStmt = $this->db->query('SELECT COUNT(*) FROM qr_codes');
        $total = (int) $countStmt->fetchColumn();

        return ['items' => $items, 'total' => $total];
    }

    public function renderPngForProfile(string $profileId, string $format = 'a4', bool $raw = false): string
    {
        $qr = $this->ensureForProfile($profileId);
        if ($raw) {
            return $this->poster->renderRawQrPng((string) $qr['scan_url'], 512);
        }
        $profile = $this->getProfileDisplayData($profileId);

        return $this->poster->renderBrandedPoster($qr, $profile, $format);
    }

    public function buildRedirectUrl(string $profileId, string $role): string
    {
        $providerType = $role === 'subaccount' ? 'lab' : $role;
        $params = http_build_query([
            'provider_id' => $profileId,
            'provider_type' => $providerType,
        ]);

        return $this->siteUrl . '/rendez-vous/nouveau?' . $params;
    }

    /** @return array<string, mixed> */
    public function getProfileDisplayData(string $profileId): array
    {
        $profile = $this->fetchProfileRow($profileId);
        if ($profile === null) {
            return ['display_name' => 'Professionnel Cary', 'profile_image_url' => null];
        }
        $display = $this->buildDisplayName($profile);

        return [
            'display_name' => $display,
            'profile_image_url' => $profile['profile_image_url'] ?? null,
            'role' => $profile['role'] ?? null,
        ];
    }

    /** @param array<string, mixed> $qr */
    /** @param array<string, mixed> $profile */
    private function enrichQrRow(array $qr, array $profile): array
    {
        $display = $this->buildDisplayName($profile);
        $role = (string) ($qr['user_role'] ?? $profile['role'] ?? 'nurse');
        $custom = trim((string) ($qr['marketing_tagline'] ?? ''));
        $effectiveTagline = $custom !== '' ? $custom : $this->defaultTagline($role, $display);
        $token = (string) ($qr['token'] ?? '');

        return array_merge($qr, [
            'display_name' => $display,
            'profile_image_url' => $profile['profile_image_url'] ?? null,
            'scan_url' => $this->siteUrl . '/qr/' . rawurlencode($token),
            'short_url' => 'cary.bio/qr/' . $token,
            'effective_tagline' => $effectiveTagline,
        ]);
    }

    /** @param array<string, mixed> $profile */
    private function buildDisplayName(array $profile): string
    {
        $role = (string) ($profile['role'] ?? '');
        if (in_array($role, ['lab', 'subaccount'], true)) {
            $company = $this->decryptField($profile, 'company_name');
            if ($company !== '') {
                return $company;
            }
        }
        $first = $this->decryptField($profile, 'first_name');
        $last = $this->decryptField($profile, 'last_name');
        $name = trim($first . ' ' . $last);

        return $name !== '' ? $name : 'Professionnel Cary';
    }

    /** @param array<string, mixed> $profile */
    private function decryptField(array $profile, string $field): string
    {
        $enc = $profile[$field . '_encrypted'] ?? null;
        $dek = $profile[$field . '_dek'] ?? null;
        if (!empty($enc) && !empty($dek)) {
            try {
                return trim((string) $this->crypto->decryptField($enc, $dek));
            } catch (Throwable $e) {
                return '';
            }
        }
        if (!empty($profile[$field])) {
            return trim((string) $profile[$field]);
        }

        return '';
    }

    private function defaultTagline(string $role, string $displayName): string
    {
        switch ($role) {
            case 'lab':
            case 'subaccount':
                return "Votre prélèvement à domicile, en toute simplicité. Scannez pour réserver chez {$displayName}.";
            case 'pro':
                return "Votre suivi de santé, plus simple. Scannez pour prendre rendez-vous avec {$displayName}.";
            case 'nurse':
            default:
                return "Besoin de soins à domicile ? Scannez et réservez avec {$displayName} en quelques clics.";
        }
    }

    /** @return array<string, mixed>|null */
    private function fetchProfileRow(string $profileId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$profileId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** @param array{user_agent?:string,referrer?:string,ip?:string} $meta */
    private function recordScan(string $qrCodeId, array $meta): string
    {
        $ip = (string) ($meta['ip'] ?? ($_SERVER['REMOTE_ADDR'] ?? ''));
        $ipHash = $ip !== '' ? hash('sha256', $ip . '|qr_scan') : null;
        if ($ipHash !== null) {
            $dup = $this->db->prepare('
                SELECT id FROM qr_scans
                WHERE qr_code_id = ? AND ip_hash = ? AND scanned_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                ORDER BY scanned_at DESC LIMIT 1
            ');
            $dup->execute([$qrCodeId, $ipHash]);
            $existing = $dup->fetchColumn();
            if ($existing) {
                return (string) $existing;
            }
        }
        $id = $this->generateUuid();
        $ins = $this->db->prepare('
            INSERT INTO qr_scans (id, qr_code_id, scanned_at, user_agent, ip_hash, referrer)
            VALUES (?, ?, NOW(), ?, ?, ?)
        ');
        $ins->execute([
            $id,
            $qrCodeId,
            mb_substr((string) ($meta['user_agent'] ?? ''), 0, 512),
            $ipHash,
            mb_substr((string) ($meta['referrer'] ?? ''), 0, 512),
        ]);

        return $id;
    }

    private function generateUniqueToken(): string
    {
        for ($i = 0; $i < 20; $i++) {
            $token = $this->randomToken();
            $stmt = $this->db->prepare('SELECT id FROM qr_codes WHERE token = ? LIMIT 1');
            $stmt->execute([$token]);
            if (!$stmt->fetchColumn()) {
                return $token;
            }
        }
        throw new RuntimeException('Impossible de générer un token QR unique');
    }

    private function randomToken(): string
    {
        return substr(strtolower(bin2hex(random_bytes(8))), 0, 10);
    }

    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
