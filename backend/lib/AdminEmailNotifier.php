<?php

require_once __DIR__ . '/EmailQueue.php';
require_once __DIR__ . '/Email.php';

/**
 * Alertes email équipe Cary (super_admin / ADMIN_NOTIFY_EMAIL).
 * Templates : buildStaffAlertBody + encadré infos (même base que formulaire contact).
 */
class AdminEmailNotifier
{
    private static ?array $recipientsCache = null;

    /** @return list<string> */
    public static function resolveRecipients(): array
    {
        if (self::$recipientsCache !== null) {
            return self::$recipientsCache;
        }

        $raw = trim((string) ($_ENV['ADMIN_NOTIFY_EMAIL'] ?? ''));
        if ($raw !== '') {
            $list = [];
            foreach (explode(',', $raw) as $part) {
                $email = strtolower(trim($part));
                if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $list[$email] = $email;
                }
            }
            if ($list !== []) {
                return self::$recipientsCache = array_values($list);
            }
        }

        try {
            require_once __DIR__ . '/../config/database.php';
            require_once __DIR__ . '/../models/User.php';
            $config = require __DIR__ . '/../config/database.php';
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $config['host'],
                $config['port'],
                $config['database'],
                $config['charset']
            );
            $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
            $stmt = $db->query("SELECT id FROM profiles WHERE role = 'super_admin' AND id IS NOT NULL");
            $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
            $userModel = new User();
            $list = [];
            foreach ($rows as $row) {
                $email = $userModel->getDecryptedEmail((string) ($row['id'] ?? ''));
                if ($email !== null && $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $list[strtolower($email)] = $email;
                }
            }
            if ($list !== []) {
                return self::$recipientsCache = array_values($list);
            }
        } catch (Throwable $e) {
            error_log('AdminEmailNotifier resolveRecipients: ' . $e->getMessage());
        }

        $fallback = trim((string) ($_ENV['SMTP_FROM_EMAIL'] ?? $_ENV['EMAIL_FROM'] ?? 'contact@cary.bio'));

        return self::$recipientsCache = [$fallback !== '' ? $fallback : 'contact@cary.bio'];
    }

    public static function patientRegistered(string $userId, array $data): void
    {
        $email = new Email();
        $name = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
        $inner = '<p style="margin:0 0 14px 0;">Un nouveau compte patient vient d\'être créé sur Cary.</p>'
            . $email->staffDetailBox([
                'Nom' => $name !== '' ? $name : '—',
                'Email' => (string) ($data['email'] ?? ''),
                'Téléphone' => (string) ($data['phone'] ?? ''),
            ]);

        self::queue(
            '[Cary Admin] Nouvelle inscription patient — ' . ($name !== '' ? $name : 'Patient'),
            'Nouvelle inscription patient',
            $inner,
            '/admin/users',
            'Voir les utilisateurs',
            'Nouveau compte patient Cary.'
        );
    }

    public static function registrationRequestSubmitted(string $requestId, string $role, array $data): void
    {
        $email = new Email();
        $roleLabel = self::registrationRoleLabel($role);
        $name = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
        $lines = [
            'Profil demandé' => $roleLabel,
            'Nom' => $name !== '' ? $name : '—',
            'Email' => (string) ($data['email'] ?? ''),
            'Téléphone' => (string) ($data['phone'] ?? ''),
        ];
        if ($role === 'lab') {
            $lines['Laboratoire'] = (string) ($data['company_name'] ?? '');
            $lines['SIRET'] = (string) ($data['siret'] ?? '');
        }
        if ($role === 'pro') {
            $lines['Adeli'] = (string) ($data['adeli'] ?? '');
            $lines['Emploi'] = (string) ($data['emploi'] ?? '');
        }
        if ($role === 'nurse') {
            $lines['RPPS / Adeli'] = trim((string) ($data['rpps'] ?? '') . ' ' . (string) ($data['adeli'] ?? ''));
        }

        $inner = '<p style="margin:0 0 14px 0;">Une nouvelle demande d\'inscription professionnelle est en attente de validation.</p>'
            . $email->staffDetailBox($lines);

        self::queue(
            '[Cary Admin] Demande d\'inscription ' . $roleLabel . ' — ' . ($name !== '' ? $name : 'Nouveau'),
            'Demande d\'inscription à valider',
            $inner,
            '/admin/inscriptions',
            'Traiter la demande',
            'Demande d\'inscription Cary en attente.'
        );
    }

    public static function newAppointment(string $appointmentId, string $appointmentType, ?string $scheduledAt, ?array $formData = null): void
    {
        $email = new Email();
        $typeLabel = self::appointmentTypeLabel($appointmentType);
        $when = self::formatWhen($scheduledAt, $formData);

        $inner = '<p style="margin:0 0 14px 0;">Un nouveau rendez-vous a été enregistré sur la plateforme.</p>'
            . $email->staffDetailBox([
                'Type' => $typeLabel,
                'Date et créneau' => $when !== '' ? $when : '—',
                'Identifiant RDV' => $appointmentId,
            ]);

        self::queue(
            '[Cary Admin] Nouveau RDV — ' . $typeLabel,
            'Nouveau rendez-vous',
            $inner,
            '/admin/appointments/' . $appointmentId,
            'Ouvrir le rendez-vous',
            'Nouveau RDV Cary à traiter.'
        );
    }

    /** @param list<string> $batchSummaries */
    public static function newAppointmentsBatch(int $count, string $primaryAppointmentId, array $batchSummaries, string $appointmentType): void
    {
        $email = new Email();
        $typeLabel = self::appointmentTypeLabel($appointmentType);
        $listHtml = '';
        foreach ($batchSummaries as $line) {
            $listHtml .= '<p style="margin:6px 0 0 0;">• ' . htmlspecialchars((string) $line, ENT_QUOTES, 'UTF-8') . '</p>';
        }

        $inner = '<p style="margin:0 0 14px 0;">' . (int) $count . ' rendez-vous ont été enregistrés dans le même lot.</p>'
            . $email->staffDetailBox(['Type' => $typeLabel])
            . $listHtml;

        self::queue(
            '[Cary Admin] ' . $count . ' nouveaux RDV — ' . $typeLabel,
            'Nouveaux rendez-vous',
            $inner,
            '/admin/appointments/' . $primaryAppointmentId,
            'Ouvrir le lot',
            $count . ' nouveaux RDV Cary.'
        );
    }

    public static function appointmentCanceledByPro(string $appointmentId, string $message, ?string $scheduledAt = null, ?array $formData = null): void
    {
        $email = new Email();
        $when = self::formatWhen($scheduledAt, $formData);
        $lines = ['Détail' => $message];
        if ($when !== '') {
            $lines['Date prévue'] = $when;
        }

        $inner = '<p style="margin:0 0 14px 0;">Un professionnel a annulé un rendez-vous.</p>'
            . $email->staffDetailBox($lines);

        self::queue(
            '[Cary Admin] RDV annulé',
            'Rendez-vous annulé',
            $inner,
            '/admin/appointments/' . $appointmentId,
            'Voir le rendez-vous',
            'Annulation RDV Cary signalée.'
        );
    }

    public static function appointmentCompletedByPro(string $appointmentId, string $message): void
    {
        $email = new Email();
        $inner = '<p style="margin:0 0 14px 0;">Un rendez-vous vient d\'être marqué comme terminé.</p>'
            . $email->staffDetailBox(['Détail' => $message]);

        self::queue(
            '[Cary Admin] RDV terminé',
            'Rendez-vous terminé',
            $inner,
            '/admin/appointments/' . $appointmentId,
            'Voir le rendez-vous',
            'RDV Cary terminé.'
        );
    }

    public static function userCreatedByAdmin(string $userId, string $role, array $data): void
    {
        $email = new Email();
        $roleLabel = self::userRoleLabel($role);
        $name = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
        if ($name === '' && !empty($data['company_name'])) {
            $name = trim((string) $data['company_name']);
        }
        $lines = [
            'Rôle' => $roleLabel,
            'Nom' => $name !== '' ? $name : '—',
            'Email' => (string) ($data['email'] ?? ''),
            'Téléphone' => (string) ($data['phone'] ?? ''),
        ];

        $inner = '<p style="margin:0 0 14px 0;">Un compte a été créé depuis l’administration Cary.</p>'
            . $email->staffDetailBox($lines);

        self::queue(
            '[Cary Admin] Compte créé — ' . $roleLabel,
            'Nouveau compte (admin)',
            $inner,
            '/admin/users/' . $userId,
            'Voir le compte',
            'Compte Cary créé par l’admin.'
        );
    }

    public static function appointmentCanceledByPatient(
        string $appointmentId,
        string $message,
        ?string $scheduledAt = null,
        ?array $formData = null
    ): void {
        $email = new Email();
        $when = self::formatWhen($scheduledAt, $formData);
        $lines = ['Détail' => $message];
        if ($when !== '') {
            $lines['Date prévue'] = $when;
        }

        $inner = '<p style="margin:0 0 14px 0;">Un patient a annulé son rendez-vous.</p>'
            . $email->staffDetailBox($lines);

        self::queue(
            '[Cary Admin] RDV annulé par le patient',
            'Annulation patient',
            $inner,
            '/admin/appointments/' . $appointmentId,
            'Voir le rendez-vous',
            'Annulation RDV par un patient.'
        );
    }

    public static function stripeSubscription(string $eventType, string $userId, ?string $planSlug, string $status, ?string $userEmail = null): void
    {
        if ($eventType !== 'customer.subscription.created') {
            return;
        }

        self::subscriptionActivated('Stripe', $userId, $planSlug, $status, $userEmail);
    }

    public static function stripeSubscriptionEnded(string $userId, ?string $planSlug, ?string $userEmail = null): void
    {
        $email = new Email();
        $planLabel = self::planSlugLabel($planSlug);
        $lines = ['Abonnement' => $planLabel, 'Statut' => 'Résilié'];
        if ($userEmail !== null && $userEmail !== '') {
            $lines['Email utilisateur'] = $userEmail;
        }

        $inner = '<p style="margin:0 0 14px 0;">Un abonnement Stripe a été résilié ou supprimé.</p>'
            . $email->staffDetailBox($lines);

        self::queue(
            '[Cary Admin] Abonnement résilié — ' . $planLabel,
            'Abonnement Stripe résilié',
            $inner,
            '/admin/users/' . $userId,
            'Voir l\'utilisateur',
            'Abonnement Cary résilié.'
        );
    }

    public static function stripeSubscriptionStatusChanged(
        string $userId,
        ?string $planSlug,
        string $status,
        ?string $userEmail = null
    ): void {
        if (!in_array($status, ['past_due', 'unpaid', 'canceled', 'incomplete_expired'], true)) {
            return;
        }

        $email = new Email();
        $planLabel = self::planSlugLabel($planSlug);
        $lines = [
            'Abonnement' => $planLabel,
            'Nouveau statut' => $status,
        ];
        if ($userEmail !== null && $userEmail !== '') {
            $lines['Email utilisateur'] = $userEmail;
        }

        $inner = '<p style="margin:0 0 14px 0;">Le statut d’un abonnement Stripe a changé (action requise possible).</p>'
            . $email->staffDetailBox($lines);

        self::queue(
            '[Cary Admin] Abonnement — ' . $status,
            'Alerte abonnement Stripe',
            $inner,
            '/admin/users/' . $userId,
            'Voir l\'utilisateur',
            'Statut abonnement Cary modifié.'
        );
    }

    public static function storeSubscriptionActivated(
        string $userId,
        string $billingSource,
        ?string $planSlug,
        string $status,
        ?string $userEmail = null
    ): void {
        self::subscriptionActivated(
            $billingSource === 'apple' ? 'Apple' : ($billingSource === 'google' ? 'Google Play' : ucfirst($billingSource)),
            $userId,
            $planSlug,
            $status,
            $userEmail
        );
    }

    public static function storeSubscriptionEnded(string $userId, string $billingSource, ?string $planSlug, ?string $userEmail = null): void
    {
        $email = new Email();
        $provider = $billingSource === 'apple' ? 'Apple' : ($billingSource === 'google' ? 'Google Play' : ucfirst($billingSource));
        $planLabel = self::planSlugLabel($planSlug);
        $lines = [
            'Canal' => $provider,
            'Abonnement' => $planLabel,
            'Statut' => 'Résilié',
        ];
        if ($userEmail !== null && $userEmail !== '') {
            $lines['Email utilisateur'] = $userEmail;
        }

        $inner = '<p style="margin:0 0 14px 0;">Un abonnement mobile (' . htmlspecialchars($provider, ENT_QUOTES, 'UTF-8') . ') a été résilié.</p>'
            . $email->staffDetailBox($lines);

        self::queue(
            '[Cary Admin] Abonnement mobile résilié',
            'Abonnement mobile résilié',
            $inner,
            '/admin/users/' . $userId,
            'Voir l\'utilisateur',
            'Abonnement mobile Cary résilié.'
        );
    }

    public static function vipPayment(string $userId, float $amountEur, int $appointmentCount = 0, string $provider = 'Stripe'): void
    {
        $email = new Email();
        $inner = '<p style="margin:0 0 14px 0;">Un paiement horaire VIP (' . htmlspecialchars($provider, ENT_QUOTES, 'UTF-8') . ') a été confirmé.</p>'
            . $email->staffDetailBox([
                'Montant' => number_format($amountEur, 2, ',', ' ') . ' € TTC',
                'Canal' => $provider,
                'RDV créés' => $appointmentCount > 0 ? (string) $appointmentCount : '—',
            ]);

        self::queue(
            '[Cary Admin] Paiement VIP ' . number_format($amountEur, 2, ',', ' ') . ' €',
            'Paiement horaire VIP',
            $inner,
            '/admin/appointments',
            'Voir les rendez-vous',
            'Paiement VIP Cary confirmé.'
        );
    }

    /** @deprecated use vipPayment() */
    public static function stripeVipPayment(string $userId, float $amountEur, int $appointmentCount = 0): void
    {
        self::vipPayment($userId, $amountEur, $appointmentCount, 'Stripe');
    }

    private static function subscriptionActivated(
        string $provider,
        string $userId,
        ?string $planSlug,
        string $status,
        ?string $userEmail
    ): void {
        $email = new Email();
        $planLabel = self::planSlugLabel($planSlug);
        $lines = [
            'Canal' => $provider,
            'Abonnement' => $planLabel,
            'Statut' => $status,
        ];
        if ($userEmail !== null && $userEmail !== '') {
            $lines['Email utilisateur'] = $userEmail;
        }

        $inner = '<p style="margin:0 0 14px 0;">Un nouvel abonnement a été activé sur Cary.</p>'
            . $email->staffDetailBox($lines);

        self::queue(
            '[Cary Admin] Nouvel abonnement — ' . $planLabel,
            'Nouvel abonnement',
            $inner,
            '/admin/users/' . $userId,
            'Voir l\'utilisateur',
            'Nouvel abonnement Cary.'
        );
    }

    private static function queue(
        string $subject,
        string $title,
        string $innerHtml,
        ?string $ctaPath = null,
        ?string $ctaLabel = null,
        ?string $preheader = null
    ): void {
        $recipients = self::resolveRecipients();
        if ($recipients === []) {
            return;
        }

        $base = rtrim((string) ($_ENV['FRONTEND_URL'] ?? 'https://cary.bio'), '/');
        $ctaUrl = ($ctaPath !== null && $ctaPath !== '')
            ? $base . (str_starts_with($ctaPath, '/') ? $ctaPath : '/' . $ctaPath)
            : '';

        foreach ($recipients as $to) {
            EmailQueue::add('admin_alert', $to, [
                'subject' => $subject,
                'title' => $title,
                'inner_html' => $innerHtml,
                'cta_url' => $ctaUrl,
                'cta_label' => $ctaLabel ?? '',
                'preheader' => $preheader ?? $title,
            ]);
        }
    }

    private static function registrationRoleLabel(string $role): string
    {
        return self::userRoleLabel($role);
    }

    private static function userRoleLabel(string $role): string
    {
        return match ($role) {
            'lab' => 'Laboratoire',
            'subaccount' => 'Sous-compte labo',
            'preleveur' => 'Préleveur',
            'pro' => 'Professionnel de santé',
            'nurse' => 'Infirmier(ère)',
            'patient' => 'Patient',
            'super_admin' => 'Super administrateur',
            default => $role,
        };
    }

    private static function appointmentTypeLabel(string $type): string
    {
        return $type === 'blood_test' ? 'Prélèvement' : ($type === 'nursing' ? 'Soins infirmiers' : 'Rendez-vous');
    }

    private static function planSlugLabel(?string $slug): string
    {
        return match ($slug) {
            'nurse_pro' => 'Infirmier Pro',
            'lab_starter' => 'Laboratoire Starter',
            'lab_pro' => 'Laboratoire Pro',
            default => $slug !== null && $slug !== '' ? $slug : 'Abonnement',
        };
    }

    private static function formatWhen(?string $scheduledAt, ?array $formData): string
    {
        $datePart = '';
        if ($scheduledAt) {
            try {
                $datePart = (new DateTime($scheduledAt))->format('d/m/Y H:i');
            } catch (Exception $e) {
                $datePart = $scheduledAt;
            }
        }
        $creneau = 'Toute la journée';
        $availability = $formData['availability'] ?? null;
        if ($availability) {
            $av = is_string($availability) ? json_decode($availability, true) : $availability;
            if (is_array($av)) {
                if (($av['type'] ?? '') === 'custom' && !empty($av['range']) && is_array($av['range']) && count($av['range']) >= 2) {
                    $creneau = (int) $av['range'][0] . 'h - ' . (int) $av['range'][1] . 'h';
                }
            }
        }
        if ($datePart !== '' && $creneau !== '') {
            return $datePart . ' — ' . $creneau;
        }

        return $datePart ?: $creneau;
    }
}
