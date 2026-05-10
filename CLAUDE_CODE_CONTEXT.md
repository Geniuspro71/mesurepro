# MesurePro — Contexte Claude Code

> **Dernière mise à jour : 10 mai 2026 — fin session 1**
> **Repo :** https://github.com/Geniuspro71/mesurepro (privé)
> **Dev local :** http://127.0.0.1:3000 via `npm run dev` (port 3000)

---

## 🎯 Objectif

Application professionnelle de mesure immobilière inspirée de **Hover.to** :
- Tableau de bord projets multi-statuts
- Modèle 3D WebGL en temps réel (matériaux + textures photoréalistes)
- Plans d'élévation 2D type architecte (4 façades cotées + niveaux altimétriques)
- Saisie de mesures guidée
- Devis automatique + 4 types de rapports
- Export PDF / CSV
- Workflow intake riche (géolocalisation, autocomplete adresses Belgique)

---

## 🏗 Stack actuelle

| Lib | Version | Rôle |
|---|---|---|
| **React** | ^18.3 | UI |
| **Vite** | ^5.4 | Dev server + build |
| **@react-three/fiber** | **8.17.10** (pinné) | Canvas 3D React |
| **@react-three/drei** | **9.114.3** (pinné) | OrbitControls, Environment, ContactShadows |
| **three** | **0.171.0** (pinné) | Moteur 3D WebGL |
| **jspdf** + **jspdf-autotable** | ^3 | Export PDF |

**⚠️ Versions pinées exactes** (pas de caret) car `@react-three/fiber@9` casse en React 18.

```bash
# Démarrer
cd ~/Desktop/mesurepro
npm install --legacy-peer-deps
npm run dev
```

---

## 📁 Structure

```
mesurepro/
├── src/
│   ├── App.jsx              ← TOUT le code (4679 lignes, mono-fichier)
│   └── main.jsx             ← entry React
├── public/
│   ├── textures/            ← 12 fichiers Polyhaven (5.3 MB)
│   │   ├── red_brick_03_diff.jpg + _disp.jpg
│   │   ├── wood_planks_diff.jpg + _disp.jpg
│   │   ├── cobblestone_05_diff.jpg + _disp.jpg
│   │   ├── roof_07_diff.jpg + _disp.jpg
│   │   ├── painted_plaster_wall_diff.jpg + _disp.jpg
│   │   └── painted_concrete_diff.jpg + _disp.jpg
│   ├── photos/              ← 9 photos Unsplash (4.4 MB)
│   │   └── <unsplash-id>.jpg × 9 (vraies façades)
│   ├── data/
│   │   └── be-postal-codes.json  ← 2781 codes postaux belges (100 KB)
│   └── favicon.svg
├── .claude/
│   └── launch.json          ← config preview Claude Code
├── package.json
├── vite.config.js
├── CLAUDE_CODE_CONTEXT.md   ← CE FICHIER
└── HANDOFF.md               ← récap session pour suite
```

---

## 🧱 Architecture App.jsx (4679 lignes)

### Constantes globales (top of file)
- `C` : palette couleurs (bg, surf, card, border, acc, grn, org, red, txt, mut, dim)
- `EMPTY_MEAS` : template mesures vides
- `PROJS` : 5 projets démo (id 1-5: Paris, Lyon, Bordeaux, Nantes, **Haussmann**)
- `MATS` : 6 matériaux (wood, stone, brick, white, grey, slate)
- `RPTS` : 4 rapports démo
- `BM` : badges statuts
- `STORE_KEY_*` : clés localStorage (projects, reports, profile, civilites)
- `DEFAULT_CIVILITES` : ["M.", "Mme", "Mlle", "Monsieur", "Madame", "Société", "SCI", "ASBL"]
- `BE_BBOX` : bbox Belgique pour Photon API
- `POLYHAVEN_BASE` = `"/textures/"` + `POLYHAVEN_SLUGS` map
- `DEMO_PHOTOS_*` : photos par projet, taggées `facade: sud/nord/est/ouest/vue`

### Helpers
- `slug()`, `downloadBlob()`, `csvEscape()`, `exportCsv()`
- `exportProjectPdf()`, `exportProjectCsv()`, `exportReportPdf()` (jspdf)
- `unsplash(id)` → `/photos/{id}.jpg`
- `loadStored()`, `saveStored()`, `mergeWithDefaults()` (localStorage + auto-refresh demo photos)
- `loadBePostalCodes()` (cache JSON 2781 entrées)
- `reverseGeocode(lat, lng)` (Nominatim OSM)
- `searchAddressBE(q)` + `searchCityBE(q)` (Photon Komoot)

### Composants 3D (R3F)
- `drawBrickTex/Bump`, `drawWoodTex/Bump`, etc. — fallback Canvas2D si Polyhaven cassé
- `useMatTexture(matId, photoUrl, repeat)` → `{map, bumpMap}` THREE.Texture
- `windowsForFace(width, height, fl, hasDoor)` — grid fenêtres
- `FacadeFeatures` — fenêtres + porte + allèges sur 1 façade (4 instances/bâtiment)
- `Building3D` — meshs walls + roof variants (gable/4pans/mansart/flat) + foundation + gutter
- `IsoModel` — Canvas R3F + lights (ambient+hemi+directional shadow) + `<Environment preset="apartment">` + ContactShadows + OrbitControls

### Composants 2D
- `MatDefs` (SVG patterns fallback)
- `MatTile`, `photoMat()` — preview matériaux
- `Elevation` — plan 2D pro 1 façade (cotes V+H, niveaux altim, TN, limites propriété, légende)
- `TabPlans` — grille 2×2 des 4 élévations + lightbox + photos liées par façade + export PDF

### UI
- `AutoComplete` (filtre local sync)
- `AsyncAutoComplete` (debounce 320ms + Photon API + loading)
- `Modal` (3 étapes : Identification → Photos → Lancement)
- `CivilitesEditor` (Settings)
- `Sidebar`, `Dashboard`, `ProjectDetail`, `Reports`, `Settings`
- `TabPhotos`, `TabModel`, `TabMeas`, `TabDesign`, `TabDevis`
- `RptHead`, `CoCl`, `RptMeas`, `RptDevis`, `RptInsp`, `RptProp`

---

## ✅ Ce qui marche

### Dashboard
- 5 projets démo + recherche globale (projets + rapports) + filtres statut
- Auto-promote `processing` → `draft` après 3s
- Compteur photos par card + badge statut

### Modèle 3D (R3F WebGL)
- Drag souris/touch pour rotation, molette zoom
- 4 faces visibles avec back-face culling automatique
- Textures Polyhaven 1K + bumpMap (relief joints, planches, tuiles)
- Environment HDR `apartment` → vrais reflets sur verre/laiton
- ContactShadow + directional light shadow
- Sliders sidebar : Étages (1-8), Hauteur (3-20m), Emprise (40-500m²) → recalcule meas auto
- Toit 4 variantes selon `project.roof` : pignon / 4 pans hipped / mansart / terrasse
- Cheminée + gouttière + soubassement + lignes inter-étages

### Plans (architecte)
- 4 élévations Sud/Est/Nord/Ouest avec cotes V+H, niveaux altim (±0.00 / +X.XX), TN hachuré, limites propriété orange
- Photo réelle de chaque façade liée automatiquement (badge couleur Sud/Nord/Est/Ouest)
- Lightbox plein écran : plan + photo côte à côte
- Export PDF A4 paysage 2 plans/page (jspdf + canvas raster)

### Photos
- 9 vraies photos Unsplash en local (validées visuellement)
- Tag façade par photo + badge couleur dans la grille
- Lightbox + drag-drop upload + Object URL custom

### Mesures
- Banner progression X/7 (barre cyan→verte)
- Bordures orange si vide + badge VIDE
- Tableau façades CRUD

### Devis
- Calcul auto HT/TVA/TTC + slider marge
- Export PDF jspdf

### Rapports
- 4 types : meas / devis / insp / prop
- Création nouveau rapport vide (modale type) + suppression
- Export PDF par rapport

### Intake (modal `+ Nouveau projet`)
- **Étape 1 (Identification)** : champs séparés rue + N° + CP + Ville
- Civilité paramétrable (`Settings → Civilités`) avec personne (M./Mme/...) vs entité (Société/SCI/ASBL)
- Bouton **📍 Géolocaliser** → Nominatim reverse → remplit tout
- **Adresse rue** : `AsyncAutoComplete` Photon → toutes les rues de Belgique
- **Ville** : `AsyncAutoComplete` Photon → toutes villes + sous-communes (Templeuve, Lillo, Anderlues...)
- **CP** : `AutoComplete` local (offline-friendly, 2781 entrées GeoNames)
- Validation stricte (regex `^\d{4}$` pour CP)

### Settings
- Profil utilisateur éditable + persisté
- 4 stats live (projets, rapports, en cours, terminés)
- Civilités éditables (chips + add + reset)
- Reset démo (clear localStorage)

---

## ⏳ À faire (prochaine session)

### URGENT — reprise immédiate
1. **Étape 2 du modal intake** : la phrase user était tronquée — *« apres l'etape 2 ne sera pas photo mais remplir »*. Probable : remplir les **mesures** (façade par façade ?). À clarifier avec lui avant de coder.
2. **Bluetooth laser mètre** : Web Bluetooth API pour Leica DISTO / Bosch GLM / Stanley TLM. Gros chantier (~500 lignes) :
   - `navigator.bluetooth.requestDevice()` avec filtres UUID
   - Parser trames BLE selon modèle (Leica DISTO X3/D2 vs Bosch GLM 50C, etc.)
   - Bouton « Connecter laser » dans TabMeas → écrit auto les mesures reçues

### Backlog
- Theme clair (CSS variables refactor)
- Étendre photos demo Haussmann (chercher photos vraies façades haussmanniennes)
- xlsx réel (vs CSV actuel)
- PWA (service worker)
- Backend API (remplacer localStorage)
- Tests E2E

---

## 🔗 URLs utiles

| Ressource | URL |
|---|---|
| Repo GitHub | https://github.com/Geniuspro71/mesurepro |
| Dev local | http://127.0.0.1:3000 |
| Polyhaven (textures CC0) | https://polyhaven.com |
| Unsplash | https://unsplash.com |
| Photon API (autocomplete OSM) | https://photon.komoot.io |
| Nominatim (reverse geocoding) | https://nominatim.openstreetmap.org |
| GeoNames Belgique | https://download.geonames.org/export/zip/BE.zip |

---

## 🚀 Prochaine session — démarrage rapide

```bash
# 1. Cloner si nouveau Mac
git clone git@github.com:Geniuspro71/mesurepro.git
cd mesurepro
npm install --legacy-peer-deps

# 2. Démarrer
npm run dev
# → http://localhost:3000

# 3. Si problème WebGL/textures
# Cmd+Shift+R hard reload
# Si vraiment cassé :  Settings → Réinitialiser (clear localStorage)
```

---

## 📌 Règles à respecter

- ⛔ **NE PAS** mettre à jour `@react-three/fiber` au-dessus de **v8** (v9 casse React 18)
- ⛔ **NE PAS** supprimer `--legacy-peer-deps` du flow npm install
- ⛔ **NE PAS** toucher `/public/textures/` ni `/public/photos/` (assets bundlés)
- ✅ **TOUJOURS** lancer le smoke test Babel parser avant commit (voir HANDOFF.md)
- ✅ Utiliser `useMemo` pour les CanvasTextures (sinon recreate à chaque render)
