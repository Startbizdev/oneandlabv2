<?php

declare(strict_types=1);

/**
 * Un tour d'assistant ne mélange pas deux dossiers : brouillon et document doivent être ceux du patient de la conversation.
 */
final class AiConversationScope
{
    /**
     * @param array<string, mixed>|null $draft
     */
    public static function draftMatchesPatient(?array $draft, ?string $conversationPatientId, ?string $conversationId = null): bool
    {
        if ($draft === null) {
            return false;
        }
        $draftConversation = trim((string) ($draft['conversation_id'] ?? ''));
        $conversationId = trim((string) $conversationId);
        if ($conversationId !== '' && $draftConversation !== '' && $draftConversation !== $conversationId) {
            return false;
        }
        $draftPatient = trim((string) ($draft['patient_id'] ?? ''));
        if ($draftPatient === '' && is_array($draft['payload'] ?? null)) {
            $draftPatient = trim((string) ($draft['payload']['patient_id'] ?? ''));
        }
        $conversationPatientId = trim((string) $conversationPatientId);
        if ($conversationPatientId === '') {
            return $draftPatient === '';
        }

        return $draftPatient === '' || $draftPatient === $conversationPatientId;
    }

    public static function documentMatchesPatient(?string $conversationPatientId, ?string $documentPatientId): bool
    {
        $conversationPatientId = trim((string) $conversationPatientId);
        $documentPatientId = trim((string) $documentPatientId);
        if ($conversationPatientId === '') {
            return $documentPatientId === '';
        }
        return $documentPatientId !== '' && $documentPatientId === $conversationPatientId;
    }
}
