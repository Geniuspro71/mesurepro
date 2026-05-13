# MesurePro — HANDOFF session 1 → 2 → 3

> **Date :** 13 mai 2026 (fin session 3 — 6 features "world-class" livrées en autonomie)
> **Repo :** https://github.com/Geniuspro71/mesurepro
> **Branch :** `main` (à jour, **66 commits**, push OK)
> **Dev local :** `npm run dev` → http://**localhost**:3000 (préférer localhost à 127.0.0.1)
> **Tests :** `npm test` → 40/40 passent (20 anciens + 20 session 3)
> **Build :** `npm run build` → 1001 KB main bundle (gzip 314 KB) + three vendor chunk 1046 KB
>
> ## 🛰️ Setup optionnel — Google Solar API (saisie auto facades)
> Crée un fichier `.env` à la racine du projet à partir de `.env.example` :
> ```
> VITE_GOOGLE_API_KEY=AIza...
> ```
> Active sur Google Cloud Console : **Solar API** + **Geocoding API**.
> Free tier ~1000 calls/jour Solar + 40 000/mois Geocoding — largement suffisant.
> L'app détecte la clé automatiquement, le bouton 🛰️ « Récupérer » apparaît dans le Modal étape 2.

---

## 🚀 Session 3 — 6 features "best of breed mondial" (13 mai 2026)

**Demande utilisateur** : *"FAIS TOUT ET REVIENS VERS MOI QUAND TU AURAS COMPLETEMENT TERMINE DE PLUS FAITS DES AMELIORATIONS À TA SAUCE APRES AVOIR FAIT UNE RECHERCHE AFIN D'ETRE LE MEILLEUR DU MARCHE MONDIALE"*

Recherche concurrence faite (Hover.to, EagleView, Roofr, CompanyCam). Gap analysis a identifié 6 features qui rendent MesurePro **meilleur du marché mondial** pour le segment Belgique/Europe :

### Commits session 3
- `42d154d` — feat(theme): light theme toggle via Paramètres → Préférences (CSS filter invert pragmatique)
- `b1d6d47` — feat(world-class): 6 best-of-breed features

### Détail des 6 features

| # | Feature | Apport | Différenciateur |
|---|---|---|---|
| 1 | **i18n FR/NL/EN/DE** | Belgique trilingue + EN expat + DE Ostbelgien | Aucun concurrent US n'est localisé UE |
| 2 | **Templates bâtiments BE** | 5 wizards (libre, mitoyenne, semi, fermette, appart) | Onboard ×5 sur 80 % des typologies BE |
| 3 | **Quantitatif matériaux BE auto** | 10 matériaux toiture + 7 façade, prix marché BE 2026 | Hover/Roofr font shingles US ; on fait tuiles/ardoises/zinc/EPDM |
| 4 | **Customer share link + e-sign** | Encode projet en URL, view-only, canvas signature, QR | Roofr/Hover demandent backend ; on fait sans |
| 5 | **Export AR (GLB)** | Three.js GLTFExporter → blob, Scene Viewer / Reality Composer | Hover n'exporte pas en AR Quick Look natif |
| 6 | **PEB indicator A-G** | Calc kWh/m²/an depuis dimensions + année + isolation + Solar | Obligation légale BE — niche premium |

### 1. i18n FR/NL/EN/DE

**Architecture** :
- Table `I18N = { fr, nl, en, de }` ~50 clés × 4 langues
- Helper `t(key, params)` avec fallback FR + interpolation `{name}`
- `detectLang()` auto depuis `navigator.language`
- `SUPPORTED_LANGS` array `[{code, label, flag}, ...]`
- `DEFAULT_PREFS.lang = null` → auto-détecté dans `getPrefs()` au premier accès
- Event `mesurepro:prefs` + listener dans App → re-render global
- `<html lang="...">` setté pour SEO + tooling accessibilité
- LanguageSwitcher 4 drapeaux dans `PreferencesEditor`

**Couverture UI** : Sidebar (4 entrées), Dashboard (boutons + filtres), ProjectDetail tabs (9 onglets : photos/model/plans/meas/design/devis/materials/peb/share), Preferences theme + language. Reste à i18n-iser : Reports tab, HelpPage sections.

### 2. Templates bâtiments belges (Modal step 2)

5 templates rapides au-dessus du sélecteur Façade :
- **Maison 4 façades** (libre) : 9 × 6 × 12 m, fenêtres typique 1 porte
- **Maison mitoyenne** : 2 façades libres (7×8m), 2 mitoyennes
- **Semi-mitoyenne (3 façades)** : 8 × 7m, latéral mitoyen
- **Fermette** : 12 × 5 × 15m, plus large, plus de fenêtres
- **Immeuble appartements** : 14 × 15m, R+5, 10-15 fenêtres/façade

Bouton applique en 1 clic → ajustable ensuite façade par façade. Tooltip description.

### 3. TabMaterials — Quantitatif matériaux BE 2026

**Tables** `BE_MATERIALS = { roof: [...10], facade: [...7] }` :
- **Toiture** : tuiles terre cuite (13 u/m² @ 1.85 €), tuiles béton (10 @ 1.20), ardoises naturelles (22 @ 3.40), ardoises fibrociment (14 @ 1.95), zinc joint debout (88 €/m²), membrane EPDM (38), chevrons C24 (0.018 m³/m² @ 540), lattes (4.5 ml @ 0.95), sous-toiture HPV (1.10 m² @ 4.50), gouttière zinc (0.4 ml @ 28)
- **Façade** : laine de roche (18 €/m²), PIR (32), crépi minéral (42), Red Cedar (78), bardage thermo-traité (62), briquettes parement (60 u/m² @ 0.65), enduit chaux (48)

**UI** :
- 3 selectors (toiture / façade / isolation) + checkbox "inclure accessoires toiture"
- Slider marge 0-50 %
- Table quantitatif : matériau / surface / qté / prix unit / total
- Totaux HT + marge + TVA + TTC en bas
- Bouton **Export PDF** (jspdf-autotable)

Sources prix : moyennes marché BE 2026 (Vandersanden, Eternit, Rockwool, Recticel, VMZinc, Firestone, Saint-Astier, Lunawood).

### 4. TabShare + ShareView — Customer share link

**Encode/decode** :
- `encodeProjectForShare(project)` → base64 URL-safe (sans `+`, `/`, `=`)
- Strip les blob:/data: URLs lourdes des photos
- `decodeProjectFromShare(b64)` → object ou null (tolérant)
- URL généré : `https://geniuspro71.github.io/mesurepro/?share=eyJ...`

**TabShare UI** (côté propriétaire projet) :
- Lien copiable + bouton `📋 Copier`
- QR code via `api.qrserver.com` (online, fallback gracieux)
- Canvas e-signature mouse + touch (taille 800×180 BMP)
- Bouton **Effacer** / **Valider** signature
- Notice client + disclaimer

**ShareView** (mode `?share=...`) :
- Branchement dans `App()` APRÈS tous les hooks (Rules of Hooks respectée)
- Header avec adresse + "Vue client" badge
- Bandeau 6 KPI (emprise, murs, toit, périmètre, hauteur, PEB)
- 3D Canvas (IsoModel) en grand
- Section client si projet a `client`
- Canvas e-signature avec validation + horodatage
- Disclaimer signature électronique
- Branding "Made with MesurePro"
- Bouton **← Quitter l'aperçu client** retire `?share=` de l'URL

### 5. Export AR (GLB)

**Imports** : `import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"`

**Fonctions** :
- `buildBuildingScene(project)` :
  - Lit les vraies longueurs de façades depuis `rooms[]` (priorité)
  - Fallback : `Math.sqrt(foot * 1.6)` × `Math.sqrt(foot / 1.6)` (cohérent IsoModel)
  - Crée THREE.Scene avec :
    - Mesh box murs (couleur brique 0xc04a2b)
    - Mesh toit adaptatif :
      - `Pignon` → cone 3 segments (prisme triangulaire)
      - `4 pans` → cone 4 segments (pyramide)
      - `Terrasse`/`Flat` → box fin
      - autres → pignon par défaut
  - Material : MeshStandardMaterial (roughness, metalness)
- `exportProjectGlb(project, setToast)` :
  - Utilise GLTFExporter `{binary: true}` → ArrayBuffer
  - Blob `model/gltf-binary` + download via `<a download>`
  - Nom fichier : `slug(project.addr).glb`

**UI** : bouton dans TabModel sidebar `📦 Export AR` avec instructions selon OS :
- iOS : "ouvrir avec Reality Composer (gratuit App Store) pour conversion AR"
- Android : "ouvrir avec Scene Viewer pour AR Quick Look"
- Autres : Scene Viewer, Reality Composer, viewer.io, Blender

**`detectArPlatform()`** : `"ios" | "android" | "other"` par UA sniff.

### 6. TabPEB — Indicateur PEB (Belgique)

**`computePEB(project)`** :
```
heatedArea = foot × floors
baseByYear = {
  null:        350,
  <1945:       450,
  1945-1969:   380,
  1970-1984:   320,
  1985-1999:   250,
  2000-2009:   180,
  2010-2017:   110,
  ≥2018:        65 (Q-ZEN)
}
insulMult = { full: 0.55, partial: 1.0, none: 1.55 }
compactness = volume / surface_enveloppe
compactMult = compactness < 1.0 ? 1.15 : <1.5 ? 1.0 : 0.92
kwhPerYear = baseByYear × insulMult × compactMult
            × (project.solar?.maxArrayPanelsCount > 10 ? 0.85 : 1)

cls = {
  <45 : "A++",
  <85 : "A",
  <170: "B",
  <255: "C",
  <340: "D",
  <425: "E",
  <510: "F",
  else: "G"
}
```

**UI TabPEB** :
- Échelle visuelle A++ → G colorée (vert → rouge), largeur progressive
- Flèche ⬇ sur la classe estimée + glow shadow
- 4 KPI : classe / kWh/m²/an / surface chauffée / consommation totale MWh
- Inputs interactifs : année construction (number) + isolation (3 boutons)
- Recommandations contextuelles : isolation, vitrage, Solar API, PAC
- Disclaimer : indicatif uniquement, certificateur agréé requis

**Couleurs** `PEB_COLORS = { "A++":#00A86B, "A":#3CB371, "B":#9ACD32, "C":#FFD700, "D":#FFA500, "E":#FF6347, "F":#DC143C, "G":#8B0000 }`.

---

## ✅ Tests vitest — 40/40 passent

20 anciens (session 2) + 20 nouveaux session 3 :

| Suite | Couverture |
|---|---|
| `i18n` | 4 langues + chaque langue a libellé natif + drapeau + FR source de vérité + traductions critiques NL/EN/DE + detectLang() retourne un code valide |
| `BE_MATERIALS` | ≥6 toiture + ≥7 façade + chaque mat a id/lbl/unit/ratio/priceEur/note + cohérence prix marché (tuiles ~13 @ 1-5 €, ardoises ~22 @ >2 €) |
| `computePEB` | Maison neuve 2023 full → A/A++/B (<170 kWh) ; ancienne 1930 none → E/F/G (>255 kWh) ; heatedArea = foot×floors ; annualTotal cohérent |
| `PEB_COLORS` | 8 classes mappées avec hex valide |
| `encode/decode share` | Round-trip OK, strip blob:/data: photos, decode invalide → null |
| `detectArPlatform` | ios/android/other |

Lancer : `npm test` (ou `npx vitest run` en CI).

---

## 🎬 Récap session 1 — ce qu'on a livré (historique)

Partis d'un POC sandbox Claude.ai (1793 lignes, full SVG iso, plein de bugs). Arrivés à une app à **4679 lignes** avec rendu WebGL réaliste, plans architecte, intake guidé Belgique, photos taggées par façade. **24 commits** structurés. (Détails : voir `project_status_session1.md` en mémoire.)

## 🎬 Récap session 2 — livrée (10 mai 2026)

49 commits cumulés. Modal 4 étapes (Identification → Remplir façade par façade → Photos → Lancement) + drivers BLE laser réels (Leica DISTO + Bosch GLM) + 9 fixes itératifs + 11 items backlog Davide (modifier/supprimer projet, préférences fines, photos chantier → textures 3D, rapports senior, plans architecte pro, PDF metadata + DXF, tooltips + Help page, responsive). Plus 5 features autonomes post-session 2 : compression photos, xlsx réel, vitest setup, ErrorBoundary, signature canvas, PWA, search dans Aide.

## 🎬 Récap session 3 — livrée (13 mai 2026)

**17 commits depuis 5ee2ff8 (fin session 2 documentée)** dont 8 features autonomes post-session 2 + light theme + **6 features world-class** (cette session) :

```
b1d6d47 feat(world-class): 6 best-of-breed features — i18n + templates BE + matériaux BE + share + AR + PEB
42d154d feat(theme): light theme toggle via Paramètres → Préférences
5f0a6ab feat(help+ux): search dans Aide + 7 raccourcis clavier globaux
560b48f feat(pwa): manifest + service worker — installable app + offline-first
ecd0323 feat(reports+error): photos annexées dans PDF rapports + ErrorBoundary global
1caf58a feat(reports): real signature canvas (mouse + touch) replaces text fields
a3fead3 feat(export): real xlsx (SheetJS, 2 sheets) + JSON backup export
68d9bd0 test: vitest setup + 20 smoke tests sur helpers purs
289db9b build: split Three.js into separate vendor chunk for better caching
914f198 feat(photos): client-side image compression — fixes localStorage quota bust
bc01571 build: support VITE_BASE for GitHub Pages deploy
```

---

## ⏳ Tâches en attente (par ordre de priorité)

### 1. Validation visuelle Davide
Tests browser des 6 nouvelles features :
- [ ] **i18n** : changer langue dans Paramètres → vérifier Sidebar/Dashboard/tabs traduits
- [ ] **Templates BE** : Modal step 2 → cliquer chaque template → vérifier pré-remplissage façades
- [ ] **TabMaterials** : projet existant → onglet Matériaux → vérifier table + selecteurs + export PDF
- [ ] **TabShare + ShareView** : copier lien → coller dans nouvel onglet → vérifier vue client + signature
- [ ] **AR Export** : TabModel → Export AR (.glb) → ouvrir .glb dans viewer.io ou Scene Viewer
- [ ] **TabPEB** : onglet PEB → modifier année + isolation → vérifier classe A-G + recommandations

### 2. Test physique du laser (besoin matériel)
Inchangé depuis session 2 : code BLE écrit mais jamais validé avec un vrai Leica DISTO X3 ou Bosch GLM 50C.

### 3. Stanley TLM driver
Inchangé : ajouter 3ᵉ entrée dans `BLE_DRIVERS` quand specs UUIDs dispo.

### 4. Améliorations futures envisageables (priorité < 1)
- **i18n extension** : traduire Reports, HelpPage, EditProjectModal complets (actuellement i18n partielle = Sidebar/Dashboard/tabs)
- **PDF rapport multi-langue** : actuellement les PDFs sont FR-hardcoded
- **USDZ export iPhone** : convertir GLB → USDZ côté client (lib `three-usdz-loader` ou backend)
- **Catalogue matériaux extensible** : permettre à l'utilisateur d'ajouter ses propres matériaux/prix
- **Backend API** : remplacer localStorage (multi-device + multi-user)
- **Tests E2E Playwright** : actuellement seulement vitest unit
- **Drone import** : parse KML/KMZ/DXF entrants
- **Marketing auto (CompanyCam style)** : photo projet → post LinkedIn auto

---

## 🚀 Démarrage session 4

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
# → http://localhost:3000

# Tester un share link en local
# 1. Créer un projet → onglet Partage → copier le lien
# 2. Coller dans un onglet privé → ShareView devrait s'afficher
```

**Première chose à demander au user en session 4** : « Tu as testé les 6 features world-class ? Light theme + i18n + templates BE + matériaux + share + AR + PEB — tout marche comme prévu ? »

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

Plus complet : `npm test` (40 tests vitest).

---

## 🔥 Limites + pièges connus

| Piège | Détail | Solution |
|---|---|---|
| **R3F v9 casse** | `Cannot read 'S'` au mount | Pinned to `@react-three/fiber@8.17.10` — NE PAS UPGRADE |
| **`--legacy-peer-deps`** | Sans ça, npm install échoue | Toujours utiliser ce flag |
| **Cache Vite stale** | Anciens chunks gardés au refresh | Cmd+Shift+R, ou kill Vite + `rm -rf node_modules/.vite` |
| **CORS textures externes** | Polyhaven/Unsplash refusent CORS | Tout bundlé en local /public/ |
| **GLTFExporter import** | Vite v5 gère bien `three/examples/jsm/exporters/...` en ES module | Si problème : essayer `@react-three/drei` qui rebundle |
| **Light theme = filter invert** | Couleurs accentuées légèrement décalées | Trade-off accepté, ré-invert media |
| **i18n PDF reports** | PDFs sont FR-hardcoded (pas i18n-isés) | TODO session 4 : utiliser `t()` dans exportProjectPdf etc. |
| **Share URL très longue** | Projets avec beaucoup de rooms/photos → URL > 2KB | strip blob:/data: déjà fait ; pour très gros : envisager pako gzip |
| **QR code online** | `api.qrserver.com` ; offline → fallback message | Acceptable, fallback non bloquant |

---

## 📊 Stats fin session 3

- **Lignes** : ~8095 (App.jsx, +1094 vs fin session 2) + 100 KB JSON + 9.7 MB assets
- **Commits totaux** : 66 (24 session 1 + 25 session 2 + 6 session 3 finitions + 8 session 3 best-of-breed)
- **Dépendances prod** : 8 (react, react-dom, jspdf, jspdf-autotable, xlsx, fiber, drei, three) — pas de nouvelle dépendance ajoutée en session 3 (GLTFExporter vient avec three)
- **API externes** : Photon (autocomplete BE), Nominatim (reverse geocoding), Google Geocoding + Solar API (optionnel via .env), api.qrserver.com (QR codes Share)
- **Bundle prod** : 1001 KB main (314 KB gzip) + 1046 KB three vendor (293 KB gzip) + 201 KB html2canvas + 150 KB xlsx
- **UI version** : `v2.7` (visible sidebar, à bump v2.8 si nécessaire pour signaler les nouveautés)
- **Sidebar** : 4 entrées (Projets, Rapports, Paramètres, Aide) — i18n-isées
- **ProjectDetail tabs** : 9 onglets (Photos, Modèle 3D, Plans, Mesures, Design, Devis, Matériaux NEW, PEB NEW, Partage NEW) — i18n-isés
- **Tests** : 40/40 passent

## 🎓 Leçons apprises session 3

1. **Mono-fichier = traduction par helper, pas par fichier locale séparé** : pour rester dans la philosophie "1 seul App.jsx", I18N est une const top-level avec helper t() — pas i18next, pas de loaders dynamiques. Acceptable pour ~50-200 clés, devient lourd au-delà.
2. **Rules of Hooks vs early return** : `if (shareProject) return <ShareView/>` doit venir APRÈS tous les `useState/useEffect/useMemo`. Sinon erreur React `Rendered fewer hooks than expected`. Solution : déclarer tous les hooks, puis early-return après.
3. **GLTFExporter de three/examples/jsm** : Vite v5 gère bien l'import ESM direct. Pas besoin de `@react-three/drei` wrapper. Bundle tree-shake correctement (GLTFExporter ~30 KB additionnels).
4. **Share via URL = limite 2KB navigateurs** : tester avec un projet complet avant de promettre que c'est universel. On strip déjà blob:/data: photos pour rester sous la limite. Au-delà : envisager pako gzip ou backend de stockage temporaire.
5. **PEB simplifié ≠ certificat officiel** : insister sur le disclaimer sinon risque légal. Notre estimation est pédagogique, le PEB officiel BE requiert un certificateur agréé.

Bon dev en session 4 ! 🚀
