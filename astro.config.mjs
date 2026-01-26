// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Mode serveur pour supporter les routes API
  vite: {
    plugins: [tailwindcss()]
  }
});