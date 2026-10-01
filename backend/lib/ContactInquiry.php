<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';

/**
 * Corps de l'e-mail du formulaire de contact public. Les informations de compte viennent
 * uniquement de la session vérifiée côté serveur, jamais du corps de la requête.
 */
final class ContactInquiry
{
    /**
     * @param array{user_id: string, role: string} $authUser
     * @return array<string, string>
     */
    public static function accountRows(array $authUser, User $userModel): array
    {
        return [
            'Identifiant compte' => $authUser['user_id'],
            'Rôle' => $authUser['role'],
            'E-mail compte' => (string) ($userModel->getDecryptedEmail($authUser['user_id']) ?? ''),
        ];
    }

    /**
     * Contexte technique déclaré par l'application (champ « client » du corps), non vérifié :
     * seules les clés de la liste blanche au format attendu sont retenues, le reste est ignoré
     * pour ne jamais bloquer une demande d'aide.
     *
     * @return array<string, string>
     */
    public static function clientRows(mixed $client): array
    {
        if (!is_array($client)) {
            return [];
        }
        $rules = [
            'app_version' => ['Version de l\'application', '/^[0-9A-Za-z._-]{1,32}$/'],
            'build' => ['Build', '/^[0-9A-Za-z._-]{1,32}$/'],
            'platform' => ['Plateforme', '/^(ios|android|web)$/'],
            'device_model' => ['Appareil', '/^[\p{L}\p{N} ._,()+\/-]{1,64}$/u'],
        ];
        $rows = [];
        foreach ($rules as $key => [$label, $pattern]) {
            $value = $client[$key] ?? null;
            if (!is_string($value)) {
                continue;
            }
            $value = trim($value);
            if (preg_match($pattern, $value) === 1) {
                $rows[$label] = $value;
            }
        }

        return $rows;
    }

    /**
     * @param array<string, string> $accountRows vide si l'expéditeur n'est pas connecté
     * @param array<string, string> $clientRows issues de clientRows()
     */
    public static function innerHtml(string $typeLabel, string $name, string $email, string $message, array $accountRows, array $clientRows = []): string
    {
        $inner = '<p style="margin:0 0 12px 0;"><strong>Motif :</strong> ' . htmlspecialchars($typeLabel) . '</p>'
            . '<p style="margin:0 0 12px 0;"><strong>Nom :</strong> ' . htmlspecialchars($name) . '</p>'
            . '<p style="margin:0 0 12px 0;"><strong>Email :</strong> ' . htmlspecialchars($email) . '</p>'
            . '<p style="margin:0 0 8px 0;"><strong>Message :</strong></p>'
            . '<p style="margin:0 0 16px 0;white-space:pre-wrap;">' . nl2br(htmlspecialchars($message)) . '</p>';

        $inner .= self::section('Compte connecté (vérifié par le serveur)', $accountRows);
        $inner .= self::section('Application (déclaré par l\'appareil, non vérifié)', $clientRows);

        return $inner;
    }

    /** @param array<string, string> $rows */
    private static function section(string $title, array $rows): string
    {
        $rows = array_filter($rows, static fn (string $value): bool => $value !== '');
        if ($rows === []) {
            return '';
        }
        $html = '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />'
            . '<p style="margin:0 0 8px 0;"><strong>' . htmlspecialchars($title) . '</strong></p>';
        foreach ($rows as $label => $value) {
            $html .= '<p style="margin:0 0 6px 0;"><strong>' . htmlspecialchars($label) . ' :</strong> '
                . htmlspecialchars($value) . '</p>';
        }

        return $html;
    }
}
