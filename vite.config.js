import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* `base` est lu uniquement par `vite build` :
   - npm run build (dev local) : base = "/"
   - npm run build:pages : base = "/mesurepro/" (chemin sous github.io)
   On distingue via la variable d'env VITE_BASE.
*/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  server: {
    port: 3000,
    strictPort: true,
    host: "127.0.0.1",
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
