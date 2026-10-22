<?php

declare(strict_types=1);

require_once __DIR__ . '/AssistantProvider.php';
require_once __DIR__ . '/AssistantIntent.php';

/**
 * Fournisseur local déterministe (ASSISTANT_PROVIDER=mock) pour les tests et la QA sans réseau.
 * Il suit l'intention de la demande et répond à partir des données réellement renvoyées par les outils
 * (liste des rendez-vous, résultats, tournée), avec la carte d'action adaptée. Il stream mot à mot.
 * Si ASSISTANT_MOCK_RECORD_FILE est défini, chaque entrée reçue y est ajoutée (une ligne JSON) pour vérifier la barrière.
 */
final class MockAssistantProvider implements AssistantProvider
{
    private const PAST = '/pass[ée]s?|derniers?|historique|pr[ée]c[ée]dents?/iu';

    public function stream(array $messages, array $tools, callable $onDelta, callable $onToolCall): array
    {
        $record = assistant_env('ASSISTANT_MOCK_RECORD_FILE');
        if ($record !== null) {
            file_put_contents($record, json_encode(['messages' => $messages, 'tools' => array_column(array_column($tools, 'function'), 'name')], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
        }
        $toolNames = array_column(array_column($tools, 'function'), 'name');
        $call = $this->nextToolCall($messages, $toolNames);
        if ($call !== null) {
            $onToolCall($call['name']);

            return ['content' => '', 'tool_calls' => [$call], 'model' => 'mock', 'input_tokens' => 0, 'output_tokens' => 0];
        }

        $text = $this->answer($messages);
        foreach (preg_split('/(?<= )/u', $text) ?: [] as $word) {
            $onDelta($word);
        }

        return ['content' => $text, 'tool_calls' => [], 'model' => 'mock', 'input_tokens' => 0, 'output_tokens' => str_word_count($text)];
    }

    /**
     * @param list<array<string, mixed>> $messages
     * @param list<string> $toolNames
     * @return array{id: string, name: string, arguments: array<string, mixed>}|null
     */
    private function nextToolCall(array $messages, array $toolNames): ?array
    {
        $called = self::calledTools($messages);
        $question = self::lastUserText($messages);
        $intent = self::intent($question, $messages);
        $has = static fn (string $name): bool => in_array($name, $toolNames, true);

        if ($called === []) {
            return match (true) {
                $intent === 'appointments' && $has('get_my_appointments') => self::call('get_my_appointments', ['period' => preg_match(self::PAST, $question) === 1 ? 'past' : 'upcoming']),
                $intent === 'results' && $has('get_lab_results') => self::call('get_lab_results', ['limit' => 5]),
                $intent === 'tour' && $has('get_tour') => self::call('get_tour', []),
                $intent === 'book' && $has('propose_action') => self::call('propose_action', [
                    'type' => 'book_appointment',
                    'label' => 'Prendre rendez-vous',
                    'params' => AssistantIntent::careType($question) !== null ? ['care_type' => AssistantIntent::careType($question)] : [],
                ]),
                default => null,
            };
        }
        if (in_array('propose_action', $called, true) || !$has('propose_action')) {
            return null;
        }
        $data = self::lastToolData($messages);
        $items = is_array($data['items'] ?? null) ? $data['items'] : [];
        $past = preg_match(self::PAST, $question) === 1;

        return match ($intent) {
            // Un rendez-vous précis à ouvrir ; proposer d'en prendre un seulement à un patient qui n'en a aucun à venir.
            'appointments' => match (true) {
                $items !== [] => self::call('propose_action', ['type' => 'open_appointment', 'label' => $past ? 'Voir le rendez-vous' : 'Voir le prochain rendez-vous', 'params' => ['id' => (string) ($items[0]['id'] ?? '')]]),
                !$past && !self::isStaff($messages) => self::call('propose_action', ['type' => 'book_appointment', 'label' => 'Prendre rendez-vous', 'params' => []]),
                default => null,
            },
            'results' => self::call('propose_action', ['type' => 'open_lab_results', 'label' => 'Voir mes résultats', 'params' => []]),
            'tour' => self::call('propose_action', ['type' => 'open_tour', 'label' => 'Ouvrir la tournée', 'params' => []]),
            default => null,
        };
    }

    /** @param list<array<string, mixed>> $messages */
    private function answer(array $messages): string
    {
        $system = (string) ($messages[0]['content'] ?? '');
        $question = self::lastUserText($messages);
        if (str_starts_with($system, 'Tu mets en forme une transmission')) {
            return 'Transmission : ' . trim($question);
        }
        $intent = self::intent($question, $messages);
        $data = self::lastToolData($messages);
        $items = is_array($data['items'] ?? null) ? $data['items'] : [];

        return match ($intent) {
            'appointments' => self::appointmentsText($items, preg_match(self::PAST, $question) === 1, self::isStaff($messages)),
            'results' => $items === []
                ? 'Aucun résultat d\'analyse n\'est disponible pour le moment. Ils apparaîtront ici dès que le laboratoire les aura transmis.'
                : 'Voici vos derniers résultats :' . "\n" . implode("\n", array_map(
                    static fn (array $r): string => '- ' . ucfirst((string) ($r['jour'] ?? $r['date'] ?? '')) . ' : ' . ($r['analyse'] ?? 'Analyse'),
                    $items,
                )) . "\n" . 'Pour que je vous explique les valeurs, joignez le document à la conversation.',
            'tour' => $items === []
                ? 'Aucun passage n\'est prévu dans votre tournée ' . (isset($data['jour']) ? 'du ' . $data['jour'] : 'aujourd\'hui') . '.'
                : 'Votre tournée du ' . ($data['jour'] ?? 'jour') . ' compte ' . count($items) . ' passage' . (count($items) > 1 ? 's' : '') . ' :' . "\n" . implode("\n", array_map(
                    static fn (array $s): string => '- ' . ($s['creneau'] ?? 'Horaire libre') . ' — ' . ($s['patient'] ?? 'Patient') . ', ' . ($s['soin'] ?? 'soin') . ' (' . ($s['statut'] ?? 'à faire') . ')',
                    $items,
                )),
            'book' => 'Je vous ouvre la prise de rendez-vous' . (AssistantIntent::careType($question) === 'blood_test' ? ' pour une prise de sang' : (AssistantIntent::careType($question) === 'nursing' ? ' pour un soin infirmier' : '')) . ' : choisissez la date et le créneau, puis validez.',
            default => self::smallTalk($system, $question),
        };
    }

    /** @param list<array<string, mixed>> $items */
    private static function appointmentsText(array $items, bool $past, bool $staff): string
    {
        if ($items === []) {
            return match (true) {
                $past => 'Vous n\'avez pas encore de rendez-vous passé.',
                $staff => 'Vous n\'avez aucun rendez-vous à venir pour le moment.',
                default => 'Vous n\'avez aucun rendez-vous à venir. Vous pouvez en prendre un en quelques secondes.',
            };
        }
        $count = count($items);
        $intro = $past
            ? 'Vos derniers rendez-vous :'
            : 'Vous avez ' . $count . ' rendez-vous à venir :';
        $lines = array_map(static function (array $a): string {
            $when = ucfirst((string) ($a['jour'] ?? $a['date'] ?? 'Date à définir'));
            $time = isset($a['creneau']) && $a['creneau'] !== null ? ' à ' . $a['creneau'] : '';
            $who = isset($a['intervenant']) && $a['intervenant'] !== null ? ', avec ' . $a['intervenant'] : '';

            return '- ' . $when . $time . ' — ' . ($a['soin'] ?? 'Soin') . ' (' . ($a['statut'] ?? 'statut inconnu') . ')' . $who;
        }, array_slice($items, 0, 5));
        $more = $count > 5 ? "\n" . 'Et ' . ($count - 5) . ' autre(s) dans l\'onglet Rendez-vous.' : '';

        return $intro . "\n" . implode("\n", $lines) . $more;
    }

    /** @param list<array<string, mixed>> $messages */
    private static function isStaff(array $messages): bool
    {
        return self::isStaffPrompt((string) ($messages[0]['content'] ?? ''));
    }

    private static function isStaffPrompt(string $system): bool
    {
        return str_contains($system, 'infirmier') || str_contains($system, 'préleveur') || str_contains($system, 'professionnel de santé');
    }

    private static function smallTalk(string $system, string $question): string
    {
        $staff = self::isStaffPrompt($system);
        if (preg_match('/^\s*(bonjour|salut|hello|coucou|bonsoir)\b/iu', $question) === 1 || trim($question) === '') {
            // L'alias éventuel (« je suis Patient A ») revient tel quel : la barrière le remplace par le vrai nom.
            preg_match('/(?:Patient|Proche|Soignant) [A-Z]+/', $question, $alias);
            $hello = 'Bonjour' . ($alias !== [] ? ' ' . $alias[0] : '') . ' !';

            return $staff
                ? $hello . ' Je peux vous résumer un patient, détailler votre tournée ou mettre en forme une transmission. Que souhaitez-vous faire ?'
                : $hello . ' Je peux vous donner vos prochains rendez-vous, vous aider à en prendre un ou vous expliquer vos résultats. Que souhaitez-vous faire ?';
        }

        return 'Mode démonstration locale : la réponse détaillée à cette question sera rédigée par l\'IA une fois le fournisseur configuré. '
            . 'Je peux déjà vous montrer vos rendez-vous, vos résultats ou vous aider à prendre un rendez-vous.';
    }

    /** @param list<array<string, mixed>> $messages */
    private static function intent(string $question, array $messages): string
    {
        if (AssistantIntent::wantsBooking($question)) {
            return 'book';
        }
        if (preg_match('/tourn[ée]e|mes passages|prochain patient/iu', $question) === 1) {
            return 'tour';
        }
        if (preg_match('/r[ée]sultats?|analyses?|bilan sanguin/iu', $question) === 1) {
            return 'results';
        }
        if (preg_match('/rendez-vous|\brdv\b|quand (passe|vient)|prochaine? visite/iu', $question) === 1) {
            return 'appointments';
        }

        return 'other';
    }

    /** @param array<string, mixed> $arguments */
    private static function call(string $name, array $arguments): array
    {
        return ['id' => 'mock_' . $name, 'name' => $name, 'arguments' => $arguments];
    }

    /**
     * @param list<array<string, mixed>> $messages
     * @return list<string>
     */
    private static function calledTools(array $messages): array
    {
        $names = [];
        $lastUser = self::lastUserIndex($messages);
        foreach ($messages as $i => $message) {
            if ($i <= $lastUser) {
                continue;
            }
            foreach ($message['tool_calls'] ?? [] as $toolCall) {
                $names[] = (string) ($toolCall['function']['name'] ?? '');
            }
        }

        return $names;
    }

    /**
     * Données du dernier outil de lecture (hors propose_action) appelé pour la question en cours.
     *
     * @param list<array<string, mixed>> $messages
     * @return array<string, mixed>
     */
    private static function lastToolData(array $messages): array
    {
        $lastUser = self::lastUserIndex($messages);
        $data = [];
        foreach ($messages as $i => $message) {
            if ($i <= $lastUser || ($message['role'] ?? '') !== 'tool') {
                continue;
            }
            $decoded = json_decode((string) $message['content'], true);
            if (is_array($decoded) && array_key_exists('items', $decoded)) {
                $data = $decoded;
            }
        }

        return $data;
    }

    /** @param list<array<string, mixed>> $messages */
    private static function lastUserIndex(array $messages): int
    {
        $index = -1;
        foreach ($messages as $i => $message) {
            if (($message['role'] ?? '') === 'user') {
                $index = $i;
            }
        }

        return $index;
    }

    /** @param list<array<string, mixed>> $messages */
    private static function lastUserText(array $messages): string
    {
        $index = self::lastUserIndex($messages);
        $content = $index >= 0 ? ($messages[$index]['content'] ?? '') : '';
        if (is_array($content)) {
            return implode(' ', array_map(static fn (array $p): string => (string) ($p['text'] ?? ''), $content));
        }

        return (string) $content;
    }
}
