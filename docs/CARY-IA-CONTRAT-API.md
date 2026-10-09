# Cary IA — contrat API (suppression, compte rendu, régénération)

Types partagés : `packages/shared-types/src/ai.ts` (`AiChatRequest`, `AiChatResponse.replaced_message_id`,
`AiConversationDeleteResponse`, `AiReport`). Erreurs JSON : `{ "success": false, "error": "<message FR>", "code": "<CODE>" }`.
Tests de référence : `backend/tests/ai/AiChatHttpTest.php`, `AiEndpointsHttpTest.php`, `AiChatServiceTest.php`,
`AiConversationServiceTest.php`.

## `DELETE /api/ai/conversations/{id}` — suppression définitive

Propriétaire uniquement. Plus de suppression logique : la conversation disparaît de la base.

Réponse `200` :

```json
{ "success": true, "data": { "deleted": { "messages": 3, "voice_sessions": 1, "drafts": 1 } } }
```

| Statut | `code` | Cas |
|--------|--------|-----|
| 400 | `VALIDATION_ERROR` | `id` n'est pas un UUID |
| 404 | `NOT_FOUND` | conversation inconnue ou d'un autre utilisateur |
| 409 | `AI_CONVERSATION_SYSTEM` | conversation système (fil « assistant santé ») : non supprimable |

Supprimé : messages, sources, résumés, liens de pièces jointes, sessions vocales de la conversation (messages,
transcriptions, événements temps réel), brouillons de rendez-vous non confirmés.
Conservé : les documents médicaux du dossier (une pièce jointe n'est qu'un lien vers eux), les brouillons confirmés
(trace du rendez-vous créé, détachés), les audits IA sans contenu (détachés), la note de feedback sans son commentaire.
Une trace `ai_conversation_deleted` (compteurs seulement) est écrite dans `access_logs`.

## `PATCH /api/ai/reports/{id}` — corriger un compte rendu dicté

Rôles du compte rendu (`AiReportService::ROLES`), auteur uniquement, tant que le statut est `draft`.

Corps : `{ "content_text": "texte corrigé" }` (chaîne non vide après `trim`, 10 000 caractères maximum).
Réponse `200` : `{ "success": true, "data": AiReport }` avec le texte corrigé. Le texte produit par l'IA reste
conservé côté serveur (`content_json.ai_text`).

| Statut | `code` | Cas |
|--------|--------|-----|
| 400 | `VALIDATION_ERROR` | `content_text` absent, vide ou non textuel ; `id` invalide |
| 400 | `AI_REPORT_TOO_LONG` | plus de 10 000 caractères |
| 403 | — | rôle non autorisé |
| 404 | `NOT_FOUND` | compte rendu inconnu ou d'un autre auteur |
| 405 | — | autre méthode que `PATCH` |
| 409 | `AI_REPORT_ALREADY_VALIDATED` | déjà validé ou publié |

Changement sur l'existant : `POST /api/ai/reports/{id}/validate` et `/publish` renvoient désormais `409`
(`AI_REPORT_ALREADY_VALIDATED`, `AI_REPORT_ALREADY_PUBLISHED`) au lieu de `404` quand le statut ne le permet plus ;
`404` est réservé au compte rendu inconnu ou d'un autre auteur.

## `regenerate_of` sur `POST /api/ai/chat` et `POST /api/ai/chat/stream`

Remplace la dernière réponse assistant sans recréer le message utilisateur.

```json
{ "conversation_id": "<uuid>", "regenerate_of": "<id de la dernière réponse assistant>", "client_message_id": "<uuid neuf>" }
```

- `message` n'est pas nécessaire : le serveur relance la question d'origine (texte et documents joints à l'époque).
- `medical_document_ids` est refusé (`400`).
- `client_message_id` : un UUID neuf par action « Régénérer ». Renvoyer la même requête (réseau coupé) rejoue la
  régénération déjà faite : `deduplicated: true`, même `message`, même `replaced_message_id`, aucun nouvel appel au modèle.
- Réponse : le contrat habituel de `/ai/chat` (`message`, `draft`, `disclaimer`, `audit_id`, `conversation`,
  `emergency`, `suggestions`, `deduplicated`) plus `replaced_message_id` = id de la réponse remplacée. Le client
  retire ce message et affiche `message` à sa place. Pour un envoi normal, `replaced_message_id` vaut `null`.
- En flux : erreurs de validation en HTTP simple avant l'ouverture du flux ; ensuite `start`, `delta`…, `done`
  (même charge que la réponse JSON, avec `replaced_message_id`), `end`. Si le modèle échoue : événement `error`,
  l'ancienne réponse reste en place.
- Question d'urgence : la régénération renvoie la réponse d'urgence fixe (15 / 112 / 3114), sans appel au modèle.

| Statut | `code` | Cas |
|--------|--------|-----|
| 400 | `VALIDATION_ERROR` | `regenerate_of` non UUID, documents fournis, `conversation_id` absent |
| 404 | `NOT_FOUND` | conversation d'un autre utilisateur, message inconnu, message utilisateur, réponse déjà remplacée |
| 409 | `AI_REGENERATE_NOT_LAST` | la réponse n'est plus la dernière de la conversation |
| 409 | `AI_REGENERATE_NOT_ALLOWED` | réponse sans question liée (message d'accueil, messages antérieurs à la migration 124) |
| 409 | `AI_MESSAGE_IN_PROGRESS` | même `client_message_id` en cours de traitement |

Côté client : proposer « Régénérer » uniquement sur la dernière réponse assistant ; sur `409`, masquer l'action.
