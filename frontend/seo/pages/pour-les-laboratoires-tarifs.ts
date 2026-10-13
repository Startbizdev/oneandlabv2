import type { SeoEditorialArticle } from '../types'

const article: SeoEditorialArticle = {
  path: '/pour-les-laboratoires/tarifs',
  title: 'Tarifs laboratoires Cary : offre gratuite, Starter à 49 € et Pro à 129 €',
  description:
    'Comparez les offres laboratoire Cary : démarrage gratuit, Starter à 49 € par mois pour une petite équipe, Pro à 129 € par mois pour plusieurs équipes et sous-comptes, avec essai de 30 jours.',
  keywords:
    'tarif laboratoire Cary, abonnement labo prélèvement domicile, Starter 49 €, Pro 129 €, offre gratuite laboratoire',
  breadcrumbs: [
    { name: 'Accueil', path: '/' },
    { name: 'Pour les laboratoires', path: '/pour-les-laboratoires' },
  ],
  sections: [
    {
      title: 'Une grille tarifaire pensée pour monter en charge progressivement',
      paragraphs: [
        'Choisir un abonnement pour un laboratoire n’a rien d’anodin. Vous engagez un budget récurrent, vous définissez le nombre de collaborateurs qui travailleront dans l’outil, et vous devez pouvoir évoluer si le volume à domicile augmente. Cary propose trois niveaux clairement distincts : une offre de découverte à 0 € par mois pour ouvrir l’espace, une offre Starter à 49 € par mois pour une petite équipe, et une offre Pro à 129 € par mois pour coordonner plusieurs équipes et sites. Cette page explique à qui s’adresse chaque niveau, ce qui change concrètement au quotidien, et comment l’essai ainsi que la résiliation fonctionnent.',
        'Les montants indiqués ici sont ceux présentés sur la page tarifs laboratoires de Cary. Ils ne sont pas inventés pour l’exercice éditorial : Starter correspond à 49 € par mois, Pro à 129 € par mois, et la découverte reste gratuite. Avant de souscrire, vous pouvez lire aussi la page générale pour les laboratoires afin de comprendre le métier couvert (demandes, préleveurs, tournées). Le tarif n’a de sens que rapporté à ce que vous organisez réellement.',
        'Enfin, un abonnement Cary pour laboratoire se gère depuis l’espace dédié, avec un paiement mensuel par carte via Stripe. Vous n’êtes pas enfermé dans un engagement opaque. L’annulation et le changement d’offre sont conçus pour suivre la réalité de votre activité, qui peut accélérer un trimestre puis se stabiliser le suivant.',
      ],
    },
    {
      title: 'L’offre découverte à 0 € : ouvrir l’espace sans friction',
      paragraphs: [
        'L’offre découverte permet d’ouvrir votre espace laboratoire gratuitement. Elle sert à entrer dans l’environnement Cary, à préparer le dossier et à comprendre le fonctionnement avant d’ajouter des préleveurs de façon structurée. C’est le bon point d’entrée si vous validez encore l’intérêt du domicile pour votre zone, ou si vous voulez que le référent laboratoire prenne en main l’interface sans pression budgétaire immédiate.',
        'En pratique, la découverte ne remplace pas une organisation d’équipe complète. L’ajout de préleveurs nécessite de passer sur Starter ou Pro, et les sous-comptes sont inclus dans Pro. Autrement dit, le gratuit sert à démarrer et à explorer, pas à faire tourner indéfiniment une flotte de préleveurs comme si l’outil était déjà dimensionné pour une activité multi-équipes. Cette frontière évite les fausses attentes : vous savez dès le départ ce qui est inclus à 0 € et ce qui demande une offre payante.',
        'Beaucoup de structures utilisent cette étape pour aligner leurs process internes. Qui validera les demandes ? Qui formera les préleveurs ? Quelle zone de couverture déclarer ? Une fois ces réponses posées, le passage à Starter ou Pro devient un choix opérationnel, pas un saut dans le vide. Vous avez déjà vu l’espace, vous savez où cliquer, et vous savez ce que vous voulez débloquer ensuite.',
      ],
    },
    {
      title: 'Starter à 49 € par mois : organiser une petite équipe',
      paragraphs: [
        'L’offre Starter est tarifée à 49 € par mois. Elle s’adresse aux laboratoires qui veulent organiser les prélèvements d’une petite équipe. Dans la présentation officielle des plans, Starter inclut jusqu’à deux préleveurs, la gestion et l’attribution des rendez-vous, un calendrier partagé et des statistiques essentielles. C’est le niveau le plus fréquent lorsqu’un laboratoire lance vraiment le domicile avec un ou deux professionnels dédiés.',
        'À 49 € par mois, le calcul est simple à mettre en regard du coût d’un rendez-vous mal coordonné. Une seule tournée mal assignée, un créneau perdu faute de confirmation, ou une demi-journée de préleveur sous-utilisé pèsent vite davantage que l’abonnement. Starter existe pour sortir du mode artisanal (appels croisés, tableur du vendredi soir) tout en restant accessible pour une structure qui n’a pas encore une armée de collaborateurs sur le terrain.',
        'Concrètement, Starter vous aide à voir qui fait quoi. Vous attribuez les rendez-vous, vous partagez le calendrier, vous suivez l’essentiel de l’activité. Vous n’avez pas encore besoin de sous-comptes illimités ni du panier complet des statistiques avancées : vous avez besoin que deux préleveurs et un référent laboratoire vivent dans le même outil sans se marcher dessus. Lorsque cette base tient, vous pouvez décider plus sereinement si le passage à Pro est justifié.',
      ],
    },
    {
      title: 'Pro à 129 € par mois : plusieurs équipes et sous-comptes',
      paragraphs: [
        'L’offre Pro est tarifée à 129 € par mois. Elle vise les laboratoires qui coordonnent plusieurs équipes et veulent développer l’activité domicile avec davantage d’amplitude. Selon la présentation des plans Cary, Pro inclut des préleveurs illimités, des sous-comptes laboratoire illimités, les rendez-vous et le calendrier partagé, des statistiques complètes, ainsi que les avis et la fiche laboratoire. C’est le niveau adapté dès que le volume et l’organisation humaine dépassent le cadre d’une petite équipe.',
        'Le saut de 49 € à 129 € par mois se lit surtout à travers les plafonds et la profondeur de pilotage. Passer de deux préleveurs à une équipe sans limite change la façon de planifier les tournées. Les sous-comptes permettent de refléter une réalité multi-sites ou multi-responsables sans tout faire passer par un compte unique. Les statistiques complètes et la mise en avant des avis soutiennent une lecture plus fine de la performance et de la perception patient.',
        'Pro n’est pas un badge de prestige. C’est un outil dimensionné pour une charge réelle. Si vous recrutez un troisième préleveur, si vous devez séparer les accès par site, ou si vous voulez suivre l’activité avec des indicateurs plus riches, 129 € par mois correspond à ce besoin. Si vous restez durablement sur deux préleveurs et un pilotage simple, Starter à 49 € reste souvent le choix le plus cohérent.',
      ],
    },
    {
      title: 'Essai de 30 jours, facturation et résiliation',
      paragraphs: [
        'Un premier abonnement éligible bénéficie de 30 jours pour essayer les fonctionnalités de l’offre choisie. Pendant cette période, vous pouvez vérifier que le flux de demandes, l’affectation des préleveurs et le suivi des rendez-vous correspondent à votre façon de travailler. Le tarif mensuel (49 € pour Starter, 129 € pour Pro) s’applique ensuite. Si vous annulez avant la fin de l’essai, vous n’êtes pas facturé selon les conditions indiquées sur la page tarifs.',
        'La facturation courante se fait chaque mois par carte, via Stripe. Le premier prélèvement intervient à la fin de votre essai éligible, ou dès la souscription si vous avez déjà utilisé un essai. Ce mécanisme évite les surprises : vous savez si vous êtes encore en période d’essai ou déjà en cycle payant. Les états d’abonnement se consultent depuis l’espace laboratoire, où vous pouvez aussi être redirigé pour gérer un abonnement déjà actif.',
        'Vous pouvez annuler ou changer d’offre depuis votre espace, sans engagement de type contrat long imposé par la page marketing. Cette souplesse compte pour un laboratoire dont l’activité domicile peut croître après une campagne locale puis se stabiliser. L’abonnement doit suivre le volume, pas l’inverse. Cary assume ce principe en rendant l’annulation accessible depuis l’espace, plutôt qu’en la dissimulant derrière un parcours opaque.',
      ],
    },
    {
      title: 'Comment choisir entre découverte, Starter et Pro',
      paragraphs: [
        'Le choix commence par un inventaire honnête de votre équipe. Combien de préleveurs doivent avoir un accès dès le premier mois ? Si la réponse est zéro parce que vous configurez encore la structure, l’offre découverte à 0 € suffit pour démarrer. Si la réponse est un ou deux préleveurs avec un référent qui assigne les rendez-vous, Starter à 49 € couvre le besoin décrit par le plan. Si la réponse dépasse ce cadre, ou si vous avez besoin de sous-comptes et d’un pilotage plus complet, orientez-vous vers Pro à 129 €.',
        'Ensuite, regardez la nature de votre organisation. Un laboratoire mono-site avec une petite équipe gagne rarement à payer Pro uniquement pour le symbole. À l’inverse, un réseau qui doit séparer les responsabilités et suivre plusieurs équipes perdra du temps à forcer Starter au-delà de ses limites. Le tarif n’est utile que s’il débloque réellement une friction : plafond de préleveurs, sous-comptes, statistiques, avis et fiche.',
        'Enfin, projetez trois mois, pas seulement la semaine prochaine. Si vous savez qu’un recrutement est prévu et que le volume domicile augmente déjà, tester Pro pendant l’essai de 30 jours peut être plus pertinent que de souscrire Starter puis de changer immédiatement. Si vous explorez encore, restez sur la découverte puis Starter. Cary laisse ces trajectoires ouvertes ; à vous de coller le niveau tarifaire à la trajectoire réelle.',
      ],
    },
    {
      title: 'Ce que le tarif finance réellement dans votre quotidien',
      paragraphs: [
        'Un abonnement laboratoire sur Cary n’achète pas des analyses biologiques. Il finance l’organisation du rendez-vous à domicile : réception des demandes dans votre secteur, attribution aux préleveurs, calendrier partagé, suivi des passages, et selon l’offre un panier plus ou moins large d’indicateurs et de présence (fiche, avis). Autrement dit, vous payez pour réduire le coût caché de la coordination, celui qui n’apparaît pas sur une facture mais qui consume le temps de vos équipes.',
        'À 49 € comme à 129 €, la valeur se mesure aussi en fiabilité perçue par le patient. Un créneau tenu, une information cohérente, un préleveur qui arrive avec le bon contexte : ces détails améliorent le taux de réalisation des rendez-vous. Moins de no-show signifie moins de kilomètres inutiles et moins de matériel préparé pour rien. Le tarif mensuel devient alors un levier d’efficacité opérationnelle, pas une ligne budgétaire décorative.',
        'Les laboratoires qui réussissent le mieux avec Cary traitent l’abonnement comme une brique de leur organisation domicile, au même titre qu’un véhicule de tournée ou qu’un protocole de prélèvement. Ils forment les préleveurs, ils définissent des règles d’acceptation des demandes, ils relisent les statistiques. Le prix seul ne transforme rien ; l’usage régulier de l’outil, si.',
      ],
    },
    {
      title: 'Passer à l’action depuis la page tarifs',
      paragraphs: [
        'Sur la page tarifs, vous pouvez démarrer gratuitement ou choisir Starter ou Pro selon votre situation de connexion. Si vous n’êtes pas encore authentifié en tant que laboratoire, le parcours vous oriente vers l’inscription ou la connexion. Si vous avez déjà un abonnement en cours, l’interface vous renvoie vers la gestion de l’abonnement plutôt que de créer une session de paiement inutile. Ce comportement évite les doubles souscriptions et clarifie l’état réel de votre compte.',
        'Avant de cliquer, relisez votre besoin en une phrase. « Nous avons deux préleveurs et voulons sortir du tableur » pointe vers Starter à 49 €. « Nous gérons plusieurs équipes, des sous-comptes et voulons des statistiques complètes » pointe vers Pro à 129 €. « Nous voulons d’abord ouvrir l’espace et préparer le dossier » pointe vers la découverte à 0 €. Cette phrase guide mieux qu’une comparaison superficielle de pastilles marketing.',
        'Si vous avez encore des questions sur le métier (comment arrivent les demandes, comment gérer les préleveurs, quels documents fournir), revenez à la page pour les laboratoires. Si votre question porte sur le prix, l’essai, la facturation mensuelle ou le choix entre 49 € et 129 €, vous êtes au bon endroit. Cary a conçu cette grille pour rester lisible : gratuit pour entrer, Starter pour une petite équipe, Pro pour l’échelle, avec la possibilité d’annuler lorsque votre organisation change.',
      ],
    },
  ],
}

export default article
