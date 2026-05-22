# MesurePro — HANDOFF

> **Date :** 22 mai 2026 — fin de la passe « mégaprompt QA 14 objectifs ».
> **Repo :** `Geniuspro71/mesurepro`, branche `main` — à jour, ~89 commits, tout poussé.
> **Prod :** https://geniuspro71.github.io/mesurepro/ — déployée et à jour.
> **Tests :** `npm test` → 107/107 · `npm run test:e2e` → 4/4 · `npm run build` (VITE_BASE) → OK.

---

## 🛰️ Setup optionnel — Google Solar API

`.env` à la racine (cf. `.env.example`) :
```
VITE_GOOGLE_API_KEY=AIza...
```
Active Solar API + Geocoding API sur Google Cloud Console. Sans clé, l'autofill
bascule automatiquement sur le cadastre public gratuit (IGN/UrbIS/PICC/OSM).
**Pensez à restreindre la clé par référent HTTP.**

---

## 📦 Travail des dernières sessions (mai 2026)

### Refonte réactivité plans 2D/3D
Bug central : les plans 2D / 3D ne reflétaient pas les mesures. Cause = la chaîne
`meas` ↔ `rooms[]` qui se désynchronisait / s'écrasait. Refaite proprement :
`foot`/`h` pilotent, `rooms[]` dérivé, plus de boucle d'écrasement.

### Onglet Extérieur — autofill cadastre
PhotoWalk (théâtre UX) abandonné. L'onglet Extérieur récupère le contour réel
du bâtiment depuis l'adresse : chaîne IGN BDTOPO (FR) → UrbIS (BE-BXL) →
PICC (BE-WAL) → Overpass OSM. Géocodage via Photon (komoot) + timeouts durs.

### Passe « mégaprompt QA » — 14 objectifs
| # | Objectif | État |
|---|---|---|
| 1 | Chemins publics GitHub Pages (`publicAsset`) | ✅ |
| 2 | Autoremplissage n'écrase pas le manuel | ✅ |
| 3 | Signature partage honnête (locale, non transmise, PDF signé) | ✅ |
| 4 | PWA cohérente (kill-switch SW + manifest, pas de promesse offline) | ✅ |
| 5 | Niveau de confiance des mesures + badges + garde-fou export | ✅ |
| 6 | Laser BLE limité aux champs de distance | ✅ |
| 7 | Projets démo protégés (migration non destructive) | ✅ |
| 8 | Sauvegarde localStorage robuste + bannière | ✅ |
| 9 | i18n complète | ⚠️ partiel — infra OK, complétion à faire |
| 10 | API externes isolées (clé en env, fallback, mode manuel) | ✅ |
| 11 | Tests unitaires + E2E | ✅ 107 unit + 4 E2E (wizard E2E à stabiliser) |
| 12 | UX des erreurs | ✅ |
| 13 | Vérifications finales | ✅ (lint : config legacy, cf. ci-dessous) |

---

## 🚧 Reste à faire (prochaine session)

1. **i18n** — passer les textes restants par `t()` : Reports, HelpPage, PDF,
   devis, toasts, messages d'erreur. Ajouter les clés manquantes dans `I18N`.
2. **E2E wizard** — stabiliser le test d'ouverture du modal « Nouveau projet »
   en Chromium headless (timing / sélecteur).
3. **ESLint** — `npm run lint` affiche un avertissement de migration : la config
   est en ancien format `.eslintrc`, ESLint 9 attend le flat config. À migrer.
4. **Clé Google API** — restreindre par référent HTTP dans Google Cloud Console
   (une clé dans un frontend statique reste visible — mitigation standard).

---

## 🔁 Workflow de déploiement

```bash
npm test                              # 107/107 attendu
VITE_BASE=/mesurepro/ npm run build   # base /mesurepro/ obligatoire
npx gh-pages -d dist                  # publie sur la branche gh-pages
git add <fichiers>                    # JAMAIS git add -A (doublons macOS)
git commit -m "..." && git push origin main
```

Après déploiement : ouvrir https://geniuspro71.github.io/mesurepro/ et faire
**Cmd+Shift+R** (la CDN GitHub Pages met 1-2 min à propager).
