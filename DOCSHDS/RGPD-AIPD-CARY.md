# Cary : analyse d'impact relative à la protection des données (AIPD)

> **Brouillon à valider par ZENFACT SAS.** Il suit la méthode de la CNIL : description du traitement, nécessité et proportionnalité, risques, mesures. Il peut être repris dans l'outil PIA de la CNIL.

**Responsable de traitement :** ZENFACT SAS — contact@cary.bio
**Traitement étudié :** plateforme Cary de prise de rendez-vous de soins et de prélèvements à domicile, avec dossier de santé du patient.

---

## 1. Pourquoi une AIPD

Le traitement porte sur des **données de santé** (catégorie particulière, article 9 RGPD), concernant des personnes potentiellement **vulnérables** (patients soignés à domicile, personnes âgées), avec un volume appelé à croître. Au moins deux critères des lignes directrices européennes sont réunis : l'AIPD est donc appropriée.

## 2. Description du traitement

- **Finalités :** prise de rendez-vous à domicile ; attribution à un professionnel ; dossier de santé et documents du patient ; commandes en pharmacie ; coordination entre soignants.
- **Personnes concernées :** patients et leurs proches, professionnels de santé, personnel des laboratoires.
- **Données :** identité et coordonnées ; n° de sécurité sociale ; rendez-vous et types de soins ; ordonnances, résultats d'analyses, cartes Vitale et mutuelle ; carnet de santé, constantes, transmissions ; données de santé connectées avec l'accord du patient.
- **Durées :** voir le registre des traitements.
- **Hébergement :** AWS, région Paris, infrastructure certifiée HDS. Documents sur AWS S3 Paris.
- **Sous-traitants :** AWS, Brevo, Twilio, Expo, Google Maps, xAI, Stripe, Apple, Google.

## 3. Nécessité et proportionnalité

| Principe | Mise en œuvre |
|---|---|
| Finalités déterminées | Limitées à l'organisation des soins à domicile et au suivi du patient. |
| Minimisation | Chaque professionnel ne voit que les patients avec lesquels il a un lien réel (rendez-vous, lien de soin, commande pharmacie). Une pharmacie lit les documents d'une commande mais ne peut pas les modifier. |
| Base légale | Contrat ; article 9.2.h RGPD (prise en charge sanitaire) ; consentement pour les données connectées. |
| Information | Politique de confidentialité publiée sur cary.bio. |
| Droits des personnes | Exercice à contact@cary.bio ; suppression du compte en libre-service dans l'application. |
| Durées limitées | Définies par traitement, alignées sur les référentiels CNIL. |
| Transferts hors UE | Messages courts (notifications) et assistant IA en rétention zéro, avec pseudonymisation préalable ; aucun stockage de données de santé hors de l'infrastructure HDS. |

## 4. Risques et mesures

| Risque | Sources possibles | Mesures en place | Gravité résiduelle | Vraisemblance résiduelle |
|---|---|---|---|---|
| **Accès illégitime** aux données de santé | Piratage, compte volé, professionnel sans lien avec le patient | Chiffrement AES-256 de chaque donnée et document ; contrôle des droits côté serveur selon le lien réel avec le patient ; limitation des tentatives de connexion ; codes et mots de passe hachés ; journal de chaque accès ; pare-feu, en-têtes de sécurité, SSH par clé uniquement ; test d'intrusion interne ; supervision avec alertes | Importante | Limitée |
| **Modification non désirée** des données | Erreur, malveillance | Droits d'écriture limités par rôle (lecture seule pour la pharmacie, par exemple) ; historique des versions des documents (30 jours) ; journal des accès | Limitée | Limitée |
| **Disparition** des données | Panne, suppression, rançongiciel | Sauvegarde quotidienne chiffrée hors du serveur, que le serveur ne peut ni lire ni effacer ; test de restauration mensuel ; documents versionnés sur S3 ; clés dans le coffre-fort AWS | Importante | Négligeable |

## 5. Plan d'action

| Action | État |
|---|---|
| Chiffrement, contrôle d'accès, journal des accès | ✅ En place |
| Sauvegardes chiffrées, testées, protégées contre l'effacement | ✅ En place |
| Supervision et alertes | ✅ En place |
| Durcissement du serveur (pare-feu, SSH, en-têtes) | ✅ En place |
| Assistant IA en rétention zéro, avec pseudonymisation | ✅ En place |
| Durées de conservation automatisées (assistant, comptes inactifs avec avertissement) | ✅ En place |
| Archivage intermédiaire des dossiers de santé (au-delà de 5 ans) | À faire avant la première échéance (2031) |
| Contrats de sous-traitance (DPA) signés avec chaque prestataire | À vérifier par la société |
| Test d'intrusion par un prestataire indépendant | Optionnel, avant un grand compte ou une levée de fonds |

## 6. Validation

| | |
|---|---|
| Rédigé par | Startbiz LLC (prestataire de développement) |
| Validé par | ____________________, pour ZENFACT SAS |
| Date de validation | ____ / ____ / ________ |
| Prochaine révision | Un an après validation, ou à chaque évolution majeure du traitement |
