// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import preact from '@astrojs/preact';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // Mode static (défaut Astro 5) : Pages pré-générées (SSG) + Routes API serveur (SSR)
  // - Pages .astro sont pré-générées au build → servi depuis dist/client/ (statique)
  // - Routes /api/* sont toujours SSR → exécutées par le serveur Node
  // ⚠️ IMPORTANT : Ce changement réduit drastiquement la consommation mémoire/CPU
  //    car les pages HTML sont servies statiquement au lieu d'être rendues à chaque requête
  output: 'static',

  // Adapter Node requis pour les routes API (même en mode static)
  adapter: node({
    mode: 'standalone'
  }),

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [preact()]
});