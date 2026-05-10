# MesurePro — HANDOFF session 1 → 2 → 3

> **Date :** 10 mai 2026 (session 2 + backlog Davide étendu — UI **v2.7**)
> **Repo :** https://github.com/Geniuspro71/mesurepro
> **Branch :** `main` (à jour, **49 commits**, push OK)
> **Dev local :** Vite tourne sur http://localhost:3000 (PID variable, à relancer si tué)
> **Conseil :** ouvrir l'app sur **`localhost:3000`** (pas 127.0.0.1) — meilleure compat geolocation macOS
>
> ## 🛰️ Setup optionnel — Google Solar API (saisie auto facades)
> Crée un fichier `.env` à la racine du projet à partir de `.env.example` :
> ```
> VITE_GOOGLE_API_KEY=AIza...
> ```
> Active sur Google Cloud Console : **Solar API** + **Geocoding API**.
> Free tier ~1000 calls/jour Solar + 40 000/mois Geocoding — largement suffisant.
> L'app détecte la clé automatiquement, le bouton 🛰️ « Récupérer » apparaît dans le Modal étape 2.
>
> ## 🎁 Backlog Davide livré en autonomie totale (10 items, 11 commits)
>
> | Item | Module | Commit |
> |---|---|---|
> | 1 | PROJETS — modifier + supprimer projet | [`e0de6be`](https://github.com/Geniuspro71/mesurepro/commit/e0de6be) |
> | 6 | PARAMETRES — préférences fines (TVA, devise, civilité, ratio profondeur, décimales) | [`aaef0f1`](https://github.com/Geniuspro71/mesurepro/commit/aaef0f1) |
> | 3 | PROJETS Design — photos chantier auto en textures 3D | [`978dd1c`](https://github.com/Geniuspro71/mesurepro/commit/978dd1c) |
> | 4 | RAPPORTS — niveau auditeur senior (sections + checklist 16 pts + auditor identity) | [`0e943c4`](https://github.com/Geniuspro71/mesurepro/commit/0e943c4) |
> | 5+7 | PROJETS Plans — détails architecte pro (gouttières/EP, cheminée, velux, cotes fen/portes, faîtage/égout, repère coupe A-A) | [`986c6d5`](https://github.com/Geniuspro71/mesurepro/commit/986c6d5) |
> | 9 | PROJETS Modèle 3D — PDF metadata indexable + export DXF (4 élévations) | [`debb193`](https://github.com/Geniuspro71/mesurepro/commit/debb193) |
> | 8 partie 1+2 | PARTOUT — Tooltips infobulles + Page d'aide dédiée 12 sections | [`cfcf88d`](https://github.com/Geniuspro71/mesurepro/commit/cfcf88d) |
> | 8 partie 3 | PARTOUT — Responsive (tablette/mobile breakpoints + body scroll lock) | [`26b6b8c`](https://github.com/Geniuspro71/mesurepro/commit/26b6b8c) |
> | Bonus | Google Solar API auto-fill (Building Insights free tier) | [`53ce368`](https://github.com/Geniuspro71/mesurepro/commit/53ce368) |

---

## 🎬 Récap session 1 — ce qu'on a livré

Partis d'un POC sandbox Claude.ai (1793 lignes, full SVG iso, plein de bugs). Arrivés à une app à **4679 lignes** avec rendu WebGL réaliste, plans architecte, intake guidé Belgique, photos taggées par façade. **24 commits** structurés.

### Highlights par axe

#### 🔧 Stabilisation initiale (3 commits)
- Fix bug critique : `Reports state` perdu au switch d'onglet → lift vers App
- Persistance localStorage (`projects` + `reports` + `profile` + `civilites`)
- Cleanup code mort (`fmtN`, `NumInput`, doublons `borderLeft`, no-op)

#### 📦 Features de base (4 commits)
- Photos upload réel (Object URL)
- Export PDF/CSV via jspdf
- Print CSS `@media print`
- Refonte Settings (profil + stats + reset démo)
- 3D annotations + TabMeas validation X/7 + recherche globale + Reports CRUD + drag-drop + photo counter

#### 🏠 3D enrichi en SVG iso (3 commits)
- Drag-to-rotate manuel + auto OFF par défaut
- Bâtiment enrichi : étages multiples, fenêtres, porte, cheminée, gable
- Sliders d'édition (étages/hauteur/emprise) avec write-back
- Cotes longueur par façade
- 4 façades visibles avec back-face culling

#### 🎨 Textures procédurales (2 commits)
- 6 patterns SVG : brick / wood / stone / slate / white / grey
- Photos custom du projet → pattern texture
- Environment HDR overlay + ombres avancées (en SVG)

#### 📐 Plans d'élévation architecte (2 commits)
- Composant `Elevation` SVG avec cotes verticales + niveaux altimétriques + TN + limites propriété + tuiles
- Onglet `Plans` avec grille 4 façades + lightbox + export PDF A4

#### 🌐 Migration WebGL R3F (5 commits)
- Install `@react-three/fiber@8.17.10` + `drei@9.114.3` + `three@0.171.0` (combo battle-tested React 18)
- `Building3D` + `IsoModel` Canvas R3F : OrbitControls, lights, shadows
- Textures `THREE.CanvasTexture` puis bumpMaps réels
- Environment HDR + ContactShadows + perf tuning (shadow 2K→1K)
- Bundle textures Polyhaven en local (5.3 MB) → fix CORS WebGL
- Bundle photos Unsplash en local (4.4 MB) → fix CORS

#### 📷 Photos vraies + façades taggées (1 commit)
- Audit visuel des 18 photos téléchargées : 9 vraies façades, 9 hors-sujet (galaxie, skyline, signe...) → supprimées
- Tag `facade: sud/nord/est/ouest/vue` par photo
- Liaison auto plan ↔ photo dans onglet Plans
- Badges couleur dans la grille TabPhotos

#### 📍 Intake guidé Belgique (2 commits)
- Modal step 0 enrichi : civilité (paramétrable), nom, prénom (si personne), rue, n°, CP, ville
- 2781 codes postaux belges en local (GeoNames)
- AutoComplete croisé CP ↔ Ville
- 📍 Géolocaliser via Nominatim reverse
- AsyncAutoComplete Photon → **toutes** rues + sous-communes Belgique
- Validation stricte (`^\d{4}$` pour CP)
- Section Civilités éditable dans Settings

---

## 🎬 Session 2 — livrée (10 mai 2026, suite)

Hypothèse confirmée par le user (`ok vas-y totalement`). 2 nouveaux commits sur `main`, push OK.

### Commit A — `509fae9` — feat(intake): step 2 "Remplir"
- Modal refactoré 3 → **4 étapes** : Identification → **Remplir** → Photos → Lancement
- 4 onglets façade (Sud/Est/Nord/Ouest) avec badge ✓ quand remplie
- Champs par façade : longueur, hauteur, fenêtres, portes
- Récap visuel temps réel des 4 façades + surface auto (L × H)
- Calcul auto des totaux pour `meas` global :
  - `perim` = Σ longueurs façades
  - `walls` = Σ surfaces façades (L × H)
  - `foot` = (moy Sud/Nord) × (moy Est/Ouest) — rectangle approx
  - `roof` = `foot × 1.15` (pente estimée)
  - `h` = max hauteur, `win` + `doors` = sommes
- `addProject` étendu : `meas` pré-rempli, `rooms[]` pré-peuplé (1 entrée / façade), `facades` brut conservé, `area` + `floors` dérivés
- Modal width 560 → 600 pour 4 stepper labels
- 📡 bouton « Connecter laser » placeholder en attendant commit B

### Commit B — `0e58d15` — feat(intake+meas): real BLE laser drivers
- Module top-level `BLE_DRIVERS` extensible :
  - **Leica DISTO** (X3/X4/D2) — service `3ab10100-…`, parser float32 LE
  - **Bosch GLM** (50C/100C) — Nordic UART `6e400001-…`, parser ASCII regex
- Helper partagé `connectBleLaser(onMeasurement, onStatus)` : `requestDevice` + match driver par regex name + GATT subscribe + `{device, driver, disconnect}`
- **Modal étape 1** : driver réel branché, écrit dans le champ focus (`activeFieldRef` pour éviter staleness React)
- **TabMeas** : nouvelle barre BLE en haut (status + bouton), `activeMeasField` tracking sur 7 fields + 4 cellules room (n/a/l/h) avec border highlight #00E5A0
- Cleanup auto : disconnect sur unmount (Modal + TabMeas)
- Bouton bascule connect/disconnect avec affichage device name
- Fallback gracieux Safari (`navigator.bluetooth` absent)

### Pourquoi ces choix
- **Modal width 600** : 4 labels de stepper (Identification / Remplir / Photos / Lancement) au lieu de 3 — 560 px commençait à serrer.
- **`activeFieldRef` (useRef)** : la callback BLE survit aux re-renders ; sans ref, la valeur de `activeField` capturée à la connexion devient stale.
- **Approximation rectangle pour `foot`** : la plupart des bâtiments visés sont des parallélépipèdes ; emprise = (moy Sud/Nord) × (moy Est/Ouest) marche pour ~80 % des cas. Affinement possible plus tard.
- **`win`/`doors` reçoivent aussi le laser** : pas idéal sémantiquement (compteur != distance) mais évite les surprises (« pourquoi rien ne s'écrit ? »). Affichage `Math.round(meters)` comme dégradé.

### Pas vérifié visuellement (limite environnement)
- Claude Preview MCP a renvoyé `EPERM uv_cwd` (sandbox bloque le spawn shell hors worktree)
- Pas de Chrome MCP connecté
- **Vérification déléguée au user** : Vite tourne déjà (PID 59947 sur :3000), HMR a injecté les modifs (curl → 9 hits sur les nouveaux symboles BLE)
- Smoke test Babel parser : ✅ PASS (5156 lignes)

### Bug fixes post-livraison initiale (commits 580542c → 5ee2ff8)

L'utilisateur a testé en chaîne, plusieurs régressions sont apparues. Toutes corrigées :

| # | Commit | Bug rapporté | Cause racine | Fix |
|---|---|---|---|---|
| 1 | `580542c` | Lancer renvoie au Dashboard | `addProject` ajoutait au state mais ne navigait pas | `openProject(np)` après `setProjects` |
| 2 | `b7a21b9` | Bouton « Connecter laser » donne l'air obligatoire | Bouton vert fluo + bold | Restyle muted + tag « (optionnel) » + tooltip + footnote |
| 3 | `fe6f0dd` | Lancer atterrit sur 3D, pas Mesures | `useState("model")` hardcodé | Nouveau prop `initialTab` ; `openProject(np, "meas")` après création |
| 4 | `25378ff` | 3D + Plans affichaient des dimensions « d'autres projets » (cas projet partiel) | Fallbacks `parseFloat(m.foot) \|\| 142`, `\|\| 7.4` correspondaient EXACTEMENT au projet démo Haussmann (id 1) | Fallbacks neutres (80 m², 6 m) + `computeMeasFromFacades` infère depth = 0.6 × frontage si paire perpendiculaire vide |
| 5 | `705a5b5` | 3D rendait toujours 12.9×8.1 même avec façades exactes | `IsoModel` ignorait `rooms[]` et reconstruisait W/D depuis `foot` via ratio 1.6 hardcodé | `_getRoomLen` lit les vraies longueurs depuis `rooms[]` ; fallback ratio uniquement si vide |
| 6 | `685ada5` | Plans utilisaient hauteur globale max au lieu de la hauteur de chaque façade | `Elevation` faisait `parseFloat(meas.h)` sans regarder `room.h` | Nouveau `findFacadeHeight(needle)` ; `realH = findFacadeHeight(facadeId) \|\| meas.h \|\| 6` |
| 7 | `363260e` | Cas 1 façade : `realW × realD ≠ foot` (incohérence math sqrt-ratio) | IsoModel + Elevation utilisaient `sqrt(foot * 1.6)` même avec roomW connu | Quand 1 paire connue : autre paire déduite via `foot / known` (math-cohérent) |
| 8 | `d189a43` | « Position indisponible » sur géolocalisation | Code 2 = POSITION_UNAVAILABLE — Chrome traite `127.0.0.1` différemment de `localhost` pour Location Services macOS | Retry auto en low-accuracy (Wi-Fi) + messages d'erreur actionnables (suggère `localhost`) |
| 9 | `6b47b09` puis `5ee2ff8` | HMR cache stale après les fixes | R3F + Canvas ne hot-reload pas toujours proprement | Sidebar v2.5 → v2.7, indicateur cyan `dimSource` (debug temporaire ajouté puis retiré une fois validé) |

### Action manuelle de Claude pendant la session
Pour débloquer un cache Vite tenace, j'ai utilisé Bash :
```
kill 59947                                     # vieux Vite tué
rm -rf ~/Desktop/mesurepro/node_modules/.vite  # cache vidé
nohup node node_modules/.bin/vite > /tmp/mesurepro-vite.log 2>&1 &  # restart fresh
```
Vite tourne maintenant en background avec PID 66797 — détaché du terminal du user.

---

## ⏳ Tâches en attente (par ordre de priorité)

### 1. Test physique du laser (besoin matériel)
Le code BLE est écrit mais **jamais testé avec un vrai laser** :
- Acheter / emprunter un Leica DISTO X3 ou un Bosch GLM 50C
- Vérifier que les UUIDs Leica `3ab10100-…` correspondent au modèle exact (peuvent varier X3 vs D2)
- Pour Bosch, le format ASCII réel doit être confirmé — peut-être trame binaire selon firmware
- Si UUIDs faux : ajouter un mode "appairage manuel" (lister tous les services dispo après connect)

### 2. Stanley TLM driver
Le briefing original mentionnait Stanley TLM en plus de Leica/Bosch. UUIDs à investiguer (la doc Bluetooth de Stanley est moins publique). Ajouter une 3ᵉ entrée dans `BLE_DRIVERS` quand on a les specs.

### 3. Backlog (de session 1)
- Photos haussmanniennes plus ressemblantes (Unsplash gratuit limité)
- Theme clair (refactor CSS vars)
- xlsx réel (au lieu de CSV)
- PWA (service worker offline-first)
- Backend API (remplacer localStorage)
- Tests E2E

---

## 🚀 Démarrage session 2

```bash
# Si nouveau setup
git clone git@github.com:Geniuspro71/mesurepro.git
cd mesurepro
npm install --legacy-peer-deps

# Sinon (ordi habituel)
cd ~/Desktop/mesurepro
git pull
npm install --legacy-peer-deps  # idempotent

# Lancer
npm run dev
# → http://127.0.0.1:3000
```

**Première chose à demander au user en session 3** : « Tu as testé le laser physique avec un Leica DISTO ou un Bosch GLM ? Les UUIDs / formats marchent ou il faut ajuster ? »

---

## 🧪 Smoke test parser (avant chaque commit)

```bash
cd ~/Desktop/mesurepro && node -e "
const p = require('@babel/parser');
const fs = require('fs');
try {
  p.parse(fs.readFileSync('src/App.jsx','utf8'), {sourceType:'module', plugins:['jsx']});
  console.log('PARSER OK');
} catch(e) { console.log('ERR ligne', e.loc.line, ':', e.message); process.exit(1); }
"
```

---

## 🔥 Limites + pièges connus

| Piège | Détail | Solution |
|---|---|---|
| **R3F v9 casse** | `Cannot read 'S'` au mount | Pinned to `@react-three/fiber@8.17.10` — NE PAS UPGRADE |
| **`--legacy-peer-deps`** | Sans ça, npm install échoue | Toujours utiliser ce flag |
| **Cache Vite stale** | Anciens chunks gardés au refresh | Cmd+Shift+R, ou kill Vite + `rm -rf node_modules/.vite` |
| **localStorage shadow** | `mergeWithDefaults` ne refresh QUE le champ `photos` des projets démo (id 1, 2, 5) | Pour reset complet : Settings → Réinitialiser |
| **WebGL Context Lost** | Crash GPU sur trop de textures lourdes | Shadow map 1K, Environment "apartment" (pas "park"), ContactShadows res 512 |
| **CORS textures externes** | Polyhaven/Unsplash refusent CORS pour TextureLoader | Tout bundlé en local /public/textures + /public/photos |

---

## 📊 Stats fin session 2 (étendue)

- **Lignes** : ~6850 (App.jsx, +2171 vs session 1) + 100 KB JSON + 9.7 MB assets
- **Commits totaux** : 49 (24 session 1 + 25 session 2 dont 9 fixes itératifs + 11 backlog Davide + 5 docs/cleanup)
- **Dépendances prod** : 5 (react, react-dom, jspdf, jspdf-autotable, fiber, drei, three) — pas de nouvelle dépendance ajoutée
- **API externes** : Photon (autocomplete BE), Nominatim (reverse geocoding), Google Geocoding + Solar API (optionnel via .env)
- **Bundle dev served** : Vite + HMR + ~10 MB textures/photos lazy-loaded
- **UI version** : `v2.7` (visible sidebar)
- **Sidebar** : 4 entrées (Projets, Rapports, Paramètres, Aide)
- **Responsive** : 3 paliers (desktop > 1024 px / tablette ≤ 1024 / mobile ≤ 640) avec body scroll lock

## 🎓 Leçons apprises session 2

1. **HMR + R3F = piège** : modifier une fonction interne au Canvas R3F (comme IsoModel) ne se hot-reload pas toujours. Symptôme : code modifié + servi par Vite + pas visible dans browser. Solution : `pkill vite` + `rm -rf node_modules/.vite` + restart.
2. **`127.0.0.1` ≠ `localhost`** : Chrome+macOS Location Services traitent différemment. Geolocation peut échouer sur 127.0.0.1 même quand elle marche sur localhost.
3. **Fallbacks hardcodés piégeux** : utiliser `|| 142` ou `|| 7.4` qui correspondent à un projet démo crée des bugs subtils — un projet incomplet ressemble visuellement à un autre. Toujours préférer des défauts neutres (80, 6) qui ne match aucun cas réel.
4. **Dérivation math doit être cohérente** : si on calcule foot = W × D dans un endroit, partout ailleurs on doit avoir realW × realD = realFoot. L'usage d'un ratio 1.6 hardcodé brisait cette invariance.

Bon dev en session 3 ! 🚀
