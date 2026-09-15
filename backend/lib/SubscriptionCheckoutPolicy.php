<?php

declare(strict_types=1);

final class SubscriptionCheckoutPolicy
{
    /** Resolve legacy price_id requests through the same role allowlist as plan_slug. */
    public static function plan(string $role, string $slug, string $priceId, array $prices): array
    {
        $allowed = $role === 'nurse' ? ['nurse_pro'] : ($role === 'lab' ? ['lab_starter', 'lab_pro'] : []);
        if ($slug === '' && $priceId !== '') {
            foreach ($allowed as $candidate) {
                if (($prices[$candidate] ?? '') === $priceId) {
                    $slug = $candidate;
                    break;
                }
            }
        }
        if (!in_array($slug, $allowed, true)) {
            throw new InvalidArgumentException('Offre non autorisée pour ce compte.');
        }
        $configuredPrice = (string) ($prices[$slug] ?? '');
        if ($configuredPrice === '' || ($priceId !== '' && $priceId !== $configuredPrice)) {
            throw new InvalidArgumentException('Tarif indisponible pour cette offre.');
        }
        return ['slug' => $slug, 'price_id' => $configuredPrice];
    }

    public static function hasCurrentSubscription(array $history): bool
    {
        foreach ($history as $subscription) {
            if (in_array($subscription['status'] ?? '', ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'], true)) {
                return true;
            }
        }
        return false;
    }

    public static function trialDays(array $history): int
    {
        foreach ($history as $subscription) {
            if (!empty($subscription['trial_ends_at']) || in_array($subscription['status'] ?? '', ['active', 'trialing', 'past_due', 'unpaid', 'canceled', 'paused'], true)) {
                return 0;
            }
        }
        return 30;
    }
}
