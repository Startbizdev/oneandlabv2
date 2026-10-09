<?php

declare(strict_types=1);

require_once __DIR__ . '/CaryContextFocus.php';
require_once __DIR__ . '/AiBookingAccess.php';
require_once __DIR__ . '/AiQuickSuggestionsService.php';

/**
 * Relances proposées après une réponse Cary (2 à 3), selon le rôle, le sujet du tour et l'étape du brouillon RDV.
 */
final class AiSuggestionBuilder
{
    private const MAX = 3;

    public function __construct(private readonly AiQuickSuggestionsService $quickSuggestions)
    {
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $context contexte complet du tour (avant minimisation)
     * @param array<string, mixed>|null $draft
     * @return list<string>
     */
    public function build(array $user, string $focus, array $context, ?array $draft): array
    {
        $role = (string) ($user['role'] ?? '');
        $isPatient = $role === 'patient';

        if (is_array($draft) && in_array($draft['status'] ?? '', ['collecting', 'ready'], true) && AiBookingAccess::allows($user)) {
            return self::forDraft($draft, $isPatient);
        }

        $items = match ($focus) {
            CaryContextFocus::DOCUMENT, CaryContextFocus::DOCUMENT_FOLLOWUP => $isPatient
                ? ['Quelles valeurs sont hors normes ?', 'Explique-moi ce résultat simplement', 'Dois-je en parler à mon médecin ?']
                : ['Quelles valeurs sont hors normes ?', 'Résume ce document en trois points'],
            CaryContextFocus::HEALTH_RECORD => ['Que manque-t-il dans mon carnet ?', 'Comment connecter mes données santé ?'],
            CaryContextFocus::BOOKING => AiBookingAccess::allows($user)
                ? ($isPatient ? ['Une prise de sang', 'Un soin infirmier'] : ['Un patient existant', 'Un nouveau patient'])
                : ['Comment demander un prélèvement ?', 'Mes prochaines tournées'],
            default => array_map(
                static fn (array $item): string => $item['label'],
                $this->quickSuggestions->suggestionsFromContext($user, $context),
            ),
        };

        $fallback = $isPatient
            ? ['Prendre un rendez-vous', 'Question sur mon suivi']
            : (AiBookingAccess::allows($user)
                ? ['Planifier un rendez-vous patient', 'Question sur un dossier']
                : ['Comment demander un prélèvement ?', 'Question sur un dossier']);

        return array_slice(array_values(array_unique([...$items, ...$fallback])), 0, self::MAX);
    }

    /**
     * @param array<string, mixed> $draft
     * @return list<string>
     */
    private static function forDraft(array $draft, bool $isPatient): array
    {
        if (($draft['status'] ?? '') === 'ready') {
            return ['Modifier le créneau', 'Changer l\'adresse'];
        }
        $missing = is_array($draft['missing_fields'] ?? null) ? $draft['missing_fields'] : [];
        if (in_array('patient_id', $missing, true)) {
            return ['Un patient existant', 'Un nouveau patient'];
        }
        if (in_array('type', $missing, true) || in_array('category_id', $missing, true)) {
            return ['Une prise de sang', 'Un soin infirmier'];
        }
        if (in_array('address', $missing, true)) {
            return $isPatient
                ? ['À mon adresse habituelle', 'À une autre adresse']
                : ['Au domicile du patient', 'À mon cabinet'];
        }
        if (in_array('scheduled_at', $missing, true) || in_array('availability', $missing, true)) {
            return ['Demain matin', 'Toute la journée cette semaine', 'Le plus tôt possible'];
        }

        return ['Voir le récapitulatif', 'Modifier le créneau'];
    }
}
