<?php

declare(strict_types=1);

/**
 * Chemins in-app Cary (mobile patient) — pour guider l'assistant sans « Réglages iPhone ».
 */
final class CaryAppNavigation
{
    /**
     * @return array<string, mixed>
     */
    public static function forRole(string $role): array
    {
        if ($role !== 'patient') {
            return [];
        }

        return [
            'health_record' => [
                'menu_path' => 'Onglet Plus → Mon carnet de santé',
                'questionnaires' => 'Sur le carnet : bouton « Répondre aux questionnaires » (masqué à 100 %)',
                'edit_section' => 'Sur le carnet : appuyer sur une section (Général, Allergies…) pour modifier',
            ],
            'health_sync_ios' => [
                'menu_path' => 'Onglet Plus → Mes données santé',
                'action' => 'Appuyer sur la carte « Connecter Apple Santé » en haut de l\'écran',
                'not_in' => 'Ce n\'est PAS dans Réglages iPhone → Cary : tout se fait dans l\'app Cary, écran Mes données santé',
                'after_tap' => 'iOS ouvre l\'autorisation Apple Santé — accepter la lecture (poids, pas, fréquence cardiaque)',
            ],
            'health_sync_android' => [
                'menu_path' => 'Onglet Plus → Mes données santé',
                'action' => 'Appuyer sur la carte « Connecter Health Connect » en haut',
                'not_in' => 'Pas dans les paramètres Android généraux : depuis Cary → Mes données santé',
            ],
            'documents' => [
                'menu_path' => 'Onglet Plus → Mes documents',
                'chat_upload' => 'Dans le chat Cary : bouton + à gauche de la zone de saisie',
            ],
            'appointments' => [
                'menu_path' => 'Onglet Rendez-vous',
                'book' => 'Bouton Prendre rendez-vous ou via l\'assistant Cary',
            ],
            'lab_results' => [
                'menu_path' => 'Onglet Plus → Résultats',
            ],
        ];
    }
}
