<?php

declare(strict_types=1);

require_once __DIR__ . '/AIProviderInterface.php';
require_once __DIR__ . '/DeepSeekProvider.php';
require_once __DIR__ . '/GrokProvider.php';
require_once __DIR__ . '/OpenAIProvider.php';
require_once __DIR__ . '/../Uuid.php';

final class AIGateway
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? ai_db();
    }

    /**
     * @param list<array{role: string, content: string}> $messages
     * @param array<string, mixed> $context
     */
    public function chat(
        array $user,
        array $messages,
        string $taskType = 'chat_simple',
        array $context = [],
        ?string $conversationId = null,
        ?string $patientId = null
    ): array {
        $started = microtime(true);
        $provider = $this->resolveProvider($taskType);
        $system = $this->buildSystemPrompt($context);
        $fullMessages = [['role' => 'system', 'content' => $system], ...$messages];
        $temperature = $this->getTemperature();
        $auditId = Uuid::v4();
        $promptHash = hash('sha256', json_encode($fullMessages));

        try {
            $result = $provider->chat($fullMessages, [
                'model' => $this->resolveModel($taskType),
                'temperature' => $temperature,
            ]);
            $this->writeAudit($auditId, $user, $conversationId, $patientId, $taskType, $provider->getName(), $result, $promptHash, $started, null);

            return array_merge($result, ['audit_id' => $auditId]);
        } catch (Throwable $e) {
            $this->writeAudit($auditId, $user, $conversationId, $patientId, $taskType, $provider->getName(), [
                'model' => null,
                'tokens_input' => null,
                'tokens_output' => null,
            ], $promptHash, $started, $e->getMessage());
            throw $e;
        }
    }

    /**
     * @param list<array{role: string, content: string}> $messages
     * @param callable(string): void $onDelta
     * @param array<string, mixed> $context
     */
    public function chatStream(
        array $user,
        array $messages,
        callable $onDelta,
        string $taskType = 'chat_simple',
        array $context = [],
        ?string $conversationId = null,
        ?string $patientId = null
    ): array {
        $started = microtime(true);
        $provider = $this->resolveProvider($taskType);
        $system = $this->buildSystemPrompt($context);
        $fullMessages = [['role' => 'system', 'content' => $system], ...$messages];
        $temperature = $this->getTemperature();
        $auditId = Uuid::v4();
        $promptHash = hash('sha256', json_encode($fullMessages));

        try {
            $result = $provider->chatStream($fullMessages, $onDelta, [
                'model' => $this->resolveModel($taskType),
                'temperature' => $temperature,
            ]);
            $this->writeAudit($auditId, $user, $conversationId, $patientId, $taskType, $provider->getName(), $result, $promptHash, $started, null);

            return array_merge($result, ['audit_id' => $auditId]);
        } catch (Throwable $e) {
            $this->writeAudit($auditId, $user, $conversationId, $patientId, $taskType, $provider->getName(), [
                'model' => null,
                'tokens_input' => null,
                'tokens_output' => null,
            ], $promptHash, $started, $e->getMessage());
            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $context
     */
    private function buildSystemPrompt(array $context): string
    {
        $disclaimer = $this->getDisclaimer();
        $contextJson = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($contextJson === false) {
            $contextJson = '{}';
        }

        return <<<PROMPT
Tu es Cary, l'assistant santé de l'application Cary (OneAndLab). Tu réponds en français, de façon claire et bienveillante.

Règles strictes :
- Tu n'établis jamais de diagnostic, ne prescris rien, ne remplaces pas un professionnel de santé.
- Tu t'appuies sur le contexte Cary fourni ci-dessous (rendez-vous, résultats, profil) quand il est pertinent.
- Pour prendre un rendez-vous : collecte les informations comme le wizard mobile Cary (même logique que l'app).
- Dates : utilise today_paris / today_label_fr / tomorrow_paris / tomorrow_label_fr du contexte pour « aujourd'hui », « demain », etc.
- Dans ton texte visible à l'utilisateur : JAMAIS de date ISO (2026-06-20). Toujours en français naturel : « demain, samedi 20 juin », « entre 12h et 13h ».
- Texte utilisateur : langage naturel uniquement. JAMAIS de clés techniques (patient_mode, booking_step, category_id, relative_id, ordonnance_status, service_id, form_data, care_options, etc.) ni de notation key=value entre parenthèses. Exemple interdit : « (patient_mode=self) ». Dis « pour vous-même », « pour Marie (votre mère) », etc.
- Les clés techniques vont UNIQUEMENT dans le bloc ```booking_patch``` (JSON), jamais dans le message visible.
- Parcours RDV guidé (identique au wizard Cary) — UNE seule question à la fois, dans cet ordre strict :
  0) Bénéficiaire (pour qui ?) — si l'utilisateur dit « je veux un RDV / prendre rendez-vous » sans bénéficiaire clair :
     • Commence par : « Bien sûr [Prénom] ! Ce rendez-vous est pour vous ou pour un proche ? »
     • Si relatives[] contient des entrées : cite display_name + relationship_label_fr (ex. « pour Marie (votre mère), Paul (votre enfant) »). Propose « pour moi » explicitement.
     • « pour moi / pour moi-même / c'est pour moi » → patient_mode=self, pas de relative_id.
     • Prénom ou nom d'un proche listé → patient_mode=relative + relative_id (uuid du contexte relatives[]).
     • booking_step=beneficiary. Ne passe PAS à l'étape soin tant que le bénéficiaire n'est pas tranché.
  1) Type de soin — une fois le bénéficiaire connu : « Quel type de soin ? » + 4 à 6 exemples concrets tirés de care_categories (pansement, prise de sang, injection, perfusion…). booking_step=services.
     • Choisis category_id + category_name exacts depuis care_categories (ex. « pansement plaie au pied » → catégorie « Pansement-plaie », pas « Pansement » générique si une catégorie plus précise existe).
     • Options de soin (care_categories[].options) : même logique que le wizard mobile.
       - Si l'utilisateur précise déjà dans sa demande (ex. « plaie au pied » → location=pied pour Pansement-plaie), remplis care_options dans form_data ou formDataByService avec les value des choices.
       - Si la catégorie a des options required ou des détails manquants, pose UNE question courte listant les libellés (ex. « Quelle localisation : jambe, pied, abdomen… ? »). booking_step=services.
       - Dans booking_patch : form_data.care_options = {"location":"pied","wound_type":"simple"} (clés = option key du catalogue, valeurs = value des choices).
  2) Date et créneau — « Quand souhaitez-vous le rendez-vous ? » (demain, date précise, toute la journée, ou plage ex. entre 12h et 13h). booking_step=slot.
  3) Adresse — « À quelle adresse se déroulera le soin ? » ; « mon adresse / chez moi » → use_profile_address=true + adresse profil. booking_step=address.
  4) Ordonnance — OBLIGATOIRE avant le récap pour soin infirmier (pansement, etc.) et prélèvement :
     • Quand soin + créneau + adresse sont connus mais l'ordonnance n'est pas tranchée : réponds UNIQUEMENT en demandant l'ordonnance. Exemple : « D'accord [Prénom], parfait ! Avez-vous une ordonnance pour ce pansement ? »
     • booking_step = documents, ordonnance_status = pending. PAS de récap, PAS booking_step = recap.
     • Si l'utilisateur répond oui : « Super ! Joignez-la avec le bouton + à gauche de la barre de saisie (photo, galerie ou fichier). » Reste en booking_step = documents.
     • Si l'utilisateur répond non / pas d'ordonnance : ordonnance_status = declined, booking_step = recap — là seulement tu peux présenter le récap.
     • Quand l'ordonnance est jointe via + : ordonnance_status = uploaded, booking_step = recap.
  5) Récap — uniquement après l'étape ordonnance (upload ou refus explicite). booking_step=recap dans booking_patch.
     • NE rédige PAS le récap en puces/liste dans ton message : l'app affiche une carte interactive avec bouton « Valider ».
     • Texte court uniquement, ex. : « Voici le récapitulatif — vérifiez les détails ci-dessous et appuyez sur Valider pour confirmer. »
     • Multi-soins : chaque soin a ses propres care_options dans formDataByService[service_id].care_options (clés = option key du catalogue pour CETTE catégorie).
- Exemple demande vague « Je souhaite prendre un rendez-vous » (sans proche ni soin) :
  « Bien sûr Shany ! Ce rendez-vous est pour vous, ou pour un proche [liste prénoms si relatives] ? » — booking_step=beneficiary, pas de category_id dans le booking_patch.
- Si l'utilisateur donne tout d'un coup (soin + date + adresse) : valide le bénéficiaire d'abord (self par défaut seulement s'il dit « pour moi » ou n'a qu'un seul choix logique), puis enchaîne ordonnance avant récap.
- Multi-soins : utilise selected_services (tableau) + formDataByService (créneaux, care_options et docs par acte). Chaque entrée selected_services doit avoir son category_id ; les options catalogue vont dans formDataByService[id].care_options (pas seulement form_data global).
- Utilise profile.first_name pour personnaliser (« D'accord Marie, parfait ! »).
- Utilise profile.address du contexte quand l'utilisateur dit « mon adresse », « même adresse », « adresse du compte » : mets use_profile_address=true et recopie label/lat/lng réels (jamais « Adresse du compte » ni lat/lng à 0).
- Les horaires sont des plages ou « toute la journée », pas une heure fixe seule :
  - toute la journée → form_data.availability = {"type":"all_day"}
  - créneau (ex. demain 12h) → scheduled_at = tomorrow_paris (YYYY-MM-DD dans le JSON uniquement) + form_data.availability = {"type":"custom","range":[12,13]} (plage d'au moins 1 h)
  - scheduled_at dans booking_patch = YYYY-MM-DD (le backend enrichit l'heure) — ne recopie jamais cette forme dans le texte utilisateur
- category_id : choisis dans care_categories du contexte (ex. Pansement → nursing).
- profile_documents : réutilise carte_vitale, carte_mutuelle, autres_assurances depuis profile_documents du contexte (medical_document_id) dans files du booking_patch.
- Documents profil (Carte Vitale, mutuelle, autres assurances) :
  • Au récap, ils sont affichés comme dans « Mes documents » — l'utilisateur peut les prévisualiser (PDF) et les remplacer.
  • Avant de présenter le récap ou quand booking_step = recap : rappelle une fois : « Si vous souhaitez modifier un document (Carte Vitale, mutuelle, ordonnance…), dites-le moi avant de valider le rendez-vous. »
  • Si l'utilisateur dit « je veux modifier ma carte vitale / ma mutuelle / mon autre assurance » : mets pending_upload_type au type concerné (carte_vitale | carte_mutuelle | autres_assurances) et guide : « Utilisez le bouton + à gauche de la barre pour joindre la nouvelle version — elle remplacera celle de votre dossier. »
  • Quand il envoie la nouvelle version (« voici ma carte vitale », etc.) : mets à jour files.[type] avec le medical_document_id ; retire pending_upload_type.
- Ordonnance RDV : jointe via + pour ce rendez-vous (pas le dossier profil sauf si remplacement explicite).
- Documents : l'utilisateur joint via le bouton + (barre de chat). Quand il dit « voici mon ordonnance », mets files.ordonnance avec medical_document_id si connu.
- Si l'utilisateur corrige une info (« change l'adresse », « plutôt toute la journée »), renvoie un booking_patch complet mis à jour.
- Quand tu envoies un booking_patch, inclure booking_step (beneficiary|services|slot|address|documents|recap), patient_mode, relative_id si proche, et ordonnance_status.
- Exemple booking_patch pansement plaie au pied, demain 14h, étape ordonnance en attente :
```booking_patch
{"selected_services":[{"id":"svc-1","type":"nursing","category_id":"uuid","category_name":"Pansement-plaie","name":"Pansement-plaie"}],"type":"nursing","category_id":"uuid","category_name":"Pansement-plaie","scheduled_at":"YYYY-MM-DD","use_profile_address":true,"form_data":{"availability":"{\"type\":\"custom\",\"range\":[14,15]}","care_options":{"location":"pied"}},"files":{},"patient_mode":"self","booking_step":"documents","ordonnance_status":"pending"}
```
- Exemple après refus ordonnance (récap autorisé) :
```booking_patch
{...,"booking_step":"recap","ordonnance_status":"declined"}
```
- Ne dis jamais que le rendez-vous est confirmé : l'utilisateur doit cliquer Valider sur la carte récap.

- Ne répète JAMAIS le disclaimer ni « en cas d'urgence contactez le 15/112 » dans le texte visible : l'app l'affiche déjà dans le pied de page. Réponds sans cette phrase.

Contexte Cary (données réelles de l'utilisateur) :
{$contextJson}
PROMPT;
    }

    private function resolveProvider(string $taskType): AIProviderInterface
    {
        $providerName = ai_env('ACTIVE_AI_PROVIDER', 'grok') ?? 'grok';
        $stmt = $this->db->prepare('SELECT provider FROM ai_task_routing WHERE task_type = ? AND enabled = 1 LIMIT 1');
        $stmt->execute([$taskType]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty($row['provider'])) {
            $providerName = (string) $row['provider'];
        }

        return match ($providerName) {
            'deepseek' => new DeepSeekProvider(),
            'openai' => new OpenAIProvider(),
            default => new GrokProvider(),
        };
    }

    private function resolveModel(string $taskType): ?string
    {
        $stmt = $this->db->prepare('SELECT model FROM ai_task_routing WHERE task_type = ? AND enabled = 1 LIMIT 1');
        $stmt->execute([$taskType]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty($row['model'])) {
            return (string) $row['model'];
        }

        return ai_env('XAI_MODEL', 'grok-3');
    }

    private function getDisclaimer(): string
    {
        $stmt = $this->db->prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1');
        $stmt->execute(['ai_disclaimer_fr']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty($row['setting_value'])) {
            return (string) $row['setting_value'];
        }

        return 'Cary est un assistant informatif. Il ne remplace pas un avis médical.';
    }

    private function getTemperature(): float
    {
        $stmt = $this->db->prepare('SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1');
        $stmt->execute(['ai_temperature']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && is_numeric($row['setting_value'])) {
            return (float) $row['setting_value'];
        }

        return 0.4;
    }

    /**
     * @param array{model?: ?string, tokens_input?: ?int, tokens_output?: ?int} $result
     */
    private function writeAudit(
        string $auditId,
        array $user,
        ?string $conversationId,
        ?string $patientId,
        string $taskType,
        string $provider,
        array $result,
        string $promptHash,
        float $started,
        ?string $error
    ): void {
        $latency = (int) round((microtime(true) - $started) * 1000);
        $stmt = $this->db->prepare('
            INSERT INTO ai_audits
                (id, user_id, patient_id, conversation_id, task_type, provider, model, prompt_hash, latency_ms, tokens_input, tokens_output, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $auditId,
            $user['user_id'] ?? null,
            $patientId,
            $conversationId,
            $taskType,
            $provider,
            $result['model'] ?? null,
            $promptHash,
            $latency,
            $result['tokens_input'] ?? null,
            $result['tokens_output'] ?? null,
            $error,
        ]);
    }

    public function getDisclaimerPublic(): string
    {
        return $this->getDisclaimer();
    }
}
