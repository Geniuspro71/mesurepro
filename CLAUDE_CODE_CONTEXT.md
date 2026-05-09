# MesurePro — Contexte complet pour Claude Code

## 🎯 Objectif du projet
Clone de l'application **Hover** (hover.to) — application professionnelle de mesure immobilière avec modèle 3D isométrique, saisie de mesures, visualisation de matériaux, génération de devis et rapports éditables.

---

## 🏗 Stack technique
- **React 18** (JSX, hooks : useState, useEffect, useRef)
- **Vite 5** (bundler, dev server port 3000)
- **Zéro dépendance UI** — tout en CSS-in-JS inline (pas de Tailwind, pas de MUI)
- **Zéro canvas** — le modèle 3D est un SVG isométrique pur
- **Node.js 18+** requis

## 🚀 Démarrer
```bash
cd mesurepro
npm install
npm run dev
# → http://localhost:3000
```

---

## 📁 Structure
```
mesurepro/
├── src/
│   ├── App.jsx          ← TOUT LE CODE (composant unique, 1800+ lignes)
│   └── main.jsx         ← point d'entrée React
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── package.json
└── CLAUDE_CODE_CONTEXT.md  ← CE FICHIER
```

---

## 🧩 Architecture de App.jsx

### Constantes globales
| Nom | Rôle |
|-----|------|
| `C` | Palette de couleurs (bg, surface, accent, green, orange...) |
| `EMPTY_MEAS` | Template vide pour les mesures d'un projet |
| `PROJS` | 4 projets exemples (2 "done", 1 "processing", 1 "draft") |
| `MATS` | 6 matériaux de revêtement avec couleurs et prix |
| `RPTS` | 4 rapports exemples (mesures, devis, inspection, proposition) |
| `W = 210` | Largeur fixe de la sidebar en pixels |

### Composants utilitaires
| Composant | Rôle |
|-----------|------|
| `Badge` | Pastille de statut colorée (done/processing/draft/review/sent) |
| `Btn` | Bouton unifié (props: onClick, primary, sm, style) |
| `Toast` | Notification verte temporaire (2.4s) |
| `EF` | Champ éditable click-to-edit avec bouton OK — **PAS de onBlur** |
| `NumInput` | Input numérique avec onChange direct (chaque touche sauvegarde) |
| `House` | SVG illustratif 4 formes (L/S/M/F) avec prop matCol |
| `IsoModel` | Modèle 3D isométrique SVG avec slider + boutons ← → + AUTO/PAUSE |
| `sh(hex, p)` | Utilitaire : éclaircir/assombrir une couleur hex |

### Vues principales (géré par App root)
| Vue | Composant | Condition |
|-----|-----------|-----------|
| Tableau de bord | `Dashboard` | `view === "dash"` |
| Détail projet | `ProjectDetail` | `view === "project" && openP` |
| Rapports | `Reports` | `view === "reports"` |
| Paramètres | `Settings` | `view === "settings"` |

### ProjectDetail — onglets
| Onglet | Composant | Fonctionnalité |
|--------|-----------|----------------|
| Modèle 3D | `TabModel` | IsoModel + sélecteur matériau |
| Mesures | `TabMeas` | Grille 7 champs + tableau façades CRUD |
| Design | `TabDesign` | Prévisualisation matériaux sur House SVG |
| Devis | `TabDevis` | Calcul auto HT/TVA/TTC + slider marge |

### Rapports (4 types)
| Composant | Type | Contenu |
|-----------|------|---------|
| `RptMeas` | `meas` | Mesures éditables + tableau façades + notes |
| `RptDevis` | `devis` | Lignes devis éditables + calcul auto + conditions |
| `RptInsp` | `insp` | Checklist 10 points + score + recommandations |
| `RptProp` | `prop` | Proposition + planning Gantt + CGU + signatures |

---

## ⚠️ Points critiques — NE PAS CASSER

### 1. EF (Editable Field) — règle absolue : PAS de onBlur
Le sandbox Claude.ai tue le focus immédiatement → `onBlur` ferme l'input avant que l'user tape.
**Pattern correct :**
```jsx
// Valider avec bouton OK ou touche Enter/Escape uniquement
<input autoFocus value={v} onChange={e=>setV(e.target.value)}
  onKeyDown={e=>{ if(e.key==="Enter") commit(); if(e.key==="Escape") cancel(); }}/>
<button type="button" onClick={commit}>OK</button>
```

### 2. NumInput — onChange sur chaque touche
```jsx
// CORRECT — sauvegarde immédiate à chaque touche
<input type="number" value={m[key]} onChange={e => onUpdate({meas:{...m,[key]:e.target.value}})}/>

// INTERDIT — onBlur ne se déclenche pas de façon fiable
<input onBlur={save}/> // ← NE PAS FAIRE
```

### 3. TabMeas — PAS de state local pour rooms
```jsx
// CORRECT — lit directement depuis project.rooms (prop)
var rooms = project.rooms || [];
function setRoomField(i, field, val) {
  onUpdate({rooms: rooms.map((r,j) => j===i ? {...r,[field]:val} : r)});
}

// INTERDIT — state local se désynchronise du parent
var [rooms, setRooms] = useState(project.rooms); // ← NE PAS FAIRE
```

### 4. Boutons — toujours type="button"
```jsx
// CORRECT
<button type="button" onClick={...}>

// INTERDIT — se comporte comme submit dans certains contextes
<button onClick={...}> // ← ajouter type="button" systématiquement
```

### 5. IsoModel — PAS de drag SVG
Le drag souris sur SVG dans un iframe perd les events mouseup/mouseleave.
**Solution actuelle :** slider HTML + boutons ← →

### 6. React.memo — NE PAS UTILISER
```jsx
// INTERDIT dans ce projet — créait une parenthèse non fermée
const X = React.memo(function X() {...}) // ← ne pas utiliser

// CORRECT — fonction simple
function X() {...}
```

---

## 🔄 Flux de données

```
App (state: projects[], view, openId, modal)
 ├── projects: PROJS initiaux + addProject()
 ├── updateProject(id, patch) → setProjects(...)
 └── ProjectDetail
      ├── project: openP (dérivé de projects par id)
      ├── onUpdate: patch => updateProject(openP.id, patch)
      └── TabMeas
           ├── lit: project.meas, project.rooms (depuis prop)
           └── écrit: onUpdate({meas:...}) ou onUpdate({rooms:...})
```

---

## 🗺 Roadmap — travail restant

### Priorité HAUTE
- [ ] **Export PDF réel** : utiliser `@react-pdf/renderer` ou `jspdf` + `html2canvas`
- [ ] **Export Excel** : utiliser `xlsx` (SheetJS) pour générer les devis
- [ ] **Persistance localStorage** : sauvegarder `projects` et `reports` entre les sessions
- [ ] **Nouveau projet fonctionnel** : la modal crée un projet "processing" mais sans vraie analyse
- [ ] **Photos upload** : intégrer l'upload réel dans la modal (actuellement simulé)

### Priorité MOYENNE
- [ ] **Mode sombre/clair** : toggle dans Paramètres
- [ ] **Annotations sur le modèle 3D** : afficher les cotes mesurées sur les faces du modèle
- [ ] **Impression CSS** : `@media print` pour les rapports (window.print() est déjà branché)
- [ ] **Validation des champs** : indicateurs visuels pour valeurs manquantes dans TabMeas
- [ ] **Recherche globale** : barre de recherche qui cherche aussi dans les rapports

### Priorité BASSE
- [ ] **Comparaison de matériaux** : afficher 2 matériaux côte à côte dans TabDesign
- [ ] **Historique des modifications** : undo/redo sur les mesures
- [ ] **Multi-langue** : i18n FR/EN/ES
- [ ] **PWA** : service worker + manifest pour usage offline
- [ ] **Backend API** : remplacer les données statiques par une vraie API REST

---

## 🐛 Bugs connus et résolus

| Bug | Cause | Solution appliquée |
|-----|-------|-------------------|
| Onglets de navigation ne cliquent pas | `marginBottom:-1` recouvert + pas de `type="button"` | Layout sticky + `type="button"` partout |
| Champs EF se ferment seuls | `onBlur` tué par iframe sandbox | Bouton OK explicite |
| NumInput ne sauvegarde pas | `onBlur` + `useEffect` réinitialise | `onChange` direct |
| TabMeas rooms désynchronisé | State local isolé du parent | Suppression du state local |
| Modèle 3D incontrôlable | Drag SVG perd les events dans iframe | Slider + boutons ← → |
| Crash "Unexpected token" | `React.memo(fn)` parenthèse non fermée | Fonctions simples |
| Crash "unexpected token (51:19)" | Caractères accentués dans data JS | ASCII pur dans les objets de données |
| Optional chaining `on?.85` invalide | `?.` sur un nombre littéral | Ternaire `on ? 0.85 : 0.22` |

---

## 💡 Conventions de code dans ce projet

1. **Pas d'arrow functions dans les render** pour les handlers complexes (utiliser `function`)
2. **Pas de backtick template literals** dans les styles inline (concatenation + pour les strings)
3. **Pas de caractères Unicode/accentués** dans les chaînes JS des objets de données (mettre dans JSX text si nécessaire)
4. **var au lieu de const/let** dans les composants fonctionnels pour éviter les problèmes de parsing
5. **Vérifier avec Babel parser** avant tout commit : `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/App.jsx','utf8'),{sourceType:'module',plugins:['jsx']})"`

---

## 🧪 Vérification rapide

```bash
# Vérifier que le fichier parse correctement
node -e "
const p = require('@babel/parser');
const fs = require('fs');
try {
  p.parse(fs.readFileSync('src/App.jsx','utf8'),{sourceType:'module',plugins:['jsx']});
  console.log('OK');
} catch(e) { console.log('ERREUR ligne',e.loc.line,':',e.message); }
"

# Lancer en dev
npm run dev

# Build de production
npm run build
```

---

## 📞 Historique de session

Cette application a été développée entièrement dans une session Claude.ai (claude-sonnet-4-6).
Les itérations principales :
1. Premier prototype (hover-clone.jsx) — architecture de base
2. Refactorisation multi-agents — 23 bugs corrigés, 4 rapports ajoutés
3. Corrections sandbox — boutons, blur, layout, parsing
4. Réécriture complète — ASCII pur, fonctions simples, parsing vérifié
5. Corrections finales — 3D slider, NumInput onChange direct, TabMeas sans state local

**Total : ~15 itérations, ~1800 lignes de code production.**
