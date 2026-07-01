<?php

declare(strict_types=1);

/**
 * Détecte si un fichier joint relève du domaine médical Cary ou non.
 */
final class AiDocumentIntent
{
    /** @var list<string> */
    private const MEDICAL_DOCUMENT_TYPES = [
        'ordonnance',
        'resultats',
        'carte_vitale',
        'carte_mutuelle',
        'autres_assurances',
        'prescription',
        'care_photo',
    ];

    /**
     * @param array<string, mixed> $doc row medical_documents
     * @return array{category: string, kind: string, label_fr: string}
     */
    public static function classify(array $doc, string $ocrExcerpt = ''): array
    {
        $documentType = strtolower(trim((string) ($doc['document_type'] ?? 'other')));
        $fileName = (string) ($doc['file_name'] ?? '');
        $mime = strtolower((string) ($doc['mime_type'] ?? ''));
        $haystack = strtolower($fileName . ' ' . mb_substr($ocrExcerpt, 0, 4000));

        if (in_array($documentType, self::MEDICAL_DOCUMENT_TYPES, true)) {
            return [
                'category' => 'medical',
                'kind' => $documentType,
                'label_fr' => self::labelForKind($documentType),
            ];
        }

        if (self::containsMedicalSignal($haystack)) {
            return [
                'category' => 'medical',
                'kind' => self::inferKindFromText($haystack),
                'label_fr' => 'Document médical',
            ];
        }

        if (self::containsNonMedicalSignal($haystack, $fileName)) {
            return [
                'category' => 'non_medical',
                'kind' => 'other',
                'label_fr' => 'Document non médical',
            ];
        }

        if (str_starts_with($mime, 'image/') || str_contains($mime, 'pdf')) {
            return [
                'category' => 'unclear',
                'kind' => 'unknown',
                'label_fr' => 'Document à identifier',
            ];
        }

        return [
            'category' => 'non_medical',
            'kind' => 'other',
            'label_fr' => 'Document non médical',
        ];
    }

    private static function labelForKind(string $kind): string
    {
        return match ($kind) {
            'ordonnance', 'prescription' => 'Ordonnance',
            'resultats' => 'Résultats d\'analyse',
            'carte_vitale' => 'Carte Vitale',
            'carte_mutuelle' => 'Carte mutuelle',
            'autres_assurances' => 'Document assurance',
            'care_photo' => 'Photo médicale',
            default => 'Document médical',
        };
    }

    private static function inferKindFromText(string $haystack): string
    {
        if (preg_match('/carte\s*vitale|s[ée]curit[ée]\s*sociale|nir\b/i', $haystack)) {
            return 'carte_vitale';
        }
        if (preg_match('/mutuelle|compl[ée]mentaire|amc\b/i', $haystack)) {
            return 'carte_mutuelle';
        }
        if (preg_match('/ordonnance|prescription|prescri/i', $haystack)) {
            return 'ordonnance';
        }
        if (preg_match('/analyse|bilan|labo|h[ée]mogram|glyc[ée]mie|cholest[ée]rol|crp|nfs\b|ionogram/i', $haystack)) {
            return 'resultats';
        }

        return 'medical_other';
    }

    private static function containsMedicalSignal(string $haystack): bool
    {
        if ($haystack === '') {
            return false;
        }

        return (bool) preg_match(
            '/ordonnance|prescription|analyse|bilan|labo|resultat|r[ée]sultat|h[ée]mogram|glyc[ée]mie|cholest[ée]rol|'
            . 'crp|nfs\b|ionogram|mutuelle|carte\s*vitale|s[ée]curit[ée]\s*sociale|patient|m[ée]decin|dr\.|'
            . 'mg\/|mmol|g\/l|ui\/|biolog/i',
            $haystack,
        );
    }

    private static function containsNonMedicalSignal(string $haystack, string $fileName): bool
    {
        $name = strtolower($fileName);
        if (preg_match('/facture|invoice|devis|quote|contrat|assurance\s*auto|ticket|recu|reçu|menu|cv\.|curriculum/i', $name . ' ' . $haystack)) {
            return true;
        }
        if ($haystack !== '' && !self::containsMedicalSignal($haystack)) {
            if (preg_match('/facture|total\s*ttc|tva\b|siret|iban\s+pour|devis/i', $haystack)) {
                return true;
            }
        }

        return false;
    }
}
