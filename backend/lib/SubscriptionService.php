<?php

require_once __DIR__ . '/../config/iap.php';

class SubscriptionService
{
    /** @var PDO */
    private $pdo;

    /** @var array */
    private $iapConfig;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->iapConfig = require __DIR__ . '/../config/iap.php';
    }

    /**
     * Plan infirmier actif : discovery (défaut) ou nurse_pro.
     */
    public function getActiveNursePlan(string $userId): string
    {
        $stmt = $this->pdo->prepare(
            'SELECT plan_slug FROM subscriptions
             WHERE user_id = ? AND status IN (\'active\', \'trialing\')
             ORDER BY updated_at DESC LIMIT 1'
        );
        $stmt->execute([$userId]);
        $sub = $stmt->fetch(PDO::FETCH_ASSOC);

        return $sub ? ($sub['plan_slug'] ?? 'discovery') : 'discovery';
    }

    /**
     * Abonnement le plus récent (tous statuts) pour affichage mobile.
     */
    public function getLatestSubscription(string $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, billing_source, stripe_customer_id, stripe_subscription_id,
                    price_id, store_product_id, store_original_transaction_id,
                    plan_slug, status, trial_ends_at, current_period_end, created_at, updated_at
             FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function hasActivePro(string $userId): bool
    {
        return $this->getActiveNursePlan($userId) === 'nurse_pro';
    }

    public function hasActiveStripePro(string $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM subscriptions
             WHERE user_id = ? AND billing_source = \'stripe\'
               AND plan_slug = \'nurse_pro\' AND status IN (\'active\', \'trialing\')
             LIMIT 1'
        );
        $stmt->execute([$userId]);

        return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function hasActiveStorePro(string $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM subscriptions
             WHERE user_id = ? AND billing_source IN (\'apple\', \'google\')
               AND plan_slug = \'nurse_pro\' AND status IN (\'active\', \'trialing\')
             LIMIT 1'
        );
        $stmt->execute([$userId]);

        return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Refuse un achat store si Pro Stripe actif.
     *
     * @return array{allowed: bool, error?: string}
     */
    public function canPurchaseStorePro(string $userId): array
    {
        if ($this->hasActiveStripePro($userId)) {
            return [
                'allowed' => false,
                'error' => 'Vous avez déjà Cary Pro via le site web (Stripe). Gérez votre abonnement sur cary.bio.',
            ];
        }

        return ['allowed' => true];
    }

    /**
     * Crée ou met à jour un abonnement Apple / Google.
     */
    public function upsertStoreSubscription(
        string $userId,
        string $billingSource,
        string $productId,
        string $originalTransactionId,
        string $status,
        ?string $trialEndsAt,
        ?string $currentPeriodEnd
    ): array {
        if (!in_array($billingSource, ['apple', 'google'], true)) {
            throw new InvalidArgumentException('billing_source invalide');
        }

        $planSlug = $this->iapConfig['plan_slug'] ?? 'nurse_pro';

        $stmt = $this->pdo->prepare(
            'SELECT id, user_id FROM subscriptions WHERE store_original_transaction_id = ? LIMIT 1'
        );
        $stmt->execute([$originalTransactionId]);
        $existingByTx = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existingByTx && $existingByTx['user_id'] !== $userId) {
            throw new RuntimeException('Cet achat est déjà associé à un autre compte Cary.');
        }

        $stmt = $this->pdo->prepare(
            'SELECT id FROM subscriptions WHERE user_id = ? AND billing_source = ? LIMIT 1'
        );
        $stmt->execute([$userId, $billingSource]);
        $existingByUser = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existingByTx) {
            $stmt = $this->pdo->prepare(
                'UPDATE subscriptions SET user_id = ?, billing_source = ?, store_product_id = ?,
                    store_original_transaction_id = ?, plan_slug = ?, status = ?,
                    trial_ends_at = ?, current_period_end = ?, updated_at = NOW()
                 WHERE id = ?'
            );
            $stmt->execute([
                $userId,
                $billingSource,
                $productId,
                $originalTransactionId,
                $planSlug,
                $status,
                $trialEndsAt,
                $currentPeriodEnd,
                $existingByTx['id'],
            ]);

            return $this->getSubscriptionById($existingByTx['id']);
        }

        if ($existingByUser) {
            $stmt = $this->pdo->prepare(
                'UPDATE subscriptions SET store_product_id = ?, store_original_transaction_id = ?,
                    plan_slug = ?, status = ?, trial_ends_at = ?, current_period_end = ?,
                    updated_at = NOW() WHERE id = ?'
            );
            $stmt->execute([
                $productId,
                $originalTransactionId,
                $planSlug,
                $status,
                $trialEndsAt,
                $currentPeriodEnd,
                $existingByUser['id'],
            ]);

            return $this->getSubscriptionById($existingByUser['id']);
        }

        $id = self::uuid();
        $stmt = $this->pdo->prepare(
            'INSERT INTO subscriptions (
                id, user_id, billing_source, store_product_id, store_original_transaction_id,
                plan_slug, status, trial_ends_at, current_period_end, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
        );
        $stmt->execute([
            $id,
            $userId,
            $billingSource,
            $productId,
            $originalTransactionId,
            $planSlug,
            $status,
            $trialEndsAt,
            $currentPeriodEnd,
        ]);

        try {
            require_once __DIR__ . '/AdminEmailNotifier.php';
            require_once __DIR__ . '/../models/User.php';
            $userModel = new User();
            $profile = $userModel->getById($userId, 'system', 'system');
            $userEmail = is_array($profile) ? ($profile['email'] ?? null) : null;
            AdminEmailNotifier::storeSubscriptionActivated($userId, $billingSource, $planSlug, $status, $userEmail);
        } catch (Throwable $e) {
            error_log('upsertStoreSubscription admin email: ' . $e->getMessage());
        }

        return $this->getSubscriptionById($id);
    }

    public function updateStoreSubscriptionStatus(string $originalTransactionId, string $status): void
    {
        $stmt = $this->pdo->prepare(
            'SELECT user_id, plan_slug, billing_source FROM subscriptions WHERE store_original_transaction_id = ? LIMIT 1'
        );
        $stmt->execute([$originalTransactionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->pdo->prepare(
            'UPDATE subscriptions SET status = ?, updated_at = NOW()
             WHERE store_original_transaction_id = ?'
        );
        $stmt->execute([$status, $originalTransactionId]);

        if (!$row || !in_array($status, ['canceled', 'expired', 'revoked'], true)) {
            return;
        }

        try {
            require_once __DIR__ . '/AdminEmailNotifier.php';
            require_once __DIR__ . '/../models/User.php';
            $userModel = new User();
            $profile = $userModel->getById((string) $row['user_id'], 'system', 'system');
            $userEmail = is_array($profile) ? ($profile['email'] ?? null) : null;
            AdminEmailNotifier::storeSubscriptionEnded(
                (string) $row['user_id'],
                (string) ($row['billing_source'] ?? ''),
                $row['plan_slug'] ?? null,
                $userEmail
            );
        } catch (Throwable $e) {
            error_log('updateStoreSubscriptionStatus admin email: ' . $e->getMessage());
        }
    }

    private function getSubscriptionById(string $id): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM subscriptions WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('Abonnement introuvable après upsert');
        }

        return $row;
    }

    public function formatMobileSubscription(?array $row, string $fallbackPlan = 'discovery'): array
    {
        if (!$row) {
            return [
                'plan_slug' => $fallbackPlan,
                'status' => null,
                'billing_source' => null,
                'current_period_end' => null,
                'trial_ends_at' => null,
                'manage_hint' => null,
            ];
        }

        $source = $row['billing_source'] ?? 'stripe';
        $manageHint = null;
        if ($source === 'apple') {
            $manageHint = 'ios_settings';
        } elseif ($source === 'google') {
            $manageHint = 'play_store';
        } elseif ($source === 'stripe') {
            $manageHint = 'web_stripe';
        }

        $activePlan = in_array($row['status'] ?? '', ['active', 'trialing'], true)
            ? ($row['plan_slug'] ?? $fallbackPlan)
            : $fallbackPlan;

        return [
            'plan_slug' => $activePlan,
            'status' => $row['status'] ?? null,
            'billing_source' => $source,
            'store_product_id' => $row['store_product_id'] ?? null,
            'current_period_end' => $row['current_period_end'] ?? null,
            'trial_ends_at' => $row['trial_ends_at'] ?? null,
            'manage_hint' => $manageHint,
        ];
    }

    private static function uuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }
}
