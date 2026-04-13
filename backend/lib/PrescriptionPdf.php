<?php

/**
 * Génération de PDF d'ordonnance conforme HDS
 * Utilise Dompdf pour créer un PDF à partir d'un template HTML
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

class PrescriptionPdf
{
    /**
     * Génère un PDF d'ordonnance
     *
     * @param array $prescriber Infos du prescripteur (first_name, last_name, title, address, rpps, adeli...)
     * @param array $patient Infos du patient (first_name, last_name, birth_date, address)
     * @param string $prescriptionText Texte de la prescription
     * @return string Contenu binaire du PDF
     */
    public static function generate(array $prescriber, array $patient, string $prescriptionText): string
    {
        $options = new Options();
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);

        $html = self::buildHtml($prescriber, $patient, $prescriptionText);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    private static function buildHtml(array $prescriber, array $patient, string $prescriptionText): string
    {
        $prescriberName = htmlspecialchars(trim(($prescriber['first_name'] ?? '') . ' ' . ($prescriber['last_name'] ?? '')));
        $prescriberTitle = htmlspecialchars($prescriber['title'] ?? 'Dr');
        $prescriberAddress = htmlspecialchars(self::formatAddress($prescriber['address'] ?? null));
        $prescriberRpps = htmlspecialchars($prescriber['rpps'] ?? '');
        $prescriberAdeli = htmlspecialchars($prescriber['adeli'] ?? '');

        $patientName = htmlspecialchars(trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? '')));
        $patientBirthDate = htmlspecialchars($patient['birth_date'] ?? '');
        $patientAddress = htmlspecialchars(self::formatAddress($patient['address'] ?? null));

        $date = date('d/m/Y');
        $prescriptionHtml = nl2br(htmlspecialchars($prescriptionText));

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11pt; line-height: 1.4; color: #333; margin: 40px; }
        .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #ccc; }
        .prescriber { font-weight: bold; font-size: 12pt; }
        .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 8px; font-size: 11pt; }
        .prescription { margin-top: 16px; padding: 12px; background: #f9f9f9; border-radius: 4px; white-space: pre-wrap; }
        .footer { margin-top: 32px; font-size: 9pt; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="prescriber">{$prescriberTitle} {$prescriberName}</div>
        <div>{$prescriberAddress}</div>
        <div>RPPS : {$prescriberRpps} | ADELI : {$prescriberAdeli}</div>
    </div>

    <div class="section-title">Patient</div>
    <div>Nom : {$patientName}</div>
    <div>Date de naissance : {$patientBirthDate}</div>
    <div>Adresse : {$patientAddress}</div>

    <div class="section-title">Ordonnance</div>
    <div>Date : {$date}</div>
    <div class="prescription">{$prescriptionHtml}</div>

    <div class="footer">
        <p>Document généré le {$date} — OneAndLab — Hébergement des données de santé conforme HDS</p>
    </div>
</body>
</html>
HTML;
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
