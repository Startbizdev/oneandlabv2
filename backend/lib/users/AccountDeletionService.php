<?php

declare(strict_types=1);

require_once __DIR__ . '/ProfileReferences.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/../Logger.php';
require_once __DIR__ . '/../Email.php';
require_once __DIR__ . '/../MedicalDocumentsInternal.php';
require_once __DIR__ . '/../SubscriptionManagement.php';
require_once __DIR__ . '/../SubscriptionCheckoutPolicy.php';
require_once __DIR__ . '/../pharmacy/PharmacyOrderService.php';
require_once __DIR__ . '/../../models/User.php';

final class AccountDeletionDenied extends RuntimeException
{
    public function __construct(string $message, public readonly int $httpStatus, public readonly string $errorCode)
    {
        parent::__construct($message);
    }
}

/**
 * Suppression de compte (App Store 5.1.1(v)) :
 * - patient : suppression définitive immédiate de son propre compte ;
 * - autres rôles : demande transmise au support, traitée par un admin.
 */
final class AccountDeletionService
{
    public const CONFIRMATION_PHRASE = 'SUPPRIMER';
    public const REASON_MAX_LENGTH = 1000;

    /** FK ON DELETE RESTRICT vers profiles absentes de la suppression admin historique. */
    private const SELF_SERVICE_EXTRA_REFERENCES = [
        ['pharmacy_orders', 'patient_id'],
        ['pharmacy_orders', 'requester_id'],
        ['pharmacy_orders', 'pharmacy_id'],
    ];

    public function __construct(
        private PDO $db,
        private User $users,
        private Logger $logger,
        private Email $email,
        private string $supportEmail,
    ) {
    }

    /**
     * @return array{deleted_documents: int, deleted_reviews: int, files_not_deleted: int}
     */
    public function deleteOwnPatientAccount(string $userId, string $role, mixed $confirmation): array
    {
        if ($role !== 'patient') {
            throw new AccountDeletionDenied(
                'La suppression immédiate est réservée aux comptes patients. Envoyez une demande de suppression au support.',
                403,
                'NOT_PATIENT'
            );
        }
        if ($confirmation !== self::CONFIRMATION_PHRASE) {
            throw new AccountDeletionDenied(
                'Pour confirmer, saisissez exactement « ' . self::CONFIRMATION_PHRASE . ' ».',
                400,
                'CONFIRMATION_REQUIRED'
            );
        }
        if ($this->db->inTransaction()) {
            throw new LogicException('La suppression de compte doit posséder sa transaction : les fichiers sont supprimés après le commit.');
        }

        $result = DatabaseTransaction::run($this->db, fn (): array => $this->deletePatientRows($userId));

        $filesNotDeleted = 0;
        foreach ($result['file_paths'] as $filePath) {
            if (!MedicalDocumentsInternal::deleteStoredFile($filePath)) {
                $filesNotDeleted++;
            }
        }
        if ($filesNotDeleted > 0) {
            error_log(sprintf('AccountDeletionService: %d fichier(s) du profil %s non supprimé(s) du disque', $filesNotDeleted, $userId));
        }

        return [
            'deleted_documents' => count($result['file_paths']),
            'deleted_reviews' => $result['deleted_reviews'],
            'files_not_deleted' => $filesNotDeleted,
        ];
    }

    public function requestProfessionalDeletion(string $userId, string $role, mixed $reason): void
    {
        if ($role === 'patient') {
            throw new AccountDeletionDenied(
                'Les comptes patients se suppriment directement depuis l’application.',
                403,
                'PATIENT_USE_SELF_SERVICE'
            );
        }
        if ($reason !== null && !is_string($reason)) {
            throw new AccountDeletionDenied('Le motif doit être un texte.', 400, 'VALIDATION_ERROR');
        }
        $reason = trim((string) $reason);
        if (mb_strlen($reason) > self::REASON_MAX_LENGTH) {
            throw new AccountDeletionDenied(
                'Le motif ne doit pas dépasser ' . self::REASON_MAX_LENGTH . ' caractères.',
                400,
                'VALIDATION_ERROR'
            );
        }

        $email = $this->users->getDecryptedEmail($userId);
        $name = $this->users->getDisplayNamesByIds([$userId])[$userId] ?? null;

        $inner = $this->email->staffDetailBox([
            'Identifiant' => $userId,
            'Rôle' => $role,
            'Nom' => $name,
            'Email' => $email,
        ]);
        $inner .= '<p style="margin:0 0 8px 0;"><strong>Motif :</strong></p>'
            . '<p style="margin:0 0 16px 0;white-space:pre-wrap;">'
            . ($reason !== '' ? nl2br(htmlspecialchars($reason, ENT_QUOTES, 'UTF-8')) : 'Non précisé')
            . '</p>';
        $body = $this->email->buildStaffAlertBody('Demande de suppression de compte', $inner);
        $subject = '[Cary] Demande de suppression de compte — ' . $role . ($name ? ' — ' . $name : '');

        if (!$this->email->send($this->supportEmail, $subject, $body, true, $email, $name)) {
            throw new AccountDeletionDenied(
                'L’envoi de la demande a échoué. Réessayez ou écrivez à ' . $this->supportEmail . '.',
                503,
                'EMAIL_SEND_FAILED'
            );
        }

        $this->logger->log($userId, $role, 'account_deletion_request', 'profile', $userId, [
            'reason_provided' => $reason !== '',
        ]);
    }

    /**
     * @return array{file_paths: list<string>, deleted_reviews: int}
     */
    private function deletePatientRows(string $userId): array
    {
        $stmt = $this->db->prepare('SELECT role FROM profiles WHERE id = ? FOR UPDATE');
        $stmt->execute([$userId]);
        $role = $stmt->fetchColumn();
        if ($role === false) {
            throw new AccountDeletionDenied('Compte introuvable.', 404, 'NOT_FOUND');
        }
        if ($role !== 'patient') {
            throw new AccountDeletionDenied('La suppression immédiate est réservée aux comptes patients.', 403, 'NOT_PATIENT');
        }

        $this->assertNothingActive($userId);
        $systemAccountId = $this->systemAccountId();

        $documents = $this->ownProfileDocuments($userId);

        $reviews = $this->db->prepare('DELETE FROM reviews WHERE patient_id = ?');
        $reviews->execute([$userId]);
        $deletedReviews = $reviews->rowCount();

        if ($documents !== []) {
            $ids = array_keys($documents);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $this->db->prepare("DELETE FROM medical_documents WHERE id IN ({$placeholders})")->execute($ids);
        }

        $failures = ProfileReferences::reassign(
            $this->db,
            $userId,
            $systemAccountId,
            [...ProfileReferences::RESTRICT_REFERENCES, ...self::SELF_SERVICE_EXTRA_REFERENCES]
        );
        if ($failures !== []) {
            throw new RuntimeException('Réattribution impossible avant suppression du profil : ' . implode(', ', array_keys($failures)));
        }

        $this->logger->log($userId, 'patient', 'delete', 'profile', $userId, [
            'scope' => 'self_service',
            'reassigned_to' => $systemAccountId,
            'deleted_reviews' => $deletedReviews,
            'deleted_documents' => count($documents),
        ]);

        $delete = $this->db->prepare('DELETE FROM profiles WHERE id = ?');
        $delete->execute([$userId]);
        if ($delete->rowCount() !== 1) {
            throw new RuntimeException('Profil non supprimé');
        }

        return ['file_paths' => array_values($documents), 'deleted_reviews' => $deletedReviews];
    }

    private function assertNothingActive(string $userId): void
    {
        if (ProfileReferences::countActiveAppointments($this->db, $userId) > 0) {
            throw new AccountDeletionDenied(
                'Vous avez un rendez-vous en attente, confirmé ou en cours (pour vous ou un proche). Annulez-le ou attendez qu’il soit terminé avant de supprimer votre compte.',
                409,
                'ACTIVE_APPOINTMENTS'
            );
        }

        $subscription = SubscriptionManagement::find($this->db, $userId);
        if ($subscription !== null && SubscriptionCheckoutPolicy::hasCurrentSubscription([$subscription])) {
            throw new AccountDeletionDenied(
                'Un abonnement est encore actif sur ce compte. Résiliez-le (réglages de l’App Store, Google Play ou site Cary) avant de supprimer votre compte.',
                409,
                'ACTIVE_SUBSCRIPTION'
            );
        }

        $terminal = PharmacyOrderService::TERMINAL_STATUSES;
        $placeholders = implode(',', array_fill(0, count($terminal), '?'));
        $orders = $this->db->prepare("SELECT COUNT(*) FROM pharmacy_orders WHERE patient_id = ? AND status NOT IN ({$placeholders})");
        $orders->execute([$userId, ...$terminal]);
        if ((int) $orders->fetchColumn() > 0) {
            throw new AccountDeletionDenied(
                'Une commande en pharmacie est en cours pour vous. Attendez qu’elle soit terminée ou annulée avant de supprimer votre compte.',
                409,
                'ACTIVE_PHARMACY_ORDERS'
            );
        }
    }

    /** Compte système (super_admin le plus ancien) qui reprend les références conservées. */
    private function systemAccountId(): string
    {
        $stmt = $this->db->query("SELECT id FROM profiles WHERE role = 'super_admin' ORDER BY created_at ASC, id ASC LIMIT 1");
        $id = $stmt->fetchColumn();
        if ($id === false) {
            throw new RuntimeException('Aucun compte super_admin pour reprendre les références du profil supprimé');
        }

        return (string) $id;
    }

    /**
     * Documents personnels hors RDV : cartes vitale / mutuelle du patient et de ses proches,
     * documents déposés par le patient lui-même. Les pièces rattachées à un RDV sont conservées.
     *
     * @return array<string, string> id => file_path
     */
    private function ownProfileDocuments(string $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT md.id, md.file_path FROM medical_documents md
            WHERE md.appointment_id IS NULL
              AND (
                md.uploaded_by = ?
                OR md.id IN (SELECT medical_document_id FROM patient_documents WHERE patient_id = ?)
                OR md.id IN (SELECT medical_document_id FROM patient_relative_documents WHERE patient_id = ?)
              )
        ');
        $stmt->execute([$userId, $userId, $userId]);

        $documents = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $documents[(string) $row['id']] = (string) $row['file_path'];
        }

        return $documents;
    }
}
