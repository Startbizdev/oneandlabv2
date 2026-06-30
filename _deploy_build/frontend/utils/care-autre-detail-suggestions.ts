/**
 * Suggestions « Précisez » par soin (terminologie courante en France : biologie médicale, soins infirmiers à domicile).
 * Clés = `catalogSuggestionKey(nom)` (minuscule, sans accents, apostrophes / tirets / « / » normalisés).
 */

export function catalogSuggestionKey(name: string | null | undefined): string {
  if (name == null || String(name).trim() === '') return '';
  return String(name)
    .toLowerCase()
    .replace(/[''`]/g, ' ')
    .replace(/[/]+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

const SUGGESTIONS: Record<string, readonly string[]> = {
  'bilan sanguin': [
    'NFS complète avec formule leucocytaire (hémoglobine, hématocrite, VGM, CCMH, plaquettes)',
    'Numération plaquettaire seule / bilan hémostase si anticoagulant',
    'Bilan hépatique : ASAT, ALAT, GGT, PAL, bilirubine totale et conjuguée, albumine',
    'Bilan rénal : créatinine, urée, estim DFGe CKD-EPI, acide urique',
    'Ionogramme : sodium, potassium, chlorure, réserves alcalines (selon prescription)',
    'Bilan lipidique : cholestérol total, HDL, LDL, triglycérides (à jeun si indiqué)',
    'Glycémie à jeun et/ou HbA1c (glyquée)',
    'Bilan martial : fer sérique, ferritine, transferrine, CST',
    'Vitamine B12, folates (vitamine B9), homocystéine si prescrit',
    'Vitamine D 25-OH (calcidiol), calcium total et corrigé, phosphore, PTH si bilan os',
    'TSH ; si prescrite : T4 libre, T3 libre, anticorps anti-TPO',
    'CRP (C-réactive protéine), VS (vitesse de sédimentation)',
    'CRP ultra-sensible (suivi cardio-métabolique)',
    'Procalcitonine si infection sévère (prescription spécifique)',
    'Bilan de coagulation : TP INR, TCA, fibrinogène (pré-chir ou suivi AVK)',
    'D-dimères (embolie pulmonaire / thrombose — contexte et score clinique)',
    'Hémoculture sur 2 sites avant antibiotiques (fièvre / choc)',
    'Groupe sanguin ABO + Rhésus (RAI entente)',
    'Régularisation Rhésus / entente fœto-maternelle (prescription spécialisée)',
    'Troponine ultrasensible (douleur thoracique aiguë)',
    'CK et CK-MB ou suivi cardiaque prescrit',
    'BNP ou NT-proBNP (dyspnée / insuffisance cardiaque)',
    'PSA total et libre (indication et âge selon médecin)',
    'Bilan thyroïdien complet ou additif sur ordonnance',
    'Bilan hormonal : FSH, LH, œstradiol, testostérone (selon sexe et motif)',
    'Corticémie / ACTH ou autre bilan endocrinien indiqué sur papier',
    'Sérologie listériose / toxoplasmose / rubéole de type suivi grossesse (profil)',
    'Marqueurs tumoraux ciblés CA 19-9, CEA, AFP (prescription spécialisée)',
    'Électrophorèse des protéines sériques (recherche monoclonale)',
    'IgE spécifiques ou bilan allergique sanguin (aller-génie)',
    'Bilan nutrition ou suivi pré-opératoire combiné (ordre détaillé joint)',
    'Selon feuille de laboratoire jointe (code examens précis)',
  ],

  injection: [
    'Insulines : rapide (lispro, asparte), NPH, glargine, dégludec, glulisine — protocole scribe',
    'Anticoagulant : HBPM (énoxaparine, dalteparine, tinzaparine) — dose et durée notées',
    'Héparine non fractionnée en SC fractionnée (protocole)',
    'Antibiotique IM ou SC (molécule et posologie sur ordonnance)',
    'Antibiotique relais après hospitalisation',
    'Corticoïde IM ou SC (ex. méthylprednisolone, dérivé — indication aiguë)',
    'Vitamine B12 IM (carence documentée)',
    'Ironique IV ou IM selon prescription (Produits fer — service spécialisé si IV)',
    'G CSF (ex. filgrastim) — chimiothérapie ou indication spécifique',
    'Immunoglobulines polyclonales SC',
    'Ostéoprotecteur événementiel : acide zoledronique / dénosumab (lieu et circuit hospitalier)',
    'Méthotrexate SC (rhumatologie / dermatologie)',
    'Biothérapie SC : anti-TNF, anti-IL, anti-CD20 — délégué à plateau technique si besoin',
    'Vaccin hors calendrier habituel (prescription médicale précise)',
    'Antihistaminiques / corticoïdes pré-désensibilisation (protocole allergologue)',
    'Calcitonine / hormone ou analogue (prescription rare)',
    'Relaxine / autre péptides (très exceptionnel — feuille jointe)',
    'Depo-progestatif IM (si autorisé au cabinet ou à la structure)',
    'Gonadotrophines FSH/hMG (MAP — suivi centre)',
    'Sursaut corticotrope TRH (test stimul — uniquement structure adaptée)',
    'Antalgique majorant IM ponctuel (morphine SC/IM) protocole douleur / palliatif',
    'Antipsychotique dépôt IM (prescription psychiatre)',
  ],

  'mon bilan prevention': [
    'Bilan « cœur–vessie » : lipides, glycémie/HbA1c, fonction rénale, TA au cabinet',
    'Dépistage diabète : HbA1c ou glycémie selon facteurs de risque',
    'Bilan hépatique de contrôle après médicament, alcool ou surpoids',
    'NFS et bilan martial si fatigue ou régime restreint',
    'Vitamine D + calcium si ménopause / ostéoporose à risque',
    'TSH et si besoin billet thyroïdien sur antécédent familial',
    'Créatinine + DFGe âge > 60 ans ou IEC/diurétique',
    'Bilan pré-opératoire ambulatoire (liste du chirurgien transmise)',
    'Bilan avant VIH / IST si nouvelle exposition (orientation médecin)',
    'Sérologies hépatite B et C de contrôle vaccinal ou risque',
    'Région à risque : bilans métaboliques renforcés selon médecin',
    'Inscrire au carnet : poids, tour de taille, activité physique (objectifs prévention)',
    'Rappel dépistage cancer organisé ( sein / col / CCR ) selon âge liaison médecin',
    'Objectifs CV : LDL selon table de risque SCORE ou équation',
    'Dépistage carence B12 / folates végétarien strict / malabsorption',
    'Calcémie et PTH i si hypercalcémie familiale screening',
    'PSA argumenté uniquement si décision partagée (consignes collège)',
    'Bilan exploration anomalies biologiques déjà connues (ordonnance détaillée jointe)',
  ],

  'pansement plaie': [
    'Ulcère veineux jambe : désinfection douce, mousse + bande courte extensible, contention sur mesure',
    'Ulcère mixte artériel–veineux : protocole allégé selon avis médecin / Doppler',
    'Ulcère artériel : pansement non adhésif, pas de contention serrée sans validation',
    'Escarre stade II–IV : décharge locale, mousse hydrocellulaire, crème barrière',
    'Escarre sacrée déjà étalonnée / photographie pour suivi',
    'Post-op simple : film transparent ou hydrocolloïde selon exsudat',
    'Plaie béante infectée : mousse à fort pouvoir absorbant, prélèvement si demandé',
    'Brûlure superficielle < TBSA faible : pansement hydrogel / alginates si suintant',
    'Plaie diabétique pied à risque : inspection interdigitale, appareillage soulagement pointe de pression',
    'Fistule digestive / fuites autour de stomie : pâte, manchon, coupe poches spécifique',
    'Pansement trachéotomie (site propre, change tampon stérile si prescrit)',
    'Ablation méchage ou mèche superficielle (consigne chirurgien)',
    'Soin de plaie chirurgicale complexe avec vide (VAC / interface si structure)',
    'Plaie digitale ou main — immobilisation relative et EVA suivis',
    'Lésion dermatite sous gouttière / allergies pansement — identification produits',
    'Jusant suintant important : alginates de calcium puis couche secondaire',
    'Plaie sèche névrotique : interface lipidocollidoïde ou hydrogel',
    'Surveillance odeur / nécrose : signalement médecin relais',
    'Éducation autonomie patient ou aidant pour renouvellement intermédiaire',
    'Evaluation IPS / suivi photographique si programme IDEL coordonné',
  ],

  'examen des selles': [
    'Coproculture standard avec antibiogramme',
    'Recherche salmonelles et shigelles prolongée',
    'Parasitologie complète (œufs et parasites) sur 3 prélèvements J0 J2 J4',
    'Antigènes cryptosporidium / giardia selon contexte voyage',
    'Recherche sang occulte quantitative ou qualitative (dépistage ou suivi polype/cancer)',
    'Test Helicobacter pylori sur selles (antigène)',
    'Toxine A+B Clostridioides difficile (moins courant) selon laboratoire',
    'Culture Clostridioides difficile / PCR selon protocole local',
    'Calprotectine fécale (MICI différentielle si prescrit)',
    'Élastase pancréatique fécale (insuffisance pancréatique)',
    'Sang occulte immunologique spécifique humain (iFOBT)',
    'Identification rotavirus / norovirus PCR (contexte collectif / épidémie)',
    'Coproculture entéro-hémorragique EHEC sur contexte',
    'Recherche virus entériques panneau (prescription pédiatrique ou familiale)',
    'Conservation échantillon frigo / remise au labo sous 2 h si indiqué',
    'Prélèvement rectal sur écouvillon (protocole labo joint)',
  ],

  'soins de stomie': [
    'Colostomie : changement poche opaque, pastes hydrocolloïdes, ceinture éventuelle',
    'Iléostomie : poche transparente vidangée fréquemment, pastille péri-stomiale si brûlure',
    'Urostomie : robinet, adaptateur poche nuit, pH et mucus surveillés',
    'Mesure tracé collerette / découpe précise planche gabarit',
    'Irritation péri-stomiale : pâte protectrice + anneau éventré',
    'Protrusion sévère / parastomal hernia : contention souple + signalement chirurgien',
    'Séquence avant IRM : retirer poche métallique selon consigne',
    'Stomie temporaire post-cholécystectomie drain biliaire externe (si encadrement)',
    'Changement poche urostomie avec lavage mucus si encrassage',
    'Surveillance débit iléostomy déshydratation : signalement fréquentation médicale',
    'Stomie urostomie : son stent urinaire selon protocole urologue',
    'Fistule entourant stomie — interface spécifique wick',
    'Éducation autonomie patient : découvrir mesure, hygiène mains, produits',
    'Relais stomathérapeute HAD ou libéral si avis du chirurgien',
  ],

  'depistages infections': [
    'VIH : sérologie 4e génération ou combo Ag/Ac selon fenêtre',
    'VPH frottis cervico-vaginal / test HPV ADN (prescription gynécologique)',
    'Hépatite B surface Ag, anticorps anti-HBs, anticorps anti-HBc total',
    'Hépatite C : anticorps puis ARN si positif',
    'Syphilis : TPHA et VDRL ou tests treponémiques selon labo',
    'IST multiples : PCR vaginale / urinaire panneau Chlamydia Gonocoque Mycoplasma',
    'CMV IgG IgM (grossesse ou greffe)',
    'EBV sérologie mononucléose si contexte clinique',
    'Parasites sérologies bilharziose amibes selon voyage',
    'Tuberculose : IGRA QuantiFERON / IDR selon indication et âge',
    'Grippe / COVID-19 / VRS PCR nasopharyngée si prescription',
    'Leptospirose / Rickettsiose (contexte rural — rare)',
    'Borrelia si érythème migrant ou sérologie (interprétation spécialisée)',
    'Maladie à déclaration obligatoire : signalement biologique selon ARS',
    'Sérologie listériose si contexte materno-fœtal',
    'Chlamydia psittaci / Coxiella (contexte professionnel exceptionnel)',
  ],

  'epilation laser': [
    'Mentonnier / barbe partielle (homme, peaux phototypes à préciser par centre)',
    'Lèvre supérieure (femme)',
    'Aisselles',
    'Maillot échancré ou intégral prescription dermatologue / gynéco',
    'Demi-jambes ou jambes entières',
    'Cuisses / genoux / mollets',
    'Dos complet ou demi-dos',
    'Séances multiples : épilation alexandrite ou Nd:YAG selon phototype',
    'Folliculite chronique / trichites (accompagnement dermatologique)',
    'Hirsutisme : association bilan hormonal sur ordre médecin',
    'Pigmentation post-inflammatoire contre-indication relative — avis spécialiste',
    'Phototype élevé VI : laser spécifique à adressage centre qualifié',
    'Epilation révision poils incarnés cicatrisés chirurgie préalable',
    'Epilation zone transgénre (ordonnance ou parcours soin spécifique)',
    'Traitement par médicament photosensibilisant contre-indication temporaire',
  ],

  'examen des urines': [
    'Bandelette urinaire + sédiment si laboratoire combiné',
    'ECBU avec antibiogramme (milieu de jet après lavage)',
    'ECBU sur sonde ou collecte stérile SAD si porteur',
    'Cytologie urinaire (recherche cellules tumorales)',
    'Proteinurie des 24 heures ou albuminurie de 24 h',
    'Ratio albumine / créatinine urinaire spot (néphro)',
    'Ionogramme urinaire sur un prélèvement spécial',
    'Culture urinaire enfants sac plastique stérile',
    'Recherche calculs cristallographie sur filtrat si ordonnance',
    'Drogue de synthèse ou toxiques urinaires (cadre médico-légal spécial)',
    'Grossesse test urinaire (rare — plutôt sang) si consigne',
    'Chlamydia PCR urine premier jet homme',
    'Clairance créatinine urinaire 24 h',
    'Osmolalité urinaire bilan polyuro-polydipsie',
    'Marqueurs envahissement vessie (NMP22 etc.) prescription spécialiste',
  ],

  grossesse: [
    'Dosage quantitatif β-HCG (suivi évolutif GEU / ménace)',
    'Répétition β-HCG 48 h selon protocole',
    'Groupe Rhésus + anticorps irréguliers (RAI) premier trimestre',
    'Sérologie toxoplasmose IgG IgM suivi mensuel si séronégatif',
    'Sérologie rubéole (immunité) en début de grossesse',
    'Dépistage bactériurie asymptomatique ECBU',
    'T52 sérologies obligatoires + VIH si consent (parcours national)',
    'Bilan anémie : NFS ferritine si fatigue',
    'OGTT 24–28 SA si facteurs de risque diabète gestationnel',
    'Bilan métabolique avant anesthésie ou admission (prescription maternité)',
    'Sérologie CMV si risque professionnel spécifique',
    'Cholestase gravidique : bilan hépatique et acides biliaires prescrit',
    'Suivi anti-D prophylactique selon RAI et gestes (consigne maternité)',
    'Dépistage streptocoque B 35–37 SA (vagino-rectal)',
    'Microalbuminurie si HTA gravidique',
  ],

  perfusion: [
    'Perfusion sodium chlorure 0,9 % courte réhydratation',
    'Perfusion glucose 5 % si indication stricte',
    'Perfusion contrôle electrolytes KCl dilué (voie centrale ou périphérique selon médecine)',
    'Antibiothérapie IV à domicile relais hospitalier (pompe ou gravité selon protocole)',
    'Chimiothérapie IV (exclusivement centre ou HAD spécialisée)',
    'Immunoglobulines IV (structure hospitalière)',
    'Zoledronate ou bisphosphonates IV (plateau court séjour ou HAD)',
    'Fer injectable IV avec surveillance (service adapté)',
    'Morphine SC continue — pas perfusion libérale sans PCA médecin',
    'Changement de perfuseur électrique ambulatoire (consigne HAD)',
    'Entretien cathéter PICC ou PAC entièrement stérile',
    'Rinçage ou héparine lock de ligne implantable',
    'Nutrition entérale en continue via gastrostomie ou SONDE (autre fiche)',
    'Sérum salé hypertonique usage rare selon prescription réanimateur',
    'Arrêt perfusion selon fin de cure horodatage',
    'Test de compatibilité électrolytique avec autre voie si Y',
  ],

  'prelevement bacteriologique': [
    'Hémocultures sur deux sites température > 38,5 °C',
    'ECBU et milieu de jet',
    'Prélèvement gorge écouvillon streptocoque + culture',
    'PCR COVID + grippe + VRS selon prescription',
    'Expectoration qualifiée pour BK ou culture bactérienne',
    'Prélèvement plaie profonde après désinfection superficielle',
    'Écouvillon oreille / conduit auditif externe',
    'Prélèvement œil conjonctival (ophtalmologue)',
    'Liquide pleural / ascite ponctionnée sous écho (hôpital)',
    'LCR ponction lombaire (urgences / neurologie)',
    'Spermoculture en laboratoire spécialisé',
    'Coproculture (voir fiche selles) ou prélèvement rectal',
    'Recherche légionelle urines ou expectations (cadre spécialisé)',
    'Prélèvement vaginal ou cervical (gynécologue)',
    'Germes multirésistants dépistage rectal / auriculaire (consigne CH)',
  ],

  'retrait de points agrafes': [
    'Filaments simples cutanés visage après 5–7 jours selon consigne chirurgien',
    'Points peau tension faible membre supérieur',
    'Plaie genou / cheville — cicatrisation sans érythème',
    'Cicatrice abdominale post-césarienne ou laparotomie',
    'Agrafes cutanées thorax / sternum si feuille autorise IDE à domicile',
    'Retrait agrafes cuir chevelu (chir maxillo-facial)',
    'Enfant : retour secrétions ou rougeur — annulation et avis médecin',
    'Consommation anticoagulant : feuille valide date de retrait',
    'Points intradermiques résorbables — vérifier pas de point non résorbable',
    'Bijouterie cutanée implantée — non concerné sauf ordonnance rare',
    'Photodocumentation cicatrice si programme télésuivi',
  ],

  'soins d hygiene': [
    'Toilette complète au lit / douchette au lit',
    'Shampoing au lit + soin bouche simple',
    'Rasage sécurisé + coupe ongles diabète prudent',
    'Habillage / déshabillage avec charlotte de pudeur',
    'Réapprentissage douche avec siège et barres si ergothérapeute',
    'Change complet protections incontinence + crème barrière zinc',
    'Soin des plis cutanés (intertrigo prévention)',
    'Application laisse corporelle ou lait hydratant prescription dermatologique',
    'Mise en place bonnets / chaussons anti-chute temporaire',
    'Mobilisation passive légère au lit si kiné absent (strictement confort)',
    'Observation escarres naissantes lors du soin (signalement)',
    'Aide à la dentier prothèse et hygiène buccale',
    'Remplacement vêtements adaptés compression si prescrit',
    'Surveillance température axillaire après bain si fragile',
  ],

  'soins palliatifs': [
    'Mise en place ou suivi PCA morphique SC si médecin référent',
    'Antalgiques paliers OMS voie orale relayés si dysphagie',
    'Prévention escarre matelas air + repositionnement horaire',
    'Soins bouche sèche / hygiène confort aspiration douce',
    'Oxygénothérapie palliative bas débit si dyspnée (prescription)',
    'Sédation proportionnée uniquement service spécialisé',
    'Soutien psychologique famille : coordination avec équipe mobile',
    'Arrêt nutrition / hydratation : respect protocole collégial',
    'Secretions fin de vie : brochante / atropine selon médecin',
    'Signalement douleur mal évaluée EVA / ESAS',
    'Liaison médecin coordination HAD / MSP',
  ],

  'soins respiratoires': [
    'Bronchodilatateur dose-meter + chambre d’inhalation',
    'Aérosol brouillard salin ou bronchodilatateur nébuliseur',
    'Kiné respiratoire : drainage si ordonnance MPR',
    'Oxygénothérapie LN ou VMK débit prescrit SpO2 cible notée',
    'Surveillance SpO2 intermittente ou continue selon consigne',
    'Aspiration voie supérieure si dysphagie (formation spécifique)',
    'Ventilation non invasive BiPAP — uniquement HAD spécialisée ou réa',
    'Surveillance VM autonomie patient BPCO avec débit O2',
    'Éducation bon usage inhalateur vérifiable par checklist',
    'Signalement dyspnée aiguë fréquence respiratoire > 24',
  ],

  'sonde urinaire': [
    'Pose sonde urethrale à demeure taille CH 14–16 selon ordonnance',
    'Changement réglementaire ou complication (calcifications, infection)',
    'Pose sonde aseptique sur sonde à demeure bouchée',
    'Rétention aiguë : vidange puis laisser en demeure quelques jours',
    'Sonde gastrostomie NON — mauvais rubrique (préciser urinaire)',
    'Lavage vessie prudent si prescrit (volume faible)',
    'Surveillance urine trouble hématurie — laboratoire ECBU relais',
    'Mesure résidu post-mictionnel si appareil portable (rare DMT)',
    'Poche collectrice jour / nuit changement robinet hygiène',
    'Éducation entourage sur lavage mains et circuits fermés',
  ],

  'suivi diabete': [
    'Glycémie capillaire avant repas et coucher si schéma intensif',
    'Injection insuline rapide à l’aiguille stylo — rotation des sites',
    'Basale + bolus scolaire enfant sur protocole parents-IDE-école',
    'Hypoglycémie : consignes glucagon IM si entourage formé',
    'Éducation numération glucides et équivalences',
    'Surveillance pieds : monofilament déjà fait en CS ou à refaire',
    'Injection GLP-1 agoniste semaglutide dulaglutide si IDE autorisé localement',
    'Surveillance cétones si SGLT2 ou malade type 1 fébrile',
    'Relais lecture libre Flash / capteur — pas IDE médecin seul',
    'Bilan tensionnel et poids hebdo pour insulinorésistance',
  ],

  'suivi post hospitalisation': [
    'Pansement plaie opératoire J+2 / J+5 selon feuille de sortie',
    'Retrait agrafes 8–10 jours sauf contre-indication',
    'Injections anticoagulant relais AVK si pontage',
    'Surveillance drain sorti encore suintant (compression légère)',
    'Éducation signes de thrombose / infection post-orthopédie',
    'Prise en charge sonde vésicale laissée à domicile',
    'Soins trachéotomie temporaire (HAD rare — préciser cadre)',
    'Nouveau traitement biologique : vaccination avant si protocole',
    'Relais nutrition diététicien / IDE pour supplémentation',
    'Coordination IDE coordonnateur et assistant maternel si sortie ancien',
  ],

  'surveillance constante': [
    'TA / pouls allongé matin et soir sur carnet cible cœur',
    'Température axillaire si traitement anti cancer ou neutropénie',
    'Saturation + fréquence si BPCO sortie récente',
    'Glycémie capillaire programme post perfusion glucosé',
    'Diurèse horaire sur grille si insuffisance cardiaque décompensée',
    'Balance hydro–électrique si prescription néphro',
    'Poids quotidien si œdèmes declaratifs',
    'Signalement alerte score NEWS si formation acquise (rare domicile IDE seule)',
    'Observation neuro post AVC (TLR Glasgow simplifié)',
    'Surveillance apnées si suspicion SAS et oxymètre prescrit',
  ],

  traitement: [
    'Distribution sous blister sécurisé hebdomadaire',
    'Lecture ordonnance hospitalière vs domicile pour cohérence',
    'Injection SC domicile corticoïde ou hormonothérapie courte',
    'Éducation embout buccal ou inhalation entretien',
    'Préparation amorce dialyse péritonéale NON — autre service',
    'Médicaments réfrigérés chaîne du froid (insuline, biothérapie)',
    'Anti-cancéreux oraux Xeloda etc. prise horaire encadrée',
    'Antibiotiques discontinuation selon fin de cure notée',
    'Paracétamol cadre max 3 g / jours ou 4 si prescription',
    'SOS morphine orale buvable par protocole collège',
    'Observance préventive ostéoporose hebdomadaire',
    'Injection dépôt psychiatrique selon protocole infirmier + autorisation ARS locale',
    'Anticoagulants oraux AVK surveillés si auto-mesure INR — rare',
    'Vaccination opportunité même passage si autorisation médecin',
  ],

  vaccination: [
    'Vaccin grippe saisonnier inactivé IM deltoïde',
    'COVID-19 ARN ou sous-unitaire selon dispositif en cours',
    'rappel dTP coqueluche en cohorte cocooning grossesse',
    'Vaccin zona recombinant 2 doses (Shingrix) intervalle 2–6 mois',
    'Hépatite B accéléré 0 1 2 mois selon exposition professionnelle',
    'Vaccin encéphalite à tiques saisonnier zones endémiques',
    'Fièvre typhoïde / choléra voyage (centre de vaccinations)',
    'Encéphalite japonaise / fièvre jaune (agrément centres)',
    'Méningocoque ACYW si cartes d’entrée études USA',
    'HPV 9-valent selon calendrier élargi prescription',
    'BCG nouveau-né non réalisé en ville — exception service PMI',
    'Antivenimeux spécifique (rare)',
    'Rattrapage calendrier enfant sur ordonnance PMI / pédiatre',
    'Vaccin double viral ou trivalent rougeole oreillons rubéole si manquant adulte jeune',
  ],

  autre: [
    'Acte hors catalogue explicitement demandé par le médecin traitant',
    'Ordonnance papier ou PDF jointe avec code acte / mot clé laboratoire',
    'Demande entreprise / assurance — préciser référence dossier',
    'Acte lié essai clinique (protocole ECR) et coordinateur',
    'Soins avec matériel spécifique fourni par le patient',
    'Mission ponctuelle AVS / auxiliaire déjà planifiée — préciser chevauchement',
    'Téléconsultation préalable prévue — créneau à respecter',
    'Intervention nécessitant présence d’un tiers aidant formé',
    'Patient sous mesure d’office judiciaire — non spécifique mais signalement discret si besoin',
    'Demande urgences relatives sans AVP : orienter 15 / 114 selon consignes locales',
  ],
};

const EXTRA_KEYS: Record<string, string> = {
  bilan: 'bilan sanguin',
  sanguin: 'bilan sanguin',
  prevention: 'mon bilan prevention',
  biologique: 'bilan sanguin',
  panel: 'bilan sanguin',
  stomie: 'soins de stomie',
  stomiques: 'soins de stomie',
  laser: 'epilation laser',
  epilation: 'epilation laser',
  prelevement: 'prelevement bacteriologique',
  bacteriologique: 'prelevement bacteriologique',
  points: 'retrait de points agrafes',
  agrafes: 'retrait de points agrafes',
  hygiene: 'soins d hygiene',
  hygiène: 'soins d hygiene',
  respiratoires: 'soins respiratoires',
  urinaire: 'sonde urinaire',
  diabete: 'suivi diabete',
  diabète: 'suivi diabete',
  hospitalisation: 'suivi post hospitalisation',
  vaccin: 'vaccination',
  selles: 'examen des selles',
  urines: 'examen des urines',
  infections: 'depistages infections',
  depistages: 'depistages infections',
  injection: 'injection',
  perfusion: 'perfusion',
  grossesse: 'grossesse',
  traitement: 'traitement',
  surveillance: 'surveillance constante',
};

export function careAutreDetailSuggestionsForCategory(
  categoryName: string | null | undefined,
  categoryType?: string | null,
): string[] {
  const key = catalogSuggestionKey(categoryName);
  if (!key) return [...SUGGESTIONS.autre];

  if (SUGGESTIONS[key]) return [...SUGGESTIONS[key]];

  const alias = EXTRA_KEYS[key];
  if (alias && SUGGESTIONS[alias]) return [...SUGGESTIONS[alias]];

  const words = key.split(' ').filter(Boolean);
  for (const w of words) {
    const hit = EXTRA_KEYS[w];
    if (hit && SUGGESTIONS[hit]) return [...SUGGESTIONS[hit]];
  }

  if (categoryType === 'blood_test') {
    return dedupeStrings([...SUGGESTIONS['bilan sanguin'], ...SUGGESTIONS.autre.slice(0, 6)]);
  }
  if (categoryType === 'nursing') {
    return dedupeStrings([
      ...SUGGESTIONS['pansement plaie'],
      ...SUGGESTIONS.injection.slice(0, 8),
      ...SUGGESTIONS.autre.slice(0, 4),
    ]);
  }

  return [...SUGGESTIONS.autre];
}

function dedupeStrings(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const t = s.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
