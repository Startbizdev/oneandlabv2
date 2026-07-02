<?php

declare(strict_types=1);

/**
 * Routage léger : brouillon actif / documents. Le reste → Grok + tools.
 */
final class CaryContextFocus
{
    public const DOCUMENT = 'document_attachment_chat';
    public const DOCUMENT_FOLLOWUP = 'document_followup';
    public const BOOKING = 'booking';
    public const HEALTH_RECORD = 'health_record';
    public const GENERAL = 'general';

    /**
     * @param array<string, mixed>|null $draft
     */
    public static function resolve(
        string $message,
        bool $hasAttachments,
        ?array $draft = null,
        bool $conversationHasDocuments = false,
    ): string {
        if ($hasAttachments) {
            return self::DOCUMENT;
        }

        $msg = mb_strtolower(trim($message));

        if ($conversationHasDocuments && self::matchesDocumentFollowUp($msg)) {
            return self::DOCUMENT_FOLLOWUP;
        }

        if ($draft !== null && in_array($draft['status'] ?? '', ['collecting', 'ready'], true)) {
            return self::BOOKING;
        }

        return self::GENERAL;
    }

    public static function matchesDocumentFollowUp(string $msg): bool
    {
        if (preg_match(
            '/mon (bilan|analyse|pdf|r[ée]sultat|document|fichier)|'
            . 'ce (bilan|pdf|document|fichier|r[ée]sultat)|'
            . 'dans (mon|le|ce) (bilan|pdf|analyse|document)|'
            . 'le document (que |d[\'’]?)?(j[\'’]?ai |on )?(a )?(envoy|joint|partag)/iu',
            $msg,
        )) {
            return true;
        }

        if (preg_match(
            '/\b(alat|asat|gpt|got|ggt|cr[ée]atinine|ferritine|glyc[ée]mie|cholest[ée]rol|'
            . 'nfs|h[ée]mogram|tsh|crp|plaquet|leucocyt|h[ée]moglob|ionogram|triglyc|ldl|hdl)\b/iu',
            $msg,
        )) {
            return true;
        }

        if (preg_match('/explique|pr[ée]cise|d[ée]tail|signifie|interpr[ée]t|concernant|pourquoi|c.?est quoi|qu.?est.ce/iu', $msg)
            && preg_match('/bilan|analyse|r[ée]sultat|param[èe]tre|valeur|norme|labo|alat|asat|document|pdf/iu', $msg)) {
            return true;
        }

        return false;
    }

    /** L'utilisateur demande explicitement d'analyser un fichier sans en avoir joint un. */
    public static function matchesExplicitDocumentAnalysisRequest(string $msg): bool
    {
        return (bool) preg_match(
            '/analyse(r)?\s+(ce|mon|le|un)\s+(pdf|document|fichier|bilan|photo|image)|'
            . 'lis\s+(ce|mon|le)\s+(pdf|document)|'
            . 'que pense(s|-)?tu\s+(de|du)\s+(ce|mon)\s+(pdf|document|bilan)|'
            . 'interpr[èe]te\s+(ce|mon|le)\s+(pdf|document|bilan)/iu',
            $msg,
        );
    }

    /**
     * @return list<string>
     */
    public static function suppressedContextKeys(string $focus): array
    {
        return match ($focus) {
            self::DOCUMENT, self::DOCUMENT_FOLLOWUP => [
                'health_record_summary',
            ],
            self::BOOKING => [
                'health_record_summary',
            ],
            default => [],
        };
    }

    /**
     * @return list<string>
     */
    public static function suppressedNavigationKeys(string $focus): array
    {
        return match ($focus) {
            self::DOCUMENT, self::DOCUMENT_FOLLOWUP => ['health_record', 'health_sync_ios', 'health_sync_android'],
            self::BOOKING => ['health_record', 'health_sync_ios', 'health_sync_android'],
            default => [],
        };
    }

    public static function labelFr(string $focus): string
    {
        return match ($focus) {
            self::DOCUMENT => 'document médical joint',
            self::DOCUMENT_FOLLOWUP => 'question sur un document déjà analysé',
            self::BOOKING => 'prise de rendez-vous',
            self::HEALTH_RECORD => 'carnet de santé',
            default => 'question générale',
        };
    }
}
