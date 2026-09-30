Tanaguru Console Exporter

Extension Firefox de test pour capturer les nouveaux logs `console.*` liés à Tanaguru/RGAA et les exporter en CSV ou JSON.

## Installation locale

1. Ouvrir Firefox.
2. Aller sur `about:debugging#/runtime/this-firefox`.
3. Cliquer sur `Charger un module temporaire`.
4. Sélectionner `manifest.json` dans ce dossier.

## Test rapide

Le test le plus fiable est de servir la page en HTTP local, car Firefox peut limiter l’injection d’extension sur les fichiers `file://`.

```bash
cd dev/tanaguru-console-exporter
python3 -m http.server 8088
```

1. Ouvrir `http://127.0.0.1:8088/test-page.html` dans Firefox.
2. Cliquer sur `Émettre des logs Tanaguru`.
3. Ouvrir le popup de l’extension.
4. Vérifier que `Injection page` vaut `active`.
5. Vérifier le compteur `RGAA`.
6. Exporter en CSV ou JSON.

Si `Injection page` reste à `non détectée`, l’extension n’a pas pu s’injecter dans la page active. Pour vérifier uniquement le téléchargement, cliquer sur `Ajouter un log de test`, puis exporter.

## À vérifier si aucun log n’est capturé

- Recharger l’extension dans `about:debugging` après chaque modification locale.
- Recharger la page test après avoir rechargé l’extension.
- Tester depuis `http://127.0.0.1:8088/test-page.html` plutôt que depuis `file://`.
- Vérifier que l’onglet actif au moment d’ouvrir le popup est bien la page auditée.
- Déclencher les logs après le chargement de l’extension : l’historique déjà présent dans DevTools n’est pas récupérable.

## Limites techniques

- L’extension capture uniquement les logs émis après son chargement.
- Firefox ne donne pas accès à l’historique déjà affiché dans la console DevTools.
- Le filtre actuel conserve les logs contenant `tanaguru`, `rgaa`, `accessibilité`, `a11y`, `wcag`, `critère` ou `test x.y`.
- Pour une intégration robuste, le mieux reste d’ajouter un export directement dans Tanaguru ou d’exposer une API via `runtime.onMessageExternal`.

## Points RGAA couverts côté popup

- Les boutons ont un nom accessible textuel.
- Le retour d’état utilise `role="status"` et `aria-live="polite"`.
- Le focus clavier est visible via `:focus-visible`.
- Les statistiques sont structurées avec une liste de définitions.
