# Cary IA — Phase 1 : comment ça marche

Guide produit pour l’équipe et les testeurs. Décrit ce que fait l’assistant Cary **aujourd’hui** (Phase 1 — copilote intelligent), ce que vous pouvez lui demander, et ce qu’il ne fera **pas**.

---

## En une phrase

**Cary est un copilote connecté à votre dossier Cary** (rendez-vous, résultats labo, profil). Il répond en français, propose des actions utiles, et peut **préparer un rendez-vous dans le chat** — mais ne le crée **jamais** sans votre clic **Valider**.

---

## Où le trouver

| Rôle | Onglet mobile |
|------|----------------|
| Patient | **Assistant Cary** (onglet smiley) |
| Pro | Idem |
| Infirmier / infirmière | Idem |
| Préleveur | Idem |

Accès rapide depuis l’app :
- **Détail d’un RDV** → action « Demander à Cary »
- **Résultats labo** → appui long sur une carte → Cary avec contexte résultats

---

## Ce que Cary « sait » (contexte injecté)

À chaque message, le backend assemble un **contexte SQL** (pas de lecture de PDF, pas de RAG vectoriel en Phase 1) :

| Donnée | Patient | Pro / infirmier |
|--------|---------|-----------------|
| Profil (prénom, genre, ville…) | Vous + vos proches | Patient ciblé uniquement |
| RDV à venir / passés (≈ 30 j) | Oui | Vos patients accessibles |
| Derniers résultats labo (titre, date) | Oui | Idem périmètre |
| Documents récents (type, nom, date) | Oui | Idem |
| RDV en attente / docs manquants | Oui | Selon rôle |

**Garde-fou ACL :** un pro ne reçoit **jamais** le contexte d’un patient qui n’est pas dans son périmètre Cary.

Le modèle utilisé en prod : **Grok (xAI)**, via la passerelle unique `AIGateway` (extensible à d’autres fournisseurs plus tard).

---

## Ce que Cary peut faire (Phase 1)

### 1. Répondre avec vos vraies données

Exemples de questions utiles :

- « Quand est mon prochain rendez-vous ? »
- « Ai-je des résultats de labo récents ? »
- « Résume mes prochains RDV / mon suivi. »
- « J’ai reçu un résultat le 12 mars, que dois-je faire ensuite ? » *(orientation, pas interprétation médicale)*

Les chips en haut de conversation (**suggestions dynamiques**) s’adaptent à votre situation :
- RDV à venir → « Mon prochain RDV »
- Résultats récents → « Explique mes derniers résultats »
- Sinon → « Prendre un rendez-vous », « Question sur mon suivi », etc.

### 2. Vulgariser et accompagner (sans diagnostic)

Cary peut :
- expliquer un terme ou un parcours Cary ;
- vous aider à **préparer** un RDV (documents, rappels) ;
- reformuler une consigne de l’app de façon claire.

Cary **ne doit pas** :
- poser un diagnostic ;
- prescrire ou recommander un traitement ;
- remplacer un avis médical ;
- confirmer un RDV sans que vous ayez validé le récap.

Un **disclaimer** s’affiche sous le champ de saisie : *« Cary est un assistant informatif… En cas d’urgence, contactez le 15 ou le 112. »*

### 3. Préparer un rendez-vous dans le chat (§ 2.7)

Flux **obligatoire** :

```
Chat → brouillon IA → carte récap dans le fil → clic Valider → RDV créé
```

1. Vous dites par ex. : « Je veux un prélèvement mardi à Paris ».
2. Cary pose les infos manquantes (type, adresse, créneau, proche…).
3. Quand le brouillon est **prêt** : une **carte récap** apparaît dans la conversation.
4. Vous cliquez **Valider** → seulement là, Cary appelle `Appointment::create` (même logique que le wizard classique).
5. **Modifier** repasse en mode collecte ou ouvre le wizard pré-rempli.

**Important :** Cary ne crée **jamais** de RDV en arrière-plan. Pas de création silencieuse, pas de cron, pas de webhook IA.

| Rôle | Patient cible | Création patient |
|------|---------------|------------------|
| Patient | Soi ou proche | Non |
| Pro / infirmier | Patient existant ou **nouveau au Valider** | Oui, uniquement au confirm |

### 4. Conversations et historique

- **Nouvelle conversation** depuis le menu historique.
- Conversations **système** (créées à la demande) : *Mon Assistant Santé*, *Mes résultats*, *Mes rendez-vous*.
- Messages stockés en base (`ai_conversations`, `ai_messages`).
- Chaque appel LLM est tracé dans `ai_audits` (latence, tokens, erreurs).

---

## Exemples de prompts par profil

### Patient

| Intention | Exemple de message |
|-----------|-------------------|
| Prochain RDV | « Quand est mon prochain rendez-vous ? » |
| Résultats | « Explique mes derniers résultats de labo » *(métadonnées, pas le PDF)* |
| Nouveau RDV | « Je souhaite prendre un rendez-vous pour un prélèvement » |
| Préparation | « Prépare mon prochain RDV — que dois-je prévoir ? » |
| Proche | « C’est pour mon fils [prénom], un prélèvement jeudi » |

### Pro / infirmier

| Intention | Exemple de message |
|-----------|-------------------|
| RDV patient | « Planifier un RDV pour M. Dupont — prélèvement vendredi matin » |
| Nouveau patient | Donner nom, téléphone, adresse dans le fil → patient créé **au Valider** |
| Contexte dossier | Ouvrir Cary depuis la fiche patient ou un RDV (deep link) |

### Préleveur

Accès au hub Cary (chat + contexte limité au rôle). La **prise de RDV assistée** via brouillon IA est surtout orientée patient / pro / infirmier en Phase 1.

---

## Ce que Cary ne fait **pas** (Phase 1)

| Hors scope | Prévu plus tard |
|------------|-----------------|
| Lire le contenu des PDF / OCR | Phase 3 (RAG) |
| Apple Health, graphiques santé | Phase 2 |
| Recherche globale, cockpit admin | Phase 3–4 |
| Agent vocal, cron de suivi auto | Phase 4 |
| Qdrant / mémoire vectorielle | Phase 3 |
| Urgence labo Stripe automatique | Flux patient existant inchangé ; l’IA peut pré-remplir, pas contourner |

---

## Architecture simplifiée

```
App mobile (CaryAiHubScreen)
    ↓ POST /ai/chat ou /ai/chat/stream (SSE)
AIGateway + GrokProvider
    ↑ contexte JSON ← ContextComposer (SQL)
    ↓ réponse + éventuel bloc booking_patch
AiBookingService → ai_appointment_drafts
    ↓ clic Valider utilisateur
POST /ai/booking/drafts/{id}/confirm → Appointment::create
```

**Endpoints principaux :**

| Endpoint | Rôle |
|----------|------|
| `GET /ai/hub` | Disclaimer + suggestions |
| `GET /ai/quick-suggestions` | Chips dynamiques |
| `POST /ai/chat` | Message + réponse |
| `POST /ai/chat/stream` | Réponse en streaming |
| CRUD `/ai/conversations` | Historique |
| `POST /ai/conversations/ensure-system` | Assistant santé système |
| `/ai/booking/drafts/*` | Brouillon RDV |

---

## Bonnes pratiques pour tester / démo agence

1. **Compte patient** avec au moins un RDV à venir ou un résultat labo → les chips et les réponses seront plus parlantes.
2. Tester la question phare : *« Quand est mon prochain RDV ? »* → la réponse doit citer une **vraie date** de votre BDD.
3. Tester le booking : demander un RDV → vérifier la **carte récap** → **Valider** → vérifier le RDV dans l’onglet Rendez-vous.
4. Tester l’ACL pro : deux pros, deux patients différents — le pro A ne doit pas voir le contexte du patient du pro B.
5. Vérifier le disclaimer visible et qu’aucune réponse ne conclut par « votre RDV est confirmé » **sans** avoir cliqué Valider.

**Script de test prod (équipe technique) :**

```bash
./database/scripts/run-ai-phase1-tests-prod.sh
```

---

## FAQ rapide

**Cary lit-il mes analyses en PDF ?**  
Non en Phase 1. Il voit le **nom du fichier**, la **date**, la **catégorie** — pas le contenu biologique.

**Puis-je lui faire confiance pour un diagnostic ?**  
Non. Assistant informatif uniquement. En cas de doute ou urgence : professionnel de santé ou 15 / 112.

**Le RDV est-il pris dès que Cary a toutes les infos ?**  
Non. Il faut toujours **Valider** la carte récap.

**Les conversations sont-elles privées ?**  
Oui, liées à votre compte ; accès pro limité aux patients autorisés. Audits techniques côté serveur.

**Quelle clé / config serveur ?**  
`XAI_API_KEY`, `ACTIVE_AI_PROVIDER=grok`, `XAI_MODEL=grok-3` dans `.env` prod (voir `database/scripts/apply-migration-075-078-ai.sh`).

---

## Références code

- Hub mobile : `apps/mobile/src/features/ai-hub/`
- Backend IA : `backend/lib/ai/`
- API : `backend/api/ai/`
- Plan détaillé : `.cursor/plans/cary_v2_ia_phase1_copilot.plan.md`

*Document Phase 1 — copilote intelligent. Mis à jour après déploiement prod juin 2026.*
