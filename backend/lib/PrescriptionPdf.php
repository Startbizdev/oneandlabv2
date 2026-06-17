<?php

/**
 * Génération de PDF d'ordonnance (médicale ou actes infirmiers).
 * Mise en page sobre — noir et blanc, logo Cary en couleur.
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/AppTimezone.php';
require_once __DIR__ . '/PrescriptionSignature.php';
require_once __DIR__ . '/ProfessionalId.php';

use Dompdf\Dompdf;
use Dompdf\Options;

class PrescriptionPdf
{
    private const INK = '#111111';
    private const INK_MID = '#444444';
    private const INK_MUTED = '#666666';
    private const LINE = '#CCCCCC';
    private const LOGO_TARGET_HEIGHT = 52;

    /**
     * @param array<string, mixed> $options
     *   kind, prescription_number, prescription_date (Y-m-d),
     *   handwritten_signature_png (base64), signed_at (DateTimeInterface)
     */
    public static function generate(array $prescriber, array $patient, string $prescriptionText, array $options = []): string
    {
        return self::renderToPdf($prescriber, $patient, $prescriptionText, $options);
    }

    /**
     * @param array<string, mixed> $options
     */
    private static function renderToPdf(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        array $options
    ): string {
        $assetsDir = realpath(__DIR__ . '/../assets') ?: (__DIR__ . '/../assets');

        $dompdfOptions = new Options();
        $dompdfOptions->set('isRemoteEnabled', false);
        $dompdfOptions->set('isHtml5ParserEnabled', true);
        $dompdfOptions->set('defaultFont', 'DejaVu Sans');
        $dompdfOptions->setChroot([$assetsDir]);

        $dompdf = new Dompdf($dompdfOptions);
        $dompdf->loadHtml(self::buildHtml($prescriber, $patient, $prescriptionText, $options), 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * @param array<string, mixed> $options
     */
    private static function buildHtml(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        array $options
    ): string {
        $kind = ($options['kind'] ?? 'medical') === 'nursing' ? 'nursing' : 'medical';
        $ink = self::INK;
        $inkMid = self::INK_MID;
        $inkMuted = self::INK_MUTED;
        $line = self::LINE;

        $prescriptionNumber = htmlspecialchars((string) ($options['prescription_number'] ?? ''));
        $prescriberName = htmlspecialchars(trim(($prescriber['first_name'] ?? '') . ' ' . ($prescriber['last_name'] ?? '')));
        $prescriberTitle = htmlspecialchars($prescriber['title'] ?? ($kind === 'nursing' ? 'Infirmier(ère)' : 'Dr'));
        $prescriberAddress = htmlspecialchars(self::formatAddress($prescriber['address'] ?? null));
        $prescriberRpps = htmlspecialchars(trim($prescriber['rpps'] ?? ''));
        $prescriberAdeli = htmlspecialchars(trim($prescriber['adeli'] ?? ''));

        $patientName = htmlspecialchars(trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? '')));
        $patientBirthDate = htmlspecialchars(self::formatBirthDate($patient['birth_date'] ?? ''));
        $patientAddress = htmlspecialchars(self::formatAddress($patient['address'] ?? null));
        $patientNir = htmlspecialchars(trim((string) ($patient['nir'] ?? '')));

        $prescriptionDate = self::resolvePrescriptionDate($options);
        $date = AppTimezone::displayDate($prescriptionDate);
        $signedAt = self::resolveSignedAt($options, $prescriptionDate);
        $prescriptionBodyHtml = self::buildPrescriptionBodyHtml($prescriptionText, $options, $kind, $date);

        $idBlock = self::buildIdBlock($kind, $prescriberRpps, $prescriberAdeli);
        $nirRow = $patientNir !== ''
            ? "<tr><td class=\"label\">NIR</td><td class=\"value\">{$patientNir}</td></tr>"
            : '';

        $legalFooter = $kind === 'nursing'
            ? 'Ce document ne constitue pas une ordonnance de médicaments. Il porte exclusivement sur des actes de soins infirmiers conformément à la réglementation en vigueur.'
            : 'En cas de prescription de médicaments, la mention « Non substituable » doit figurer sur l\'ordonnance lorsque requise par la réglementation. Durée de validité conforme à la réglementation des ordonnances médicales.';

        $numberBadge = $prescriptionNumber !== ''
            ? "<span class=\"rx-badge\">N° {$prescriptionNumber}</span>"
            : '';

        $prescriberAddressRow = $prescriberAddress !== ''
            ? "<div class=\"meta-line\">{$prescriberAddress}</div>"
            : '';
        $patientAddressRow = $patientAddress !== ''
            ? "<tr><td class=\"label\">Adresse</td><td class=\"value\">{$patientAddress}</td></tr>"
            : '';

        $brandHeader = self::buildBrandHeaderHtml();
        $handwrittenBlock = self::buildHandwrittenSignatureBlock(
            $options['handwritten_signature_png'] ?? null,
            $prescriber,
            $kind
        );
        $signatureBlock = self::buildSignatureCertificate(
            $prescriber,
            $patient,
            $prescriptionText,
            $kind,
            (string) ($options['prescription_number'] ?? ''),
            $signedAt,
            $prescriptionDate
        );
        $footerSignNote = 'Document signé électroniquement via Cary — horodatage certifié (heure de Paris).';

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 0; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10pt;
            line-height: 1.45;
            color: {$ink};
            margin: 0;
            padding: 0;
        }
        .content { padding: 28px 40px 88px; }

        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .header-table td { vertical-align: middle; padding: 0; }
        .brand-cell { width: 58%; }
        .meta-cell { width: 42%; text-align: right; }
        .brand-tagline {
            font-size: 7.5pt;
            color: {$inkMuted};
            letter-spacing: 0.3px;
            text-transform: uppercase;
            margin-top: 4px;
        }
        .meta-date { font-size: 9pt; color: {$inkMid}; margin-bottom: 4px; }
        .rx-badge {
            border: 1px solid {$line};
            color: {$inkMid};
            font-size: 7.5pt;
            font-weight: bold;
            padding: 3px 9px;
        }

        .parties-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .parties-table td { width: 50%; vertical-align: top; padding: 0 6px 0 0; }
        .parties-table td + td { padding: 0 0 0 6px; }
        .party-card { border: 1px solid {$line}; background: #fff; }
        .party-head {
            border-bottom: 1px solid {$line};
            padding: 6px 12px;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: {$inkMuted};
        }
        .party-body { padding: 10px 12px 12px; }
        .party-name { font-size: 10.5pt; font-weight: bold; margin-bottom: 2px; }
        .party-role { font-size: 8pt; color: {$inkMuted}; margin-bottom: 6px; }
        .meta-line { font-size: 8.5pt; color: {$inkMid}; line-height: 1.35; }
        .id-chip {
            margin-top: 5px;
            border: 1px solid {$line};
            padding: 2px 7px;
            font-size: 7.5pt;
            color: {$inkMid};
        }
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table td { padding: 2px 0; font-size: 8.5pt; vertical-align: top; }
        .info-table .label { width: 40%; color: {$inkMuted}; }
        .info-table .value { color: {$ink}; font-weight: bold; }

        .rx-section { margin-bottom: 14px; }
        .rx-head-table { width: 100%; border-collapse: collapse; border-bottom: 1px solid {$ink}; margin-bottom: 8px; }
        .rx-head-table td { padding: 0 0 4px; vertical-align: bottom; }
        .rx-label { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; }
        .rx-date { text-align: right; font-size: 8.5pt; color: {$inkMuted}; }
        .prescription-box {
            min-height: 72px;
            padding: 14px 16px;
            border: 1px solid {$line};
            font-size: 10.5pt;
            line-height: 1.5;
        }
        .rx-subsection { margin-bottom: 14px; }
        .rx-subsection:last-child { margin-bottom: 0; }
        .rx-framed-block {
            border: 1px solid {$ink};
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        .rx-framed-block:last-child { margin-bottom: 0; }
        .rx-framed-head {
            text-align: center;
            padding: 10px 14px 9px;
            border-bottom: 1px solid {$line};
            background: #fafafa;
        }
        .rx-framed-title-main {
            font-size: 7.5pt;
            font-weight: bold;
            color: {$ink};
            line-height: 1.4;
        }
        .rx-framed-title-sub {
            font-size: 7pt;
            font-weight: bold;
            color: {$inkMid};
            margin-top: 4px;
            line-height: 1.35;
        }
        .rx-framed-body {
            min-height: 64px;
            padding: 14px 16px;
            font-size: 10.5pt;
            line-height: 1.5;
            color: {$ink};
        }

        .hand-sign { margin-top: 16px; text-align: right; }
        .hand-sign img { height: 92px; max-width: 360px; width: auto; }
        .hand-sign-label { font-size: 7.5pt; color: {$inkMuted}; margin-top: 4px; }

        .e-sign {
            border: 1px solid {$line};
            margin-top: 12px;
            padding: 8px 10px;
            font-size: 6.5pt;
            color: {$inkMid};
            line-height: 1.4;
        }
        .e-sign strong { color: {$ink}; }
        .e-sign-sha {
            display: block;
            margin-top: 4px;
            font-size: 6pt;
            color: {$inkMuted};
            word-break: break-all;
            letter-spacing: 0.02em;
        }

        .page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px 40px 14px;
            border-top: 1px solid {$line};
            background: #fff;
            text-align: center;
        }
        .footer-legal {
            font-size: 6.5pt;
            color: {$inkMuted};
            line-height: 1.45;
            margin: 0 auto 4px;
            max-width: 460px;
        }
        .footer-sign {
            font-size: 6.5pt;
            color: {$inkMid};
            line-height: 1.4;
            margin: 0 auto 4px;
            max-width: 460px;
        }
        .footer-brand { font-size: 6.5pt; color: {$inkMuted}; margin: 0; }
    </style>
</head>
<body>
<div class="content">
    <table class="header-table">
        <tr>
            <td class="brand-cell">
                {$brandHeader}
                <div class="brand-tagline">Santé à domicile — document officiel</div>
            </td>
            <td class="meta-cell">
                <div class="meta-date">Émis le {$date}</div>
                {$numberBadge}
            </td>
        </tr>
    </table>

    <table class="parties-table">
        <tr>
            <td>
                <div class="party-card">
                    <div class="party-head">Prescripteur</div>
                    <div class="party-body">
                        <div class="party-name">{$prescriberTitle} {$prescriberName}</div>
                        <div class="party-role">Professionnel de santé</div>
                        {$prescriberAddressRow}
                        {$idBlock}
                    </div>
                </div>
            </td>
            <td>
                <div class="party-card">
                    <div class="party-head">Patient</div>
                    <div class="party-body">
                        <table class="info-table">
                            <tr><td class="label">Nom</td><td class="value">{$patientName}</td></tr>
                            <tr><td class="label">Date de naissance</td><td class="value">{$patientBirthDate}</td></tr>
                            {$nirRow}
                            {$patientAddressRow}
                        </table>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <div class="rx-section">
        {$prescriptionBodyHtml}
    </div>

    {$handwrittenBlock}
    {$signatureBlock}
</div>

<div class="page-footer">
    <p class="footer-sign">{$footerSignNote}</p>
    <p class="footer-legal">{$legalFooter}</p>
    <p class="footer-brand">Document généré via Cary · Données de santé hébergées HDS · cary.bio</p>
</div>
</body>
</html>
HTML;
    }

    private static function buildPrescriptionBodyHtml(
        string $prescriptionText,
        array $options,
        string $kind,
        string $date
    ): string {
        $sections = $options['prescription_sections'] ?? null;
        if (is_array($sections) && $sections !== []) {
            $blocks = '';
            foreach ($sections as $section) {
                if (!is_array($section)) {
                    continue;
                }
                $title = trim((string) ($section['title'] ?? ''));
                $body = trim((string) ($section['body'] ?? ''));
                if ($title === '' || $body === '') {
                    continue;
                }
                $blocks .= '<div class="rx-framed-block">'
                    . self::buildPrescriptionSectionHeadHtml($title)
                    . '<div class="rx-framed-body">' . nl2br(htmlspecialchars($body)) . '</div>'
                    . '</div>';
            }
            if ($blocks !== '') {
                return $blocks;
            }
        }

        $prescriptionHtml = nl2br(htmlspecialchars($prescriptionText));

        return '<table class="rx-head-table">'
            . '<tr><td class="rx-label">Prescription</td>'
            . '<td class="rx-date">Date : ' . htmlspecialchars($date) . '</td></tr>'
            . '</table>'
            . '<div class="prescription-box">' . $prescriptionHtml . '</div>';
    }

    private static function buildPrescriptionSectionHeadHtml(string $title): string
    {
        $title = trim($title);
        $parenPos = strpos($title, '(');
        if ($parenPos === false) {
            return '<div class="rx-framed-head"><div class="rx-framed-title-main">'
                . htmlspecialchars($title)
                . '</div></div>';
        }

        $main = trim(substr($title, 0, $parenPos));
        $sub = trim(substr($title, $parenPos));

        return '<div class="rx-framed-head">'
            . '<div class="rx-framed-title-main">' . htmlspecialchars($main) . '</div>'
            . '<div class="rx-framed-title-sub">' . htmlspecialchars($sub) . '</div>'
            . '</div>';
    }

    /**
     * @param array<string, mixed> $options
     */
    private static function resolvePrescriptionDate(array $options): DateTimeImmutable
    {
        $raw = trim((string) ($options['prescription_date'] ?? ''));
        if ($raw !== '') {
            $parsed = AppTimezone::parseDateYmd($raw);
            if ($parsed !== null) {
                return $parsed;
            }
        }

        return AppTimezone::now();
    }

    /**
     * @param array<string, mixed> $options
     */
    private static function resolveSignedAt(array $options, DateTimeImmutable $prescriptionDate): DateTimeImmutable
    {
        $candidate = $options['signed_at'] ?? null;
        if ($candidate instanceof DateTimeInterface) {
            $dt = $candidate instanceof DateTimeImmutable
                ? $candidate
                : DateTimeImmutable::createFromInterface($candidate);

            return $dt->setTimezone(new DateTimeZone(AppTimezone::TZ));
        }

        return AppTimezone::now();
    }

    /**
     * @param array<string, mixed> $prescriber
     */
    private static function buildHandwrittenSignatureBlock(?string $pngBase64, array $prescriber, string $kind): string
    {
        if ($pngBase64 === null || trim($pngBase64) === '') {
            return '';
        }
        $uri = PrescriptionSignature::toJpegDataUriForPdf($pngBase64);
        if ($uri === null) {
            return '';
        }

        $lastName = trim((string) ($prescriber['last_name'] ?? ''));
        $firstName = trim((string) ($prescriber['first_name'] ?? ''));
        $name = trim($lastName . ' ' . $firstName);
        if ($name === '') {
            $name = trim($firstName . ' ' . $lastName);
        }
        $title = trim((string) ($prescriber['title'] ?? ($kind === 'nursing' ? 'Infirmier(ère)' : 'Dr')));
        $label = 'Signature ' . $name . ' — ' . $title;

        return '<div class="hand-sign">'
            . '<img src="' . htmlspecialchars($uri, ENT_QUOTES, 'UTF-8') . '" alt="Signature" />'
            . '<div class="hand-sign-label">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</div>'
            . '</div>';
    }

    private static function buildBrandHeaderHtml(): string
    {
        $logo = self::buildLogoImgTag();

        return $logo ?? '<div style="font-size:18pt;font-weight:bold;">Cary</div>';
    }

    private static function buildLogoImgTag(): ?string
    {
        $logo = self::resolveLogoBinary();
        if ($logo === null) {
            return null;
        }

        [$bytes, $mime, $srcW, $srcH] = $logo;
        $targetH = self::LOGO_TARGET_HEIGHT;
        $targetW = max(1, (int) round($srcW * ($targetH / $srcH)));
        $dataUri = 'data:' . $mime . ';base64,' . base64_encode($bytes);

        return '<img src="' . $dataUri . '" width="' . $targetW . '" height="' . $targetH . '" alt="Cary" />';
    }

    /**
     * @return array{0: string, 1: string, 2: int, 3: int}|null
     */
    private static function resolveLogoBinary(): ?array
    {
        $assetsDir = realpath(__DIR__ . '/../assets') ?: (__DIR__ . '/../assets');
        $jpgPath = $assetsDir . '/logo-cary.jpg';

        if (is_readable($jpgPath)) {
            $info = @getimagesize($jpgPath);
            if ($info !== false && ($info[2] ?? 0) === IMAGETYPE_JPEG) {
                $bytes = @file_get_contents($jpgPath);
                if ($bytes !== false && $bytes !== '') {
                    return [$bytes, 'image/jpeg', (int) $info[0], (int) $info[1]];
                }
            }
        }

        $pngPath = $assetsDir . '/logo-cary.png';
        if (!is_readable($pngPath) || !function_exists('imagecreatefrompng')) {
            return null;
        }

        $jpegBytes = self::convertPngFileToJpegBytes($pngPath);
        if ($jpegBytes === null) {
            return null;
        }

        $info = @getimagesizefromstring($jpegBytes);

        return $info === false ? null : [$jpegBytes, 'image/jpeg', (int) $info[0], (int) $info[1]];
    }

    private static function convertPngFileToJpegBytes(string $pngPath): ?string
    {
        if (!function_exists('imagecreatefrompng') || !function_exists('imagejpeg')) {
            return null;
        }

        $image = @imagecreatefrompng($pngPath);
        if ($image === false) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width <= 0 || $height <= 0) {
            imagedestroy($image);

            return null;
        }

        $canvas = imagecreatetruecolor($width, $height);
        if ($canvas === false) {
            imagedestroy($image);

            return null;
        }

        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $white);
        imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
        imagedestroy($image);

        ob_start();
        $ok = imagejpeg($canvas, null, 92);
        imagedestroy($canvas);
        $jpeg = ob_get_clean();

        return ($ok && is_string($jpeg) && $jpeg !== '') ? $jpeg : null;
    }

    private static function buildIdBlock(string $kind, string $rpps, string $adeli): string
    {
        $chips = [];
        $rpps = trim($rpps);
        $adeli = trim($adeli);

        if ($kind === 'nursing') {
            $raw = $rpps !== '' ? $rpps : $adeli;
            if ($raw !== '') {
                $split = ProfessionalId::split($raw);
                $line = ProfessionalId::displayWithKind($split['rpps'], $split['adeli']);
                if ($line !== null) {
                    $chips[] = $line;
                }
            }
        } else {
            if ($rpps !== '') {
                $chips[] = 'RPPS ' . $rpps;
            }
            if ($adeli !== '') {
                $split = ProfessionalId::split($adeli);
                if ($split['rpps'] !== null) {
                    $chips[] = 'RPPS ' . $split['rpps'];
                } else {
                    $chips[] = 'Adeli ' . $adeli;
                }
            }
        }

        if ($chips === []) {
            return '';
        }

        return '<div class="id-chip">' . htmlspecialchars(implode(' · ', $chips)) . '</div>';
    }

    /**
     * @param array<string, mixed> $prescriber
     * @param array<string, mixed> $patient
     */
    private static function buildSignatureCertificate(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        string $kind,
        string $prescriptionNumber,
        DateTimeImmutable $signedAt,
        DateTimeImmutable $prescriptionDate
    ): string {
        $displayTimestamp = AppTimezone::displayDateTime($signedAt);
        $tzLabel = AppTimezone::tzAbbrev($signedAt);

        $prescriberName = trim(($prescriber['first_name'] ?? '') . ' ' . ($prescriber['last_name'] ?? ''));
        $prescriberTitle = trim((string) ($prescriber['title'] ?? ($kind === 'nursing' ? 'Infirmier(ère)' : 'Dr')));

        $fingerprint = self::computeDocumentFingerprint(
            $prescriber,
            $patient,
            $prescriptionText,
            $kind,
            $prescriptionNumber,
            $signedAt,
            AppTimezone::format('Y-m-d', $prescriptionDate)
        );
        $signatureRef = self::signatureReference($fingerprint);
        $esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

        $docPart = $prescriptionNumber !== '' ? ' · N° ' . $esc($prescriptionNumber) : '';
        $shaFull = $esc(strtoupper(preg_replace('/\s+/', '', $fingerprint) ?? $fingerprint));
        $line = '<strong>' . $esc($prescriberTitle . ' ' . $prescriberName) . '</strong>'
            . $docPart
            . ' · Signé le ' . $esc($displayTimestamp . ' (' . $tzLabel . ')')
            . ' · Réf. ' . $esc($signatureRef)
            . '<span class="e-sign-sha">SHA-256 ' . $shaFull . '</span>';

        return '<div class="e-sign">' . $line . '</div>';
    }

    /**
     * @param array<string, mixed> $prescriber
     * @param array<string, mixed> $patient
     */
    private static function computeDocumentFingerprint(
        array $prescriber,
        array $patient,
        string $prescriptionText,
        string $kind,
        string $prescriptionNumber,
        DateTimeImmutable $signedAt,
        string $prescriptionDateYmd
    ): string {
        $payload = json_encode([
            'kind' => $kind,
            'prescription_number' => $prescriptionNumber,
            'prescription_date' => $prescriptionDateYmd,
            'signed_at' => AppTimezone::iso8601($signedAt),
            'prescriber' => [
                'first_name' => trim((string) ($prescriber['first_name'] ?? '')),
                'last_name' => trim((string) ($prescriber['last_name'] ?? '')),
                'title' => trim((string) ($prescriber['title'] ?? '')),
                'rpps' => trim((string) ($prescriber['rpps'] ?? '')),
                'adeli' => trim((string) ($prescriber['adeli'] ?? '')),
            ],
            'patient' => [
                'first_name' => trim((string) ($patient['first_name'] ?? '')),
                'last_name' => trim((string) ($patient['last_name'] ?? '')),
                'birth_date' => trim((string) ($patient['birth_date'] ?? '')),
            ],
            'prescription_text' => $prescriptionText,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return hash('sha256', $payload !== false ? $payload : '');
    }

    private static function signatureReference(string $fingerprint): string
    {
        return 'SIG-' . strtoupper(substr($fingerprint, 0, 8));
    }

    private static function formatBirthDate(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return '—';
        }
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $raw, $m)) {
            return $m[3] . '/' . $m[2] . '/' . $m[1];
        }

        return $raw;
    }

    private static function formatAddress($address): string
    {
        if (empty($address)) {
            return '';
        }
        if (is_string($address)) {
            $decoded = json_decode($address, true);
            if (is_array($decoded) && isset($decoded['label'])) {
                return (string) $decoded['label'];
            }

            return $address;
        }
        if (is_array($address) && isset($address['label'])) {
            return (string) $address['label'];
        }

        return '';
    }
}
