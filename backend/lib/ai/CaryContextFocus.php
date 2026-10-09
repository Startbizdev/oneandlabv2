<?php

declare(strict_types=1);

/**
 * Routage léger : brouillon actif / documents / carnet / booking explicite.
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

        if ($draft !== null && in_array($draft['status'] ?? '', ['collecting', 'ready'], true)) {
            return self::BOOKING;
        }

        if (self::matchesHealthRecord($msg)) {
            return self::HEALTH_RECORD;
        }

        if ($conversationHasDocuments && self::matchesDocumentFollowUp($msg)) {
            return self::DOCUMENT_FOLLOWUP;
        }

        if (self::matchesBookingRequest($msg)) {
            return self::BOOKING;
        }

        return self::GENERAL;
    }

    public static function matchesHealthRecord(string $msg): bool
    {
        return (bool) preg_match(
            '/\b(?:carnet de sant[ée]|compl[ée]ter mon carnet|mon carnet|questionnaire carnet|'
            . 'apple sant[ée]|health connect|mes donn[ée]es sant[ée]|%.*carnet|pourcentage carnet)\b/iu',
            $msg,
        );
    }

    public static function matchesBookingRequest(string $msg): bool
    {
        if ($msg === '' || preg_match('/^(?:oui|ok|d\'accord|merci)\.?$/iu', $msg)) {
            return false;
        }

        if (preg_match('/\b(?:quand|prochain|dernier|r[ée]sum[ée])\b/iu', $msg)
            && !preg_match('/\b(?:je veux|je voudrais|jveux|planifier|prendre (?:un )?rdv|besoin d[\x27’]?un)\b/iu', $msg)) {
            return false;
        }

        return (bool) preg_match(
            '/\b(?:rdv|rendez[- ]vous|prendre (?:un )?rdv|planifier|pansement|prise de sang|'
            . 'infirmier|passage|soin|injection|perfusion|pr[ée]l[èe]vement)\b/iu',
            $msg,
        );
    }

    public static function matchesDocumentFollowUp(string $msg): bool
    {
        if (self::matchesBookingRequest($msg) || self::matchesHealthRecord($msg)) {
            return false;
        }

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

    /** Clés utiles à tout tour (cadre temporel, mode, mémoire de conversation). */
    private const BASE_CONTEXT_KEYS = [
        'role', 'conversation_type', 'generated_at', 'today_paris', 'today_label_fr', 'tomorrow_paris', 'tomorrow_label_fr',
        'disclaimer', 'active_intent', 'active_intent_label_fr', 'conversation_mode', 'document_context_mode',
        'conversation_memory', 'user_memory', 'app_navigation', 'profile', 'patient',
    ];

    /** Données du dossier transmises au modèle selon le sujet du tour : le strict nécessaire. */
    private const FOCUS_CONTEXT_KEYS = [
        self::BOOKING => [
            'active_booking_draft', 'relatives', 'care_categories', 'profile_documents', 'staff_patients',
            'accessible_patients_count', 'appointments',
        ],
        self::DOCUMENT => ['chat_attachments', 'rag_chunks', 'citation_refs', 'lab_results', 'documents', 'active_booking_draft'],
        self::DOCUMENT_FOLLOWUP => ['chat_attachments', 'rag_chunks', 'citation_refs', 'lab_results', 'documents', 'active_booking_draft'],
        self::HEALTH_RECORD => ['health_record_summary', 'health_metrics', 'health_trends'],
        self::GENERAL => [
            'appointments', 'lab_results', 'documents', 'pending_documents', 'rag_chunks', 'citation_refs',
            'medical_memory', 'health_trends', 'health_metrics', 'relatives', 'staff_patients', 'accessible_patients_count',
            'active_booking_draft',
        ],
    ];

    private const HEALTH_RECORD_NAVIGATION_KEYS = ['health_record', 'health_sync_ios', 'health_sync_android'];

    /**
     * Réduit le contexte envoyé au modèle à ce que le sujet exige ; hors prise de RDV, l'identité se limite
     * au prénom (pas d'adresse ni de date de naissance).
     *
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public static function minimizeContext(array $context, string $focus): array
    {
        $allowed = array_flip([...self::BASE_CONTEXT_KEYS, ...(self::FOCUS_CONTEXT_KEYS[$focus] ?? self::FOCUS_CONTEXT_KEYS[self::GENERAL])]);
        $minimal = array_intersect_key($context, $allowed);

        if ($focus !== self::BOOKING) {
            foreach (['profile', 'patient'] as $identityKey) {
                if (is_array($minimal[$identityKey] ?? null)) {
                    $minimal[$identityKey] = array_intersect_key(
                        $minimal[$identityKey],
                        array_flip($identityKey === 'patient' ? ['id', 'first_name', 'last_name'] : ['first_name']),
                    );
                }
            }
        }
        if (in_array($focus, [self::BOOKING, self::DOCUMENT, self::DOCUMENT_FOLLOWUP], true) && is_array($minimal['app_navigation'] ?? null)) {
            $minimal['app_navigation'] = array_diff_key($minimal['app_navigation'], array_flip(self::HEALTH_RECORD_NAVIGATION_KEYS));
        }

        return $minimal;
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
