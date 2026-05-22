import { defineConfig, devices } from "@playwright/test";

/* Tests E2E MesurePro.
   L'app est buildée avec le MÊME base path que la prod GitHub Pages
   (/mesurepro/) puis servie via `vite preview`, pour que les E2E
   valident exactement la configuration de production. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  /* Le build est fait AVANT par le script `test:e2e` (séquentiel) pour
     éviter toute reconstruction de dist/ concurrente du serveur preview.
     VITE_BASE est OBLIGATOIRE aussi pour `vite preview` : sans lui le
     serveur sert sous "/" alors que le build cible "/mesurepro/" → les
     bundles tombent en 404. */
  webServer: {
    command: "VITE_BASE=/mesurepro/ npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173/mesurepro/",
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
