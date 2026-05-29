# MesurePro — Contexte projet pour Claude Code

## 🤖 RÈGLE NON NÉGOCIABLE — AUTONOMIE TOTALE (Davide, 2026-05-29)

Davide accorde **toutes les autorisations** et travaille souvent en parallèle sur autre chose. Mode de travail **obligatoire** sur ce projet :

- **Pleine autonomie** — ne PAS demander de validation à chaque étape. Décider, agir, et mener la demande **jusqu'au bout**.
- **Autorisations accordées** : lire/modifier le code, builder, lancer tests + scripts du projet, `commit` + `push` sur `main`, déployer via la procédure documentée du projet.
- **Tout terminer AVANT de revenir** : implémenter → builder → tester → **analyser chirurgicalement** (règles non négociables, démos, responsive, calculs) → corriger → re-vérifier. Ne revenir vers Davide **qu'une fois tout fini, testé et vérifié**, avec un rapport synthétique : *ce qui a été fait / comment c'est testé / le résultat*.
- **Seul garde-fou** : ne s'interrompre pour demander QUE devant une action catastrophique et irréversible (suppression de données de prod, `git push --force` réécrivant un historique partagé, destruction d'un dépôt). Tout le reste = on avance seul.
- Cette autonomie ne dispense jamais des **autres règles non négociables** de ce fichier ni de la qualité chirurgicale attendue.

> **À lire en premier avant de toucher au code.**
> Dernière mise à jour : 24 mai 2026.

---

## 🔒 RÈGLE NON NÉGOCIABLE — projet indépendant de WAELDO

**MesurePro et WAELDO sont 2 projets totalement distincts.** Repos
différents, serveurs différents, clients différents, contrats différents.
Si tu travailles sur MesurePro ici (dossier `mesurepro/`), tu ne touches
**PAS** au dossier WAELDO (`~/Desktop/Bureau - MacBook Pro de Genius - 1/WAELDO/`)
et vice-versa. Aucun croisement de code, aucune fuite d'un projet vers
l'autre. Règle posée par Davide le 24/05/2026.

---

## 🎯 Le projet en 30 secondes

**MesurePro** = webapp de mesure immobilière professionnelle (inspirée de Hover.to),
positionnée pour la Belgique / Europe. Le couvreur / métreur saisit (ou récupère
automatiquement) les dimensions d'un bâtiment, l'app produit : modèle 3D, plans
d'élévation 2D, devis, rapports, exports PDF/Excel/DXF, lien de partage client.

- **Prod :** https://geniuspro71.github.io/mesurepro/
- **Repo :** `Geniuspro71/mesurepro` (privé), branche `main`, ~89 commits.
- **Hébergement :** GitHub Pages — **pas de backend**. Tout est client-side
  (localStorage pour la persistance).

---

## 🏗 Stack & architecture

| Élément | Détail |
|---|---|
| Front | React 18 + Vite 5 |
| 3D | React-Three-Fiber + Three.js (`<Canvas>`) |
| Tests | Vitest (unitaire, env jsdom) + Playwright (E2E) |
| Exports | jsPDF + jspdf-autotable, SheetJS (xlsx) |
| Structure | **Mono-fichier `src/App.jsx`** (~9 700 lignes) — choix assumé |

⚠️ **`src/App.jsx` est intentionnellement mono-fichier.** Ne pas le scinder.
Tous les composants + helpers y vivent. Les helpers purs sont exportés en bas
du fichier pour être testés depuis `src/App.test.js`.

---

## 🚀 Commandes

```bash
npm install
npm run dev            # http://localhost:3000  (préférer localhost à 127.0.0.1 — geoloc macOS)
npm test               # Vitest — 107 tests unitaires (src/ uniquement)
npm run test:e2e       # Playwright — build /mesurepro/ + 4 tests E2E
npm run build          # build dev (base "/")
npm run lint           # ⚠️ config ESLint legacy — voir « Reste à faire »
```

### Déploiement (NON-NÉGOCIABLE)

L'app est servie sous le **sous-chemin `/mesurepro/`** sur GitHub Pages.
Le build DOIT être fait avec `VITE_BASE` :

```bash
VITE_BASE=/mesurepro/ npm run build
npx gh-pages -d dist
```

Sans `VITE_BASE=/mesurepro/`, les assets pointent vers la racine du domaine → 404.

---

## 🪤 Pièges connus (à ne pas refaire)

1. **`VITE_BASE` obligatoire** pour `build` ET `vite preview`. `vite preview`
   sans `VITE_BASE=/mesurepro/` sert sous `/` → bundles 404.
2. **Service Worker** : un SW de cache a déjà masqué des déploiements pendant
   des heures. `public/sw.js` est désormais un **kill-switch** (se désinstalle).
   Ne pas réintroduire de SW de cache sans raison forte.
3. **`git add -A` ramasse les doublons macOS** (`App 2.jsx`, `fichier 3.json`).
   Toujours `git add` les fichiers nommément.
4. **Chemins publics** : jamais de `/photos/...` ou `/data/...` en dur. Utiliser
   le helper `publicAsset("photos/x.jpg")` → résout sous `/mesurepro/` en prod.
5. **WebGL Context Lost** : le `<Canvas>` 3D peut afficher du noir sur des
   machines à faible GPU (MacBook 2016). C'est géré, ne pas paniquer.
6. **Tester avant de déployer** : `npm test` + `VITE_BASE=/mesurepro/ npm run build`
   + ouvrir un navigateur réel. Ne pas déclarer « ça marche » sur un smoke HTTP seul.

---

## 🔑 Architecture des données

Un **projet** = `{ id, addr, city, num, cp, client, status, floors, roof,
meas, rooms[], photos[], exterior_meta, userModified, ... }`.

- **`meas`** = `{ foot, h, walls, roof, perim, win, doors }` — les agrégats.
  `foot` (emprise) et `h` (hauteur) **pilotent** la géométrie ; `walls/perim/roof`
  en dérivent.
- **`rooms[]`** = 4 murs (Sud/Nord/Est/Ouest, `t:"w"`) + toiture (`t:"r"`),
  chacun `{ n, l, h, a, t }`. **C'est `rooms[]` que lisent les plans 2D
  (`Elevation`) et la 3D (`IsoModel`).**
- Invariant : éditer `foot`/`h` régénère `rooms[]` (`roomsFromMeas`) + recalcule
  les agrégats ; éditer un mur dans `rooms[]` recalcule `meas` (`measFromRooms`).
  Ne JAMAIS recréer une boucle qui écrase les saisies (bug corrigé en mai 2026).

### Helpers purs exportés (testés)

`slug`, `csvEscape`, `publicAsset`, `facadesAreEmpty`, `isLaserField`,
`mergeWithDefaults`, `saveStored`, `getMeasurementConfidence`,
`parseSolarBuilding`, `computePEB`, `encodeProjectForShare`, etc.

---

## ✅ État actuel (22/05/2026)

Passe « mégaprompt QA » terminée — 12/14 objectifs pleinement livrés :

- Chemins publics GitHub Pages corrigés (`publicAsset`).
- Autoremplissage cadastre/Solar n'écrase plus les mesures manuelles.
- Signature du lien partagé : honnête (locale, non transmise), PDF signé.
- Confiance des mesures : `getMeasurementConfidence` + badges + garde-fou export.
- Laser BLE limité aux champs de distance (plus de « 3,7 m = 4 fenêtres »).
- Projets démo protégés (migration non destructive `mergeWithDefaults`).
- Sauvegarde localStorage robuste (bannière si quota plein).
- Géolocalisation : Photon + timeouts (plus de blocage infini).
- Réactivité plans 2D/3D : la chaîne `meas`↔`rooms` est cohérente.
- API externes : fallback + mode manuel toujours dispo, clé en variable d'env.
- 107 tests unitaires + 4 E2E Playwright.

## 🚧 Reste à faire

- **i18n** : infra FR/NL/EN/DE présente ; compléter le passage de tous les
  textes par `t()` (Reports, HelpPage, PDF, toasts).
- **E2E** : stabiliser le parcours wizard de création de projet (Chromium headless).
- **ESLint** : migrer `.eslintrc` vers le flat config (ESLint 9).
- **Clé Google API** : la restreindre par référent HTTP (Google Cloud Console).

---

## 🚦 Reprise de session

1. Lire ce fichier + `HANDOFF.md`.
2. `npm install` puis `npm test` (doit donner 107/107).
3. Vérifier la prod : ouvrir https://geniuspro71.github.io/mesurepro/ + `Cmd+Shift+R`.
4. Tout changement de code : `npm test` + `VITE_BASE=/mesurepro/ npm run build`
   avant `npx gh-pages -d dist`.
5. Communication utilisateur : français, honnêteté brute, pas de sur-promesse —
   ne jamais déclarer « ça marche » sans preuve réelle.
