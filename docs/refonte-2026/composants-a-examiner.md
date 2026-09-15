# Composants web à examiner avant suppression

Analyse statique conservatrice des références PascalCase, kebab-case, Lazy et imports de fichiers, hors commentaires. Nuxt utilise `pathPrefix: false`. Les références construites dynamiquement peuvent échapper à cette analyse : cette liste ne constitue pas une autorisation automatique de suppression.

Aucun composant, script de synchronisation, script de migration, secret ou export historique n’est supprimé par cet outil. Les fichiers de configuration secrets ne sont pas lus.

0 candidats sur 156 composants.

| Composant | Références depuis d’autres composants candidats |
|---|---|
