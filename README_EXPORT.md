# Rapport RGAA - derive Tanaguru Webext

Cette extension est une version locale non officielle derivee de Tanaguru Webext RGAA4.

Elle conserve le moteur d'analyse et l'interface DevTools d'origine de Tanaguru Webext, puis ajoute une surcouche locale de generation de rapport lisible.

## Statut juridique et attribution

- Projet d'origine : Tanaguru Webext RGAA4.
- Auteur/distributeur d'origine : Tanaguru et contributeurs Tanaguru Webext.
- Licence d'origine indiquee par Mozilla Add-ons : MIT License.
- Cette archive est une version locale modifiee, non officielle, non affiliee a Tanaguru et non distribuee par Tanaguru.
- Les modifications locales sont documentees dans `THIRD_PARTY_NOTICES.md`.
- Le texte de licence MIT conserve pour le projet d'origine est fourni dans `LICENSE-MIT-TANAGURU.txt`.

## Ce qui vient de Tanaguru Webext

- Le moteur d'analyse RGAA execute dans le navigateur.
- Les tests JavaScript RGAA.
- L'interface DevTools d'origine.
- Le flux d'analyse et de collecte des resultats.

## Ce qui a ete ajoute localement

- Une zone visuellement distincte `Rapport lisible RGAA`.
- Un bouton unique `Generer le rapport`.
- La collecte globale des resultats visibles et internes.
- Un rapport HTML lisible avec :
  - synthese KPI ;
  - non conformites en premier ;
  - sections indeterminees repliables ;
  - problematique detectee ;
  - critere RGAA associe ;
  - description du critere ;
  - lien vers la documentation officielle RGAA ;
  - extraits HTML formates et attributs problematiques mis en evidence.

## Installation temporaire

1. Ouvrir Firefox.
2. Aller dans `about:debugging#/runtime/this-firefox`.
3. Cliquer sur `Charger un module temporaire`.
4. Selectionner le fichier `.xpi` genere ou le `manifest.json` de ce dossier.
5. Ouvrir les DevTools sur le site a auditer.
6. Ouvrir l'onglet `Rapport RGAA`.
7. Lancer l'analyse.
8. Utiliser la zone `Rapport lisible RGAA`, puis `Generer le rapport`.

## Format du rapport

Le rapport est genere en HTML autonome. Il peut etre :

- ouvert dans Firefox ou Chrome ;
- partage comme fichier de revue ;
- imprime en PDF depuis le navigateur ;
- copie dans un document de recette ou d'audit.

## Fichiers principalement modifies

- `manifest.json`
- `devtools/panel/tanaguru-devtools-panel.js`
- `devtools/panel/tanaguru-rgaa-map.js`

## Note

Ce travail ne constitue pas un avis juridique. Pour une redistribution externe, une revue juridique interne reste recommandee, notamment sur l'usage du nom Tanaguru et des assets graphiques d'origine.
