# MesurePro — Clone Hover

Application de mesure immobilière professionnelle avec modèle 3D isométrique.

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvre automatiquement http://localhost:3000

## Fonctionnalités

- **Tableau de bord** : 4 projets exemples avec statuts
- **Modèle 3D** : Vue isométrique SVG pivotable (slider + boutons)
- **Mesures** : 7 champs de saisie + tableau des façades CRUD
- **Design** : Prévisualisation de 6 matériaux sur la maison
- **Devis** : Calcul automatique HT/TVA/TTC + marge commerciale
- **Rapports** : 4 rapports complets et éditables in-place

## Contexte Claude Code

Voir **CLAUDE_CODE_CONTEXT.md** pour la documentation complète,
l'architecture, les bugs résolus, la roadmap et les conventions de code.

## Stack

- React 18 + Vite 5
- Zéro dépendance UI (CSS-in-JS pur)
- Zéro canvas (SVG isométrique)
