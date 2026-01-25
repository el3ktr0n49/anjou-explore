/**
 * Script d'optimisation des images pour Anjou Explore
 *
 * Ce script :
 * - Compresse toutes les images JPG/PNG du dossier public/images
 * - Les convertit en WebP pour réduire la taille (~30-80% de réduction)
 * - Remplace les originaux par les versions optimisées
 * - Conserve une liste des conversions effectuées
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync, unlinkSync } from 'fs';

const ASSETS_IMAGES_DIR = './src/assets/images';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const WEBP_QUALITY = 80; // Bon compromis qualité/taille

interface ConversionResult {
  original: string;
  newFile: string;
  originalSize: number;
  newSize: number;
  reduction: number;
}

async function getAllImages(dir: string): Promise<string[]> {
  const images: string[] = [];

  async function scan(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          images.push(fullPath);
        }
      }
    }
  }

  await scan(dir);
  return images;
}

async function optimizeImage(imagePath: string): Promise<ConversionResult> {
  const ext = extname(imagePath);
  const baseName = basename(imagePath, ext);
  const dir = imagePath.replace(basename(imagePath), '');
  const newPath = join(dir, `${baseName}.webp`);

  // Taille originale
  const originalStats = await stat(imagePath);
  const originalSize = originalStats.size;

  // Optimisation avec Sharp
  await sharp(imagePath)
    .webp({ quality: WEBP_QUALITY })
    .toFile(newPath);

  // Taille après optimisation
  const newStats = await stat(newPath);
  const newSize = newStats.size;

  // Suppression de l'original
  unlinkSync(imagePath);

  const reduction = ((originalSize - newSize) / originalSize) * 100;

  return {
    original: imagePath,
    newFile: newPath,
    originalSize,
    newSize,
    reduction
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function main() {
  console.log('🖼️  Optimisation des images pour Anjou Explore\n');
  console.log(`📁 Scan du dossier: ${ASSETS_IMAGES_DIR}\n`);

  const images = await getAllImages(ASSETS_IMAGES_DIR);

  if (images.length === 0) {
    console.log('✅ Aucune image à optimiser (toutes déjà en WebP ?)');
    return;
  }

  console.log(`📊 ${images.length} image(s) trouvée(s)\n`);

  const results: ConversionResult[] = [];
  let totalOriginalSize = 0;
  let totalNewSize = 0;

  for (const image of images) {
    try {
      console.log(`⚙️  Optimisation: ${basename(image)}...`);
      const result = await optimizeImage(image);
      results.push(result);

      totalOriginalSize += result.originalSize;
      totalNewSize += result.newSize;

      console.log(`   ✓ ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (-${result.reduction.toFixed(1)}%)\n`);
    } catch (error) {
      console.error(`   ✗ Erreur: ${error}\n`);
    }
  }

  // Résumé
  const totalReduction = ((totalOriginalSize - totalNewSize) / totalOriginalSize) * 100;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 RÉSUMÉ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Images optimisées: ${results.length}/${images.length}`);
  console.log(`Taille avant:      ${formatBytes(totalOriginalSize)}`);
  console.log(`Taille après:      ${formatBytes(totalNewSize)}`);
  console.log(`Économie totale:   ${formatBytes(totalOriginalSize - totalNewSize)} (-${totalReduction.toFixed(1)}%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✅ Optimisation terminée !');
  console.log('\n💡 Prochaines étapes:');
  console.log('   1. Mettre à jour les chemins dans les fichiers .astro (.jpg → .webp)');
  console.log('   2. Utiliser le composant <Image> d\'Astro pour lazy loading');
}

main().catch(console.error);
