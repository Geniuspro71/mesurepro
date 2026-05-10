# MesurePro — HANDOFF session 1 → session 2

> **Date :** 10 mai 2026
> **Repo :** https://github.com/Geniuspro71/mesurepro
> **Branch :** `main` (à jour, 24 commits)
> **Dev local :** Vite tourne sur http://127.0.0.1:3000 (PID variable, à relancer si tué)

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

## ⏳ Tâches en attente (par ordre de priorité)

### 1. Étape 2 du modal intake — **CLARIFICATION USER REQUISE**

Le user a écrit : *« apres l'etape 2 ne sera pas photo mais remplir »* — message **tronqué** avant qu'il termine.

**Hypothèse forte** : étape 2 = saisir les **mesures** elles-mêmes en parcours guidé (façade par façade), avec :
- Connexion **Bluetooth laser** comme alternative au clavier
- Validation par étape

**À demander au user dès le démarrage de la prochaine session** :
- Étape 2 = quoi exactement ? Mesures façade par façade ? Saisie globale ? Autre ?
- Photos = devient étape 3 ou disparaît ?

### 2. Bluetooth laser mètre (gros chantier ~500 lignes)

User veut connecter des lasers du marché : **Leica DISTO** (X3, X4, D2…), **Bosch GLM** (50C, 100C…), **Stanley TLM**.

**Plan technique** :
- Web Bluetooth API : `navigator.bluetooth.requestDevice({filters: [...]})`
- Drivers BLE par modèle (UUIDs services/characteristics) :
  - Leica DISTO : service `3AB10100-F831-4395-B29D-570977D5BF94`
  - Bosch GLM : custom UART
  - Format trame : meters/feet, signe, type (distance/angle/area)
- Bouton « Connecter laser » dans `TabMeas` → state `connectedDevice` + listener `characteristicvaluechanged`
- Mesure reçue → champ actif rempli auto + son confirmation
- Sécurité : Web Bluetooth nécessite HTTPS en prod (OK en dev `http://localhost`)

**Compatibilité browser** : Chrome/Edge OK, Safari NO, Firefox flag-only. Documenter cette limite.

### 3. Backlog
- Photos haussmanniennes plus ressemblantes (Unsplash gratuit limité)
- Theme clair (refactor CSS vars)
- xlsx réel (au lieu de CSV)
- PWA (service worker offline-first)
- Backend API
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

**Première chose à demander au user** : « Pour l'étape 2 (qui devait s'appeler "remplir" et pas "Photos"), tu veux quoi exactement ? Saisir les mesures façade par façade ? Avec connexion laser Bluetooth ? »

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

## 📊 Stats

- **Lignes** : 4679 (App.jsx) + 100 KB JSON + 9.7 MB assets
- **Commits** : 24
- **Dépendances prod** : 5 (react, react-dom, jspdf, jspdf-autotable, fiber, drei, three)
- **Bundle dev served** : Vite + HMR + ~10 MB textures/photos lazy-loaded

Bon dev en session 2 ! 🚀
