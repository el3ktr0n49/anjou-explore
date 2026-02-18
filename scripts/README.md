# Scripts d'optimisation - Anjou Explore

Ce dossier contient les scripts utilitaires pour optimiser et maintenir les assets du projet.

## 📁 Scripts disponibles

### 1. `optimize-images.ts`

**Commande** : `bun run optimize-images`

**Description** : Compresse et convertit automatiquement toutes les images JPG/PNG en WebP.

**Fonctionnalités** :
- Scan récursif de `src/assets/images/`
- Conversion en WebP (qualité 80%)
- Suppression des originaux
- Rapport détaillé des réductions

**Exemple de sortie** :
```
🖼️  Optimisation des images pour Anjou Explore
📊 25 image(s) trouvée(s)

⚙️  Optimisation: background.jpg...
   ✓ 14.17 MB → 2 MB (-85.9%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 RÉSUMÉ
Images optimisées: 25/25
Taille avant:      45.02 MB
Taille après:      15.89 MB
Économie totale:   29.13 MB (-64.7%)
```

**Quand l'utiliser** :
- Après avoir ajouté de nouvelles images JPG/PNG dans `src/assets/images/`
- Lors d'une migration de contenu depuis Wix
- Pour réoptimiser des images existantes

**Note importante** : Après optimisation, tu dois :
1. Importer l'image dans ton fichier `.astro`
2. Utiliser le composant `<Image>` d'Astro

---

### 2. `update-image-paths.ts` (Obsolète)

**Statut** : Ce script est désormais **obsolète** depuis la migration vers `src/assets/images/`.

**Raison** : Nous utilisons maintenant des imports TypeScript au lieu de chemins en chaîne, donc la mise à jour automatique des chemins n'est plus nécessaire.

**Nouvelle méthode** :
```astro
---
// Import TypeScript (vérifié à la compilation)
import monImage from '../assets/images/ma-photo.webp';
---

<Image src={monImage} alt="Description" />
```

Au lieu de :
```astro
<!-- Ancien système avec chemins en chaîne -->
<img src="/images/ma-photo.webp" alt="Description">
```

---

## 🔧 Configuration

### Modifier la qualité WebP

Éditer `optimize-images.ts` :

```ts
const WEBP_QUALITY = 80; // Valeur par défaut (bon compromis)
// 90-100 : Très haute qualité (taille + importante)
// 70-85  : Qualité moyenne (recommandé pour le web)
// 50-70  : Basse qualité (compression maximale)
```

### Modifier les extensions supportées

Éditer `optimize-images.ts` :

```ts
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif']; // Ajouter .gif si besoin
```

---

## 📝 Workflow recommandé

### Ajout de nouvelles images

1. Copier les images JPG/PNG dans `src/assets/images/[dossier]/` avec un nom descriptif (ex: `hero-banner.jpg`)
2. Exécuter `bun run optimize-images` → Conversion en WebP
3. Dans ton fichier `.astro`, importer l'image :
   ```astro
   import heroImage from '../assets/images/dossier/hero-banner.webp';
   ```
4. Utiliser le composant `<Image src={heroImage} alt="..." />`
5. Vérifier le résultat dans le navigateur (`bun run dev`)
6. Commit uniquement les fichiers `.webp`

### Migration depuis Wix

1. Télécharger toutes les images depuis Wix
2. Les placer dans `src/assets/images/` avec des noms descriptifs
3. Exécuter `bun run optimize-images`
4. Importer les images dans les fichiers `.astro`
5. Remplacer les balises `<img>` par `<Image>` d'Astro
6. Vérifier que tout fonctionne

---

## 🚀 Performance

### Résultats actuels (25 janvier 2026)

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| Nombre d'images | 25 | 25 | - |
| Taille totale | 45 MB | 16 MB | **-65%** |
| Plus gros fichier | 14.17 MB | 2 MB | **-86%** |
| Format | JPG/PNG | WebP | ✅ |

### Impact sur le site

- Temps de chargement initial : **~70% plus rapide**
- Bande passante économisée : **29 MB par visite complète**
- Score Lighthouse (Performance) : **amélioration significative**
- Compatibilité WebP : **96% des navigateurs** (2026)

---

## ⚠️ Important

### Ne PAS commit les originaux

Les images JPG/PNG originales sont supprimées automatiquement par `optimize-images.ts` pour éviter de polluer le repository.

**Bonne pratique** :
```bash
# ✅ Commit uniquement les .webp
git add src/assets/images/**/*.webp
git commit -m "Add optimized images"

# ❌ Ne PAS commit les .jpg/.png
git add src/assets/images/**/*.jpg  # À éviter !
```

### Backup des originaux

Si tu veux conserver les originaux :
1. Les stocker dans un dossier externe (ex: `backup-images/`)
2. Ou les archiver dans un service cloud (Google Drive, etc.)
3. Ne PAS les inclure dans le repository Git

---

## 🔗 Liens utiles

- [Documentation Sharp](https://sharp.pixelplumbing.com/)
- [Composant Image Astro](https://docs.astro.build/en/guides/images/)
- [Guide WebP](https://developers.google.com/speed/webp)
- [Guide complet du projet](../docs/GUIDE-IMAGES.md)
