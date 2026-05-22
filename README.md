# MesurePro

Application web de mesure immobilière professionnelle : modèle 3D, plans
d'élévation, devis, rapports et exports — pour couvreurs et métreurs (BE/Europe).

**Prod :** https://geniuspro71.github.io/mesurepro/

## Démarrage rapide

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm test` | Tests unitaires Vitest (107) |
| `npm run test:e2e` | Tests E2E Playwright |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |

## Déploiement (GitHub Pages, sous-chemin `/mesurepro/`)

```bash
VITE_BASE=/mesurepro/ npm run build
npx gh-pages -d dist
```

## Stack

- React 18 + Vite 5
- React-Three-Fiber + Three.js (modèle 3D)
- jsPDF / SheetJS (exports PDF / Excel)
- Vitest + Playwright (tests)
- Pas de backend — persistance localStorage

## Documentation

- **`CLAUDE.md`** — contexte projet, architecture, pièges connus (à lire en premier).
- **`HANDOFF.md`** — état de la dernière session et reste à faire.
