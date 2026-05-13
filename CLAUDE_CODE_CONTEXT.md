# MesurePro — Contexte Claude Code

> **Dernière mise à jour : 13 mai 2026 — session 3 (6 features "best of breed mondial")**
> **Repo :** https://github.com/Geniuspro71/mesurepro (privé) — **66 commits** sur `main`
> **Dev local :** http://**localhost**:3000 via `npm run dev` (préférer localhost à 127.0.0.1 pour la geolocation macOS)
> **Optionnel** : `.env` à la racine avec `VITE_GOOGLE_API_KEY=AIza...` active la saisie auto via Google Solar API (étape 2 du Modal de création de projet)

---

## 🎯 Objectif

Application professionnelle de mesure immobilière inspirée de **Hover.to**, positionnée pour être **best of breed mondial** sur le segment Belgique/Europe :
- Tableau de bord projets multi-statuts
- Modèle 3D WebGL en temps réel (matériaux + textures photoréalistes + **export GLB AR**)
- Plans d'élévation 2D type architecte (4 façades cotées + niveaux altimétriques + DXF)
- Saisie de mesures guidée + **templates bâtiments belges**
- Devis automatique + **quantitatif matériaux BE 2026** + 4 types de rapports + xlsx/PDF/JSON
- **Customer share link sans backend** (URL encodée + e-signature + QR)
- **Indicateur PEB A-G** (Belgique obligation légale)
- Workflow intake riche (géolocalisation, autocomplete adresses Belgique, Solar API)
- **Multilingue FR/NL/EN/DE** (Belgique trilingue + EN expat + DE Ostbelgien)
- PWA installable + offline-first + thème dark/light

---

## 🏗 Stack actuelle

| Lib | Version | Rôle |
|---|---|---|
| **React** | ^18.3 | UI |
| **Vite** | ^5.4 | Dev server + build |
| **@react-three/fiber** | **8.17.10** (pinné) | Canvas 3D React |
| **@react-three/drei** | **9.114.3** (pinné) | OrbitControls, Environment, ContactShadows |
| **three** | **0.171.0** (pinné) | Moteur 3D WebGL + GLTFExporter (session 3) |
| **jspdf** + **jspdf-autotable** | ^4/^5 | Export PDF |
| **xlsx** | ^0.18 | Export Excel réel (session 2) |

**⚠️ Versions pinées exactes** (pas de caret) car `@react-three/fiber@9` casse en React 18.

```bash
# Démarrer
cd ~/Desktop/mesurepro
npm install --legacy-peer-deps
npm run dev

# Tests
npm test   # 40/40 (20 anciens + 20 session 3)
```

---

## 📁 Structure

```
mesurepro/
├── src/
│   ├── App.jsx              ← TOUT le code (~8095 lignes, mono-fichier)
│   ├── App.test.js          ← 40 tests vitest (helpers purs)
│   └── main.jsx             ← entry React + Service Worker registration
├── public/
│   ├── textures/            ← 12 fichiers Polyhaven (5.3 MB)
│   ├── photos/              ← 9 photos Unsplash (4.4 MB)
│   ├── data/be-postal-codes.json  ← 2781 codes postaux (100 KB)
│   ├── manifest.webmanifest ← PWA install
│   ├── sw.js                ← Service worker offline-first
│   └── favicon.svg
├── .claude/
│   └── launch.json          ← config preview Claude Code
├── package.json
├── vite.config.js
├── CLAUDE_CODE_CONTEXT.md   ← CE FICHIER
└── HANDOFF.md               ← récap session pour suite
```

---

## 🧱 Architecture App.jsx (8095 lignes — mono-fichier)

### Constantes globales (top of file)
- `EMPTY_MEAS` : template mesures vides
- `PROJS` : 5 projets démo (id 1-5 : Paris, Lyon, Bordeaux, Nantes, Haussmann)
- `MATS` : 6 matériaux (wood, stone, brick, white, grey, slate) pour Design tab
- `RPTS` : 4 rapports démo
- `BM` : badges statuts
- `STORE_KEY_*` : clés localStorage (projects, reports, profile, civilites, prefs)
- `DEFAULT_CIVILITES`, `DEFAULT_PREFS` (avec `theme`, `lang`)
- `BE_BBOX` : bbox Belgique pour Photon API
- `POLYHAVEN_BASE` / `POLYHAVEN_SLUGS`
- `DEMO_PHOTOS_*` : photos par projet, taggées facade

### Session 3 — Constantes "best of breed"
- `I18N = { fr, nl, en, de }` ~50 clés × 4 langues
- `SUPPORTED_LANGS = [{code, label, flag}, ...]`
- `BE_MATERIALS = { roof: [...10], facade: [...7] }` — table prix marché BE 2026
- `PEB_COLORS = { "A++": ..., ..., "G": ... }` — échelle visuelle

### Helpers (session 1-2)
- `slug()`, `downloadBlob()`, `csvEscape()`, `exportCsv()`
- `exportProjectPdf()`, `exportProjectCsv()`, `exportProjectXlsx()` (SheetJS), `exportProjectDxf()`, `exportProjectJson()`
- `exportReportPdf()` (jspdf)
- `unsplash(id)`, `loadStored()`, `saveStored()`, `mergeWithDefaults()`
- `loadBePostalCodes()`, `reverseGeocode()`, `searchAddressBE()`, `searchCityBE()`
- `connectBleLaser()`, `BLE_DRIVERS` (Leica, Bosch)

### Helpers (session 3 — "best of breed")
- **i18n** :
  - `detectLang()` → code parmi `fr/nl/en/de` depuis navigator.language
  - `t(key, params)` → traduction avec fallback FR + interpolation `{name}`
  - `applyTheme(theme)` (session 2.5)
- **Quantitatif** :
  - `BE_MATERIALS` table (10 toiture + 7 façade + ratios + prix BE 2026)
- **PEB** :
  - `computePEB(project)` → `{ cls, kwhPerYear, heatedArea, annualTotal, inputs }`
- **Share** :
  - `encodeProjectForShare(project)` → string base64 URL-safe
  - `decodeProjectFromShare(b64)` → object ou null (tolérant)
- **AR** :
  - `buildBuildingScene(project)` → THREE.Scene depuis dimensions
  - `exportProjectGlb(project, setToast)` → download GLB
  - `detectArPlatform()` → `"ios" | "android" | "other"`

### Composants 3D (R3F)
- `drawBrickTex/Bump`, `drawWoodTex/Bump`, etc. — fallback Canvas2D si Polyhaven cassé
- `useMatTexture(matId, photoUrl, repeat)` → `{map, bumpMap}` THREE.Texture
- `windowsForFace(width, height, fl, hasDoor)` — grid fenêtres
- `FacadeFeatures` — fenêtres + porte + allèges sur 1 façade
- `Building3D` — meshs walls + roof variants (gable/4pans/mansart/flat) + foundation + gutter
- `IsoModel` — Canvas R3F + lights + Environment + ContactShadows + OrbitControls

### Composants 2D
- `MatDefs` (SVG patterns fallback)
- `MatTile`, `photoMat()` — preview matériaux
- `Elevation` — plan 2D pro 1 façade (cotes V+H, niveaux altim, TN, limites propriété)
- `TabPlans` — grille 2×2 des 4 élévations + lightbox + photos liées + export PDF + DXF

### UI Top-level (session 1-2)
- `Sidebar`, `Dashboard`, `ProjectDetail`, `Reports`, `Settings`, `HelpPage`
- `TabPhotos`, `TabModel`, `TabPlans`, `TabMeas`, `TabDesign`, `TabDevis`
- `RptHead`, `CoCl`, `RptMeas`, `RptDevis`, `RptInsp`, `RptProp`, `RptSeniorField`, `RptAuditorBlock`
- `Modal` (4 étapes : Identification → Remplir → Photos → Lancement)
- `EditProjectModal`, `CivilitesEditor`, `PreferencesEditor`
- `AutoComplete`, `AsyncAutoComplete`
- `Btn`, `Toast`, `Badge`, `EF`
- `ErrorBoundary` (session 2)

### UI Session 3 — "best of breed"
- `TabMaterials` (quantitatif matériaux BE auto)
- `TabPEB` (indicateur Performance Énergétique A-G)
- `TabShare` (lien partage + QR + e-signature)
- `ShareView` (mode read-only `?share=...` — pas de sidebar, just view client)
- `LanguageSwitcher` (inline dans PreferencesEditor)

### Composants PTABS_FN
`function PTABS_FN()` retourne le tableau des 9 onglets (i18n-aware) : photos, model, plans, meas, design, devis, materials, peb, share. Re-évalué à chaque render pour réagir au switch i18n.

---

## ✅ Ce qui marche

### Dashboard
- Projets démo + recherche globale (projets + rapports) + filtres statut (i18n-isés)
- Auto-promote `processing` → `draft` après 3s
- Compteur photos par card + badge statut

### Modèle 3D (R3F WebGL)
- Drag souris/touch pour rotation, molette zoom
- 4 faces visibles avec back-face culling automatique
- Textures Polyhaven 1K + bumpMap (relief joints, planches, tuiles)
- Environment HDR `apartment` → vrais reflets sur verre/laiton
- ContactShadow + directional light shadow
- Sliders sidebar : Étages / Hauteur / Emprise (recalcule meas auto)
- Toit 4 variantes selon `project.roof` : pignon / 4 pans hipped / mansart / terrasse
- **NEW session 3** : bouton `📦 Export AR (.glb)` avec instructions UA-aware

### Plans (architecte)
- 4 élévations Sud/Est/Nord/Ouest avec cotes V+H, niveaux altim, TN hachuré, limites propriété
- Photos réelles liées + lightbox plein écran
- Export PDF A4 paysage 2 plans/page + Export DXF 4 élévations

### Photos
- 9 vraies photos Unsplash en local + drag-drop upload
- Tag façade par photo + badge couleur dans la grille
- Compression côté client (session 2)

### Mesures
- Banner progression X/7 + bordures orange si vide
- Tableau façades CRUD
- BLE laser bar avec status + connect/disconnect

### Devis
- Calcul auto HT/TVA/TTC + slider marge
- Export PDF jspdf
- TVA + devise paramétrables

### Rapports
- 4 types : meas / devis / insp / prop
- Niveau auditeur senior (méthodologie, normes NBN/DTU, checklist 16 pts)
- Photos annexées dans PDF + signature canvas (session 2)
- Export PDF par rapport

### Intake (Modal `+ Nouveau projet`) — 4 étapes
- **Étape 1 (Identification)** : civilité + nom + prénom (si personne) + rue + n° + CP + ville
  - AsyncAutoComplete Photon BE (toutes rues + sous-communes)
  - AutoComplete CP local (2781 entrées GeoNames)
  - Bouton 📍 Géolocaliser → Nominatim reverse
  - Validation stricte (`^\d{4}$`)
- **Étape 2 (Remplir)** :
  - **NEW session 3** : 5 templates BE pré-remplissage rapide (maison libre / mitoyenne / semi / fermette / appart)
  - 4 onglets façade (Sud/Est/Nord/Ouest) avec badge ✓
  - Champs longueur, hauteur, fenêtres, portes par façade
  - Récap visuel temps réel + surfaces auto
  - Bouton 📡 BLE laser (optionnel)
  - 🛰️ Google Solar API auto-fill (si .env configuré)
- **Étape 3 (Photos)** : drag-drop + Object URL + compression
- **Étape 4 (Lancement)** : récap complet + totaux mesures auto-calculés

### Settings
- Profil utilisateur éditable + persisté
- Stats live (projets, rapports, en cours, terminés)
- Civilités éditables
- Préférences :
  - TVA + devise + civilité + ratio profondeur + décimales
  - **NEW session 3** : Langue (4 drapeaux FR/NL/EN/DE)
  - Thème (Sombre / Clair) — session 2.5
  - Reset démo

### NEW session 3 — Matériaux (TabMaterials)
Quantitatif auto-calculé depuis dimensions du projet :
- Sélecteur toiture : tuiles terre cuite / béton / ardoises naturelles / fibrociment / zinc / EPDM
- Sélecteur façade : crépi / Red Cedar / thermo / briquettes / chaux
- Sélecteur isolation : laine de roche / PIR
- Checkbox "inclure accessoires toiture" (sous-toiture + chevrons + lattes + gouttière)
- Slider marge 0-50 %
- Table quantitatif détaillée + totaux HT/marge/TVA/TTC
- Export PDF jspdf-autotable

### NEW session 3 — PEB (TabPEB)
Indicateur Performance Énergétique Bâtiment (Belgique) :
- Échelle visuelle A++ → G colorée (vert → rouge), flèche sur classe estimée
- 4 KPI : classe / kWh/m²/an / surface chauffée / consommation MWh
- Inputs interactifs : année construction + isolation (full/partial/none)
- Recommandations contextuelles (isolation, vitrage, solaire, PAC)
- Disclaimer indicatif (certificateur agréé requis pour PEB officiel)

### NEW session 3 — Partage (TabShare)
- Lien copiable encodé en URL (base64 URL-safe)
- QR code via api.qrserver.com
- Canvas e-signature mouse + touch (validation + horodatage)
- Notice client + disclaimer signature électronique

### NEW session 3 — ShareView (mode `?share=...`)
- Détecté au boot d'App() (après tous les hooks — Rules of Hooks)
- Header simple avec adresse + badge "Vue client"
- Bandeau 6 KPI (emprise, murs, toit, périmètre, hauteur, PEB)
- IsoModel 3D en grand
- Section client si dispo
- Canvas e-signature côté client
- Branding "Préparé avec MesurePro"
- Bouton ← Quitter retire `?share=` de l'URL

### NEW session 3 — Multilingue (i18n)
- Auto-détecté depuis navigator.language au premier load
- Switcher 4 drapeaux dans Paramètres → Préférences
- Sidebar, Dashboard, ProjectDetail tabs, Modal stepper, Settings, Preferences i18n-isés
- Event re-render global au switch langue

---

## ⏳ À faire (session 4)

### URGENT — validation visuelle Davide
- [ ] Tester les 6 features world-class en browser
- [ ] Bumper UI version `v2.7` → `v2.8` ou `v3.0` ?

### Inchangé depuis session 2
- Test physique laser (Leica DISTO X3 ou Bosch GLM 50C — besoin matériel)
- Stanley TLM driver UUIDs réels

### Améliorations futures envisageables
- i18n extension complète (Reports, HelpPage, EditProjectModal)
- PDF rapport multi-langue
- USDZ export iPhone (conversion GLB → USDZ côté client)
- Catalogue matériaux extensible utilisateur
- Backend API (remplacer localStorage)
- Tests E2E Playwright

---

## 🔗 URLs utiles

| Ressource | URL |
|---|---|
| Repo GitHub | https://github.com/Geniuspro71/mesurepro |
| Site démo GitHub Pages | https://geniuspro71.github.io/mesurepro/ |
| Dev local | http://localhost:3000 |
| Polyhaven (textures CC0) | https://polyhaven.com |
| Unsplash | https://unsplash.com |
| Photon API (autocomplete OSM) | https://photon.komoot.io |
| Nominatim (reverse geocoding) | https://nominatim.openstreetmap.org |
| GeoNames Belgique | https://download.geonames.org/export/zip/BE.zip |
| QR Server (Share QR codes) | https://api.qrserver.com |

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
# Si vraiment cassé : Settings → Réinitialiser (clear localStorage)

# 4. Tester le mode partage en local
# Créer un projet → onglet Partage → copier le lien → coller dans onglet privé
```

---

## 📌 Règles à respecter

- ⛔ **NE PAS** mettre à jour `@react-three/fiber` au-dessus de **v8** (v9 casse React 18)
- ⛔ **NE PAS** supprimer `--legacy-peer-deps` du flow npm install
- ⛔ **NE PAS** toucher `/public/textures/` ni `/public/photos/` (assets bundlés)
- ⛔ **NE PAS** early-return avant tous les hooks dans App() (Rules of Hooks) — refer ShareView pattern
- ✅ **TOUJOURS** lancer le smoke test Babel parser avant commit (voir HANDOFF.md)
- ✅ **TOUJOURS** lancer `npm test` (40/40) avant commit
- ✅ Utiliser `useMemo` pour les CanvasTextures (sinon recreate à chaque render)
- ✅ Nouvelles strings UI → ajouter clé dans `I18N.fr` + traductions NL/EN/DE
- ✅ Nouveaux helpers purs → ajouter à `export {...}` + test vitest
