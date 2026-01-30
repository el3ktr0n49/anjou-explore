// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  // Mode serveur pour supporter les routes API
  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [preact()]
});