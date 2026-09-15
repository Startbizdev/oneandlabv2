<?php

final class SubscriptionManagement
{
    /** Active access first, then a subscription needing action, then historical records. */
    public static function find(PDO $db, string $userId, bool $stripeOnly = false): ?array
    {
        $source = $stripeOnly ? " AND COALESCE(NULLIF(billing_source, ''), 'stripe') = 'stripe' AND stripe_customer_id IS NOT NULL AND stripe_customer_id != ''" : '';
        $statement = $db->prepare("SELECT * FROM subscriptions WHERE user_id = ?{$source}
            ORDER BY CASE
                WHEN status IN ('active', 'trialing') THEN 0
                WHEN status IN ('past_due', 'unpaid', 'incomplete', 'paused') THEN 1
                ELSE 2 END,
                updated_at DESC, id DESC LIMIT 1");
        $statement->execute([$userId]);
        return $statement->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}
