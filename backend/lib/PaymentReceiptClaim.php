<?php
declare(strict_types=1);

final class PaymentReceiptAlreadyUsed extends DomainException {}

/** Claim an already verified store receipt, using the existing unique payment-reference index. */
final class PaymentReceiptClaim
{
    public static function claim(PDO $db, string $draftId, string $provider, string $reference, string $product): void
    {
        if (!$db->inTransaction()) throw new LogicException('Receipt claim requires an active transaction.');
        if (!in_array($provider, ['apple', 'google'], true) || trim($reference) === '' || trim($product) === '') {
            throw new InvalidArgumentException('Référence de paiement invalide.');
        }
        try {
            $statement = $db->prepare("UPDATE patient_booking_drafts SET status='paid_processing', stripe_checkout_session_id=?, payment_provider=?, iap_product_id=? WHERE id=? AND status='pending_payment'");
            $statement->execute([$reference, $provider, $product, $draftId]);
            if ($statement->rowCount() !== 1) throw new DomainException('Brouillon non payable.');
        } catch (PDOException $error) {
            if (($error->errorInfo[1] ?? null) === 1062 && str_contains((string)($error->errorInfo[2] ?? ''), 'uq_patient_booking_drafts_stripe_session')) {
                throw new PaymentReceiptAlreadyUsed('Transaction déjà utilisée', 0, $error);
            }
            throw $error;
        }
    }
}
