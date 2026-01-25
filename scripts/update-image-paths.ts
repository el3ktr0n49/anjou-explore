/**
 * Script de mise à jour des chemins d'images dans les fichiers Astro
 *
 * Remplace automatiquement :
 * - .jpg → .webp
 * - .jpeg → .webp
 * - .png → .webp
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const SRC_DIR = './src';
const EXTENSIONS_TO_REPLACE = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

interface ReplaceResult {
  file: string;
  replacements: number;
}

async function getAllAstroFiles(dir: string): Promise<string[]> {
  const astroFiles: string[] = [];

  async function scan(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.astro')) {
        astroFiles.push(fullPath);
      }
    }
  }

  await scan(dir);
  return astroFiles;
}

async function updateImagePaths(filePath: string): Promise<ReplaceResult> {
  let content = await readFile(filePath, 'utf-8');
  let replacements = 0;

  // Remplacer toutes les extensions d'images par .webp
  for (const ext of EXTENSIONS_TO_REPLACE) {
    const regex = new RegExp(`(["'\`])([^"'\`]*?)\\.${ext.replace('.', '')}(["'\`])`, 'gi');
    const matches = content.match(regex);

    if (matches) {
      replacements += matches.length;
      content = content.replace(regex, '$1$2.webp$3');
    }
  }

  if (replacements > 0) {
    await writeFile(filePath, content, 'utf-8');
  }

  return {
    file: filePath,
    replacements
  };
}

async function main() {
  console.log('🔄 Mise à jour des chemins d\'images dans les fichiers Astro\n');

  const astroFiles = await getAllAstroFiles(SRC_DIR);

  if (astroFiles.length === 0) {
    console.log('⚠️  Aucun fichier .astro trouvé');
    return;
  }

  console.log(`📁 ${astroFiles.length} fichier(s) Astro trouvé(s)\n`);

  let totalReplacements = 0;
  const results: ReplaceResult[] = [];

  for (const file of astroFiles) {
    const result = await updateImagePaths(file);

    if (result.replacements > 0) {
      results.push(result);
      totalReplacements += result.replacements;
      console.log(`✓ ${file.replace(SRC_DIR, 'src')}`);
      console.log(`  → ${result.replacements} remplacement(s)\n`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 RÉSUMÉ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Fichiers modifiés:     ${results.length}/${astroFiles.length}`);
  console.log(`Remplacements totaux:  ${totalReplacements}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (totalReplacements === 0) {
    console.log('✅ Aucune mise à jour nécessaire (déjà en .webp ?)');
  } else {
    console.log('✅ Mise à jour terminée !');
  }
}

main().catch(console.error);
