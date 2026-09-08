<?php

/**
 * Statut d'affichage abonnement (essai effectif, resync store).
 */
class SubscriptionDisplay
{
    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function enrich(array $row, ?int $now = null): array
    {
        $now = $now ?? time();
        $status = (string) ($row['status'] ?? '');
        $billingSource = (string) ($row['billing_source'] ?? 'stripe');
        $trialEndsAt = $row['trial_ends_at'] ?? null;
        $periodEnd = $row['current_period_end'] ?? null;
        $trialTs = is_string($trialEndsAt) && $trialEndsAt !== '' ? strtotime($trialEndsAt) : null;
        $periodTs = is_string($periodEnd) && $periodEnd !== '' ? strtotime($periodEnd) : null;

        $isTrialing = $status === 'trialing'
            || (
                $trialTs !== null
                && $trialTs > $now
                && in_array($status, ['active', 'trialing'], true)
            );

        $effectiveStatus = $isTrialing ? 'trialing' : $status;

        $needsResync = in_array($billingSource, ['apple', 'google'], true)
            && in_array($status, ['active', 'trialing'], true)
            && $periodTs !== null
            && $periodTs < $now;

        return array_merge($row, [
            'billing_source' => $billingSource !== '' ? $billingSource : 'stripe',
            'effective_status' => $effectiveStatus,
            'is_trialing' => $isTrialing,
            'needs_resync' => $needsResync,
        ]);
    }
}
