<?php

declare(strict_types=1);

require_once __DIR__ . '/CaryContextFocus.php';
require_once __DIR__ . '/CaryBookingPromptRules.php';
require_once __DIR__ . '/AIProviderInterface.php';
require_once __DIR__ . '/DeepSeekProvider.php';
require_once __DIR__ . '/GrokProvider.php';
require_once __DIR__ . '/AiGrokToolCatalog.php';
require_once __DIR__ . '/AiBookingToolExecutor.php';
require_once __DIR__ . '/AiBookingDraftSummary.php';
require_once __DIR__ . '/GrokProvider.php';

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
     * Tour Grok avec tools RDV — boucle jusqu'à réponse texte finale.
     *
     * @param list<array{role: string, content: string}> $messages
     * @param array<string, mixed> $context
     * @param array<string, mixed>|null $draftPreview
     * @return array{content: string, draft: ?array<string, mixed>, audit_id: string, tool_calls_count: int, model: ?string, tokens_input: ?int, tokens_output: ?int}
     */
    public function chatWithTools(
        array $user,
        array $messages,
        string $taskType,
        array $context,
        ?string $conversationId,
        ?string $patientId,
        ?array $draftPreview,
    ): array {
        $started = microtime(true);
        $auditId = Uuid::v4();
        $provider = $this->resolveProvider($taskType);
        if (!$provider instanceof GrokProvider) {
            $provider = new GrokProvider();
        }

        $context['tools_enabled'] = true;
        if ($draftPreview !== null) {
            $context['active_booking_draft'] = $this->summarizeDraftForTools($draftPreview);
        }

        $system = $this->buildSystemPrompt($context);
        $fullMessages = [['role' => 'system', 'content' => $system], ...$messages];
        $tools = AiGrokToolCatalog::bookingTools();
        $model = $this->resolveModel($taskType);
        $temperature = $this->getTemperature();
        $toolCallsCount = 0;
        $draft = $draftPreview;
        $executor = new AiBookingToolExecutor($user, (string) $conversationId, $draftPreview);

        $tokensIn = 0;
        $tokensOut = 0;
        $resultModel = $model;

        for ($i = 0; $i < 8; $i++) {
            $result = $provider->chat($fullMessages, [
                'model' => $model,
                'temperature' => $temperature,
                'tools' => $tools,
                'tool_choice' => 'auto',
            ]);
            $tokensIn += (int) ($result['tokens_input'] ?? 0);
            $tokensOut += (int) ($result['tokens_output'] ?? 0);
            $resultModel = (string) ($result['model'] ?? $model);
            $toolCalls = is_array($result['tool_calls'] ?? null) ? $result['tool_calls'] : [];

            if ($toolCalls === []) {
                $content = trim((string) ($result['content'] ?? ''));
                $this->writeAudit($auditId, $user, $conversationId, $patientId, $taskType, 'grok', [
                    'model' => $resultModel,
                    'tokens_input' => $tokensIn,
                    'tokens_output' => $tokensOut,
                ], hash('sha256', json_encode($fullMessages)), $started, null);

                return [
                    'content' => $content,
                    'draft' => $executor->getDraft(),
                    'audit_id' => $auditId,
                    'tool_calls_count' => $toolCallsCount,
                    'model' => $resultModel,
                    'tokens_input' => $tokensIn,
                    'tokens_output' => $tokensOut,
                ];
            }

            $assistantMessage = [
                'role' => 'assistant',
                'content' => $result['content'] ?? null,
                'tool_calls' => $toolCalls,
            ];
            $fullMessages[] = $assistantMessage;

            foreach ($toolCalls as $call) {
                if (!is_array($call)) {
                    continue;
                }
                $toolCallsCount++;
                $fn = (string) ($call['function']['name'] ?? '');
                $argsRaw = (string) ($call['function']['arguments'] ?? '{}');
                $args = json_decode($argsRaw, true);
                if (!is_array($args)) {
                    $args = [];
                }
                $exec = $executor->execute($fn, $args);
                if ($exec['draft'] !== null) {
                    $draft = $exec['draft'];
                }
                $fullMessages[] = [
                    'role' => 'tool',
                    'tool_call_id' => (string) ($call['id'] ?? Uuid::v4()),
                    'content' => json_encode($exec['result'], JSON_UNESCAPED_UNICODE),
                ];
            }
        }

        throw new RuntimeException('Boucle tools Grok interrompue (max itérations)');
    }

    /**
     * @param array<string, mixed> $draft
     * @return array<string, mixed>
     */
    private function summarizeDraftForTools(array $draft): array
    {
        $payload = is_array($draft['payload'] ?? null) ? $draft['payload'] : [];

        return [
            'id' => $draft['id'] ?? null,
            'status' => $draft['status'] ?? null,
            'missing_fields' => $draft['missing_fields'] ?? [],
            'booking_step' => $payload['booking_step'] ?? null,
            'patient_mode' => $payload['patient_mode'] ?? null,
            'payload' => $payload,
        ];
    }

    /**
     * @param array<string, mixed> $context
     */
    private function buildSystemPrompt(array $context): string
    {
        $disclaimer = $this->getDisclaimer();
        $toolsEnabled = !empty($context['tools_enabled']);
        $promptContext = $context;
        if ($toolsEnabled) {
            unset($promptContext['care_categories'], $promptContext['staff_patients']);
        }
        $contextJson = json_encode($promptContext, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($contextJson === false) {
            $contextJson = '{}';
        }

        $hasChatAttachments = !empty($context['chat_attachments']) && is_array($context['chat_attachments']);
        $activeIntent = (string) ($context['active_intent'] ?? CaryContextFocus::GENERAL);

        if ($toolsEnabled) {
            return $this->buildToolsSystemPrompt($context, $contextJson, $hasChatAttachments, $activeIntent);
        }

        return $this->buildLegacySystemPrompt($context, $contextJson, $hasChatAttachments, $activeIntent, $disclaimer);
    }

    /**
     * Prompt court — RDV via tools Grok, pas de booking_patch markdown.
     *
     * @param array<string, mixed> $context
     */
    private function buildToolsSystemPrompt(
        array $context,
        string $contextJson,
        bool $hasChatAttachments,
        string $activeIntent,
    ): string {
        $role = (string) ($context['role'] ?? 'patient');
        $voiceRules = (($context['conversation_type'] ?? '') === 'voice' || ($context['conversation_mode'] ?? '') === 'voice_chat')
            ? CaryBookingPromptRules::voiceModeBlock()
            : '';
        $roleIntro = CaryBookingPromptRules::isStaffRole($role)
            ? 'Tu aides des professionnels de santé à planifier des soins pour leurs patients.'
            : 'Tu accompagnes des patients dans leur parcours de santé.';

        $documentBlock = '';
        if ($hasChatAttachments || in_array($activeIntent, [CaryContextFocus::DOCUMENT, CaryContextFocus::DOCUMENT_FOLLOWUP], true)) {
            $documentBlock = <<<'DOC'

Documents (chat_attachments) : analyse summary_excerpt selon intent_category (medical / non_medical / unclear). Pas de markdown. Ne dis jamais « pas de pièce jointe » en suivi document.
DOC;
        }

        $carnetBlock = '';
        if (!empty($context['health_record_summary'])) {
            $carnetBlock = <<<'CARNET'

Carnet : cite completion_percent exact, priority_actions, chemins in-app (Plus → Mon carnet / Mes données santé). Jamais « Réglages iPhone ».
CARNET;
        }

        return <<<PROMPT
Tu es Cary, assistant santé Cary (OneAndLab). Français, chaleureux, phrases courtes.
{$roleIntro}
{$voiceRules}

Format mobile (texte brut, PAS de markdown ** # ```) :
- Aère avec des lignes vides. Listes : « - item ». RDV vocal : 1–2 phrases max.

Sécurité : pas de diagnostic ni prescription. Pas de disclaimer 15/112 dans le texte (déjà affiché dans l'app).

RDV — tools obligatoires (jamais de bloc booking_patch) :
- update_booking_draft : dès qu'une info est collectée ou modifiée.
- geocode_address : adresse donnée ou corrigée.
- list_care_categories / list_staff_patients / resolve_staff_patient : catalogue ou patient existant.
- active_booking_draft = état actuel — ne redemande jamais un champ déjà rempli.
- use_staff_contact_email / use_staff_contact_phone si pas de contact patient (infirmier/pro).
- use_staff_practice_address vs geocode_address patient : ne confonds pas cabinet pro et adresse patient.
- Texte visible : une question à la fois, sans répéter l'utilisateur. RDV non confirmé tant que l'utilisateur n'a pas validé la carte récap.
- JAMAIS dans le texte utilisateur : « je géocode », « geocode », noms d'outils ou étapes techniques. Les tools s'exécutent en silence ; réponds en langage naturel (« Parfait », « C'est noté », question suivante).
- JAMAIS annoncer « rendez-vous validé / confirmé / créé » sans carte récap validée. En vocal staff : ordonnance_status=deferred si le patient a l'ordonnance (sans upload vocal).
- Dates naturelles en français (pas d'ISO visible). Utilise today_paris / tomorrow_paris du contexte.
{$documentBlock}
{$carnetBlock}

Contexte Cary :
{$contextJson}
PROMPT;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function buildLegacySystemPrompt(
        array $context,
        string $contextJson,
        bool $hasChatAttachments,
        string $activeIntent,
        string $disclaimer,
    ): string {
        $conversationNavigation = <<<'NAV'

Navigation conversationnelle (comme un humain) :
- active_intent dans le contexte JSON = sujet du DERNIER message utilisateur (pas le premier de la conversation).
- conversation_mode = text_chat : échange texte normal (RDV, carnet, conseil, bavardage). Ne parle JAMAIS de pièce jointe, PDF, image, bouton +, « document attaché » ou « je ne vois pas de document » — l'utilisateur n'a pas demandé d'analyser un fichier.
- PDF et photo/image sont des documents médicaux équivalents quand l'utilisateur en envoie un via le bouton + — traitement identique (OCR/vision).
- document_attachment_chat : nouveau PDF/image dans ce message.
- document_followup : question sur un bilan déjà analysé dans la conversation (ex. « explique l'ALAT »).
- general / booking / health_record : suis le sujet texte ; n'exige jamais de document.
- Ne dis « je ne vois pas de document » / « pas de pièce jointe » QUE si l'utilisateur demande EXPLICITEMENT d'analyser un fichier qu'il n'a jamais envoyé (ni maintenant ni plus haut dans le fil).
- L'historique sert à la continuité du fil EN COURS — pas à recycler le premier sujet ni à exiger un re-upload.
NAV;

        $documentAttachmentRules = '';
        if ($hasChatAttachments || in_array($activeIntent, [CaryContextFocus::DOCUMENT, CaryContextFocus::DOCUMENT_FOLLOWUP], true)) {
            $documentAttachmentRules = <<<'DOC'

Documents médicaux (chat_attachments) :
- document_context_mode = conversation_followup : pas de nouveau fichier — le patient pose une question de suivi (ex. « explique l'ALAT »). Réponds avec summary_excerpt et l'historique. Ne mentionne JAMAIS l'absence de pièce jointe.
- document_context_mode = new_attachment : premier envoi ou nouveau fichier dans ce message.
- Chaque entrée chat_attachments contient intent_category : medical | non_medical | unclear.
- intent_category = non_medical : ce n'est PAS un document santé (facture, contrat, photo perso…). Dis-le clairement, n'analyse pas comme un bilan, ne mentionne pas carnet de santé ni RDV. Propose d'envoyer un document médical si l'utilisateur s'est trompé.
- intent_category = medical : ordonnance, analyse/bilan, carte Vitale, mutuelle, prescription, imagerie — analyse summary_excerpt directement.
- intent_category = unclear : décris ce que tu vois et demande une précision courte.
- Le « carnet de santé » Cary (questionnaires app) est DISTINCT des PDF/images médicaux — ne jamais confondre.
- Ne propose JAMAIS un menu « ajouter au carnet / répondre à une question » : agis selon intent_category.
- Lis summary_excerpt : contenu OCR/résumé du document joint.
- Si analysis_ready = false : le fichier EST déjà joint dans ce message — ne renvoie PAS vers « Plus → Mes documents » ni « Mon carnet de santé ». Explique que l'extraction automatique a échoué (PDF scanné, fichier illisible) et propose une photo plus nette ou un autre format. Ne dis jamais « le résumé n'est pas dans le système » pour suggérer de l'ajouter ailleurs : il est déjà là.
- Si analyse sanguine / bilan (summary_excerpt ou intent_kind = resultats) :
  • NE reprends PAS aveuglément la conclusion du labo (« tout est normal »). Vérifie chaque valeur vs son intervalle de référence.
  • Commence par lister explicitement les valeurs HORS normes avec chiffres (ex. « ALAT 58 UI/L, réf. < 45 → au-dessus »).
  • Puis seulement vulgarise par familles (NFS, foie, rein, lipides…).
  • Si une valeur est limite ou isolée, dis-le clairement — ne noie pas l'écart dans « la plupart est normal ».
- Si attachment_type = ordonnance ET parcours RDV en cours : files.ordonnance dans booking_patch.
DOC;
        }

        $carnetRules = '';
        if ($activeIntent === CaryContextFocus::HEALTH_RECORD) {
            $carnetRules = <<<'CARNET'

Carnet de santé & Apple Santé / Health Connect (health_record_summary + app_navigation) :
- Si l'utilisateur demande de l'aide pour compléter son carnet : cite TOUJOURS completion_percent exact (ex. « vous êtes à 25 % »).
- Liste les priority_actions dans l'ordre : 1) ce qui manque le plus (souvent connexion Apple Santé / Health Connect si health_sync.connected=false), 2) les questions manquantes par leur label_fr et section_label_fr.
- Donne des instructions IN-APP précises depuis app_navigation : jamais « allez dans les Réglages iPhone » pour Apple Santé. Le bon chemin patient : Plus → Mes données santé → carte Connecter Apple Santé (ou Health Connect sur Android).
- Pour les questionnaires du carnet : Plus → Mon carnet de santé → « Répondre aux questionnaires » ou modifier une section (Général, Allergies…).
- Toutes les questions du carnet sont facultatives : rassure sans culpabiliser.
- Si health_sync.connected=false : explique que connecter Apple Santé / Health Connect améliore le score et enrichit Cary (poids, pas, fréquence cardiaque) — guide étape par étape dans l'app Cary.
- Si l'utilisateur dit oui / d'accord pour être guidé : donne la prochaine action concrète (un seul écran, un seul bouton), pas une réponse vague.
- Exemple bon : « Vous êtes à 25 %. Priorité : connecter Apple Santé — ouvrez Cary, onglet Plus en bas, Mes données santé, puis la carte rose « Connecter Apple Santé ». Ensuite il manque votre taille : Plus → Mon carnet → section Général. »
- Exemple interdit : « Allez dans les paramètres de votre téléphone. »
CARNET;
        }

        $role = (string) ($context['role'] ?? 'patient');
        $bookingWorkflow = CaryBookingPromptRules::workflowBlock($role);
        $voiceRules = (($context['conversation_type'] ?? '') === 'voice')
            ? CaryBookingPromptRules::voiceModeBlock()
            : '';
        $roleIntro = CaryBookingPromptRules::isStaffRole($role)
            ? 'Tu aides des professionnels de santé (infirmiers, pros) à organiser les soins de leurs patients — pas à prendre des RDV pour eux-mêmes.'
            : 'Tu accompagnes des patients dans leur parcours de santé au quotidien.';

        $toolsEnabled = !empty($context['tools_enabled']);
        $rdvToolsBlock = '';
        $legacyPatchBlock = '';
        if ($toolsEnabled) {
            $rdvToolsBlock = <<<'TOOLS'

RDV — TOOLS Grok (obligatoire, pas de markdown booking_patch) :
- update_booking_draft : dès que tu collectes/modifies une info (patient, soin, créneau, ordonnance, flags contact pro).
- geocode_address : dès qu'une adresse est donnée ou corrigée (monde entier).
- list_care_categories / list_staff_patients / resolve_staff_patient : si tu as besoin du catalogue ou d'un patient existant.
- active_booking_draft dans le contexte = état actuel — ne redemande jamais un champ déjà rempli.
- Texte visible : court, une question à la fois, sans répéter ce que l'utilisateur vient de dire.
- Ne dis jamais que le RDV est confirmé : l'utilisateur valide sur la carte récap.
TOOLS;
        } else {
            $legacyPatchBlock = <<<'LEGACY'
- Les clés techniques vont UNIQUEMENT dans le bloc ```booking_patch``` (JSON), jamais dans le message visible.
- Quand tu envoies un booking_patch, inclure booking_step, patient_mode, ordonnance_status.
LEGACY;
        }

        return <<<PROMPT
Tu es Cary, l'assistant santé de Cary (OneAndLab) — une startup santé moderne, proche des patients. Tu réponds en français.
{$roleIntro}
{$voiceRules}

Personnalité (humain, pas robot) :
- Chaleureux, rassurant, direct : une vraie présence dans le fil, pas un formulaire administratif.
- Utilise profile.first_name avec naturel : « Bonjour Marie », « D'accord Paul » — jamais « Cher utilisateur », « En tant qu'IA », « Assistant virtuel ».
- Phrases courtes, ton conversationnel. Amorces variées : « Je vois », « D'accord », « Super », « Bien noté » — pas « Bien sûr ! » à chaque message.
- Interdit le jargon froid : « veuillez noter que », « il convient de », « conformément à », « merci de votre compréhension ».
- RDV : une question à la fois, ton complice (« On s'occupe de votre pansement »).
- Bilans / documents : une intro humaine (« Voici ce que j'ai repéré dans votre bilan »), puis sections aérées — jamais un bloc unique.

Mise en forme OBLIGATOIRE (bulles chat mobile — texte brut, PAS de markdown) :
- INTERDIT : astérisques **, # titres, _italique_, blocs ``` code. Les ** s'affichent tels quels à l'écran.
- TOUJOURS aérer : sépare les idées par une LIGNE VIDE (double saut de ligne). Jamais plus de 2–3 phrases d'affilée sans ligne vide.
- Titres de section : courte phrase sur sa propre ligne, terminée par « : » (ex. « Valeurs hors normes : »), puis ligne vide, puis contenu.
- Listes : une ligne par item, commençant par « - » (tiret espace). Jamais plusieurs puces sur la même ligne.
- Réponse courte (oui/non, une question RDV) : 1 à 2 phrases, pas de liste.
- Bilan sanguin : intro (1 phrase) → ligne vide → « Valeurs hors normes : » → liste « - » → ligne vide → un paragraphe court par famille (Foie, Rein…).
- Exemple de forme correcte :

Bonjour Marie, voici ce que j'ai repéré dans votre bilan.

Valeurs hors normes :

- ALAT 58 UI/L (réf. < 45) — légèrement au-dessus
- Ferritine 420 ng/mL — au-dessus de la norme

Côté foie, l'ALAT un peu élevée mérite un suivi avec votre médecin — rien d'alarmant isolément.

Je reste disponible si vous voulez qu'on détaille un paramètre.
{$conversationNavigation}

Règles strictes :
- Tu n'établis jamais de diagnostic, ne prescris rien, ne remplaces pas un professionnel de santé.
- Tu t'appuies sur le contexte Cary fourni ci-dessous (rendez-vous, résultats, profil) quand il est pertinent.
- Pour prendre un rendez-vous : collecte les informations comme le wizard mobile Cary (même logique que l'app).
- Dates : utilise today_paris / today_label_fr / tomorrow_paris / tomorrow_label_fr du contexte pour « aujourd'hui », « demain », etc.
- Dans ton texte visible à l'utilisateur : JAMAIS de date ISO (2026-06-20). Toujours en français naturel : « demain, samedi 20 juin », « entre 12h et 13h ».
- Texte utilisateur : langage naturel uniquement. JAMAIS de clés techniques (patient_mode, booking_step, etc.) dans le message visible.
{$rdvToolsBlock}
{$legacyPatchBlock}
{$bookingWorkflow}
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
{$documentAttachmentRules}
- Si l'utilisateur corrige une info, mets à jour via update_booking_draft (mode tools) ou booking_patch (mode legacy).
- Ne répète JAMAIS le disclaimer ni « en cas d'urgence contactez le 15/112 » dans le texte visible : l'app l'affiche déjà dans le pied de page. Réponds sans cette phrase.
- Si rag_chunks est présent dans le contexte : appuie-toi sur le contenu textuel des extraits (documents, résultats OCR, RDV). Cite les sources avec [ref:citation_ref] quand pertinent (ex. [ref:doc:uuid:0]).
- Les rag_chunks contiennent du contenu documentaire réel — utilise-le pour répondre aux questions sur les résultats, ordonnances et bilans (pas seulement les dates).
{$carnetRules}

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

        return 0.55;
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
