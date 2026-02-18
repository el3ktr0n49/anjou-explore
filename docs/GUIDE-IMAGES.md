# Guide d'utilisation des images optimisées

## 📦 Résumé de l'optimisation

Toutes les images ont été converties en **WebP** avec une réduction de **65%** :
- **Avant** : 45 MB
- **Après** : 16 MB
- **Économie** : 29 MB

**Nouvelle architecture** : Les images sont maintenant dans `src/assets/images/` pour une optimisation maximale par Astro.

## 🎯 Comment utiliser les images

### Approche recommandée : Composant `<Image>` d'Astro avec imports

Pour une optimisation maximale avec lazy loading, srcset automatique, et responsive :

```astro
---
import { Image } from 'astro:assets';
import heroImage from '../assets/images/homepage/IMG_0017.webp';
---

<Image
  src={heroImage}
  alt="Groupe en escapade sur la Loire"
  quality={85}
  loading="lazy"
  class="w-full h-auto rounded-lg"
/>
```

**Avantages** :
- ✅ Génération automatique de plusieurs tailles (responsive)
- ✅ Lazy loading natif
- ✅ Format moderne (WebP/AVIF)
- ✅ Optimisation supplémentaire à la build
- ✅ `srcset` automatique pour les différentes résolutions d'écran
- ✅ **Inférence automatique des dimensions** (pas besoin de width/height)
- ✅ **Vérification à la compilation** (erreur si l'image n'existe pas)
- ✅ **Cache busting automatique** (URLs avec hash)

**Note** : Avec l'import, Astro détecte automatiquement les dimensions de l'image, donc `width` et `height` sont optionnels.

---

### Images de fond CSS avec imports

Pour les images de fond (comme le hero de la homepage) :

```astro
---
import backgroundImage from '../assets/images/reglement/background.webp';
---

<div
  class="bg-cover bg-center bg-fixed"
  style={`background-image: url(${backgroundImage.src});`}
>
  <!-- Contenu -->
</div>
```

**Alternative avec define:vars** (recommandé pour le CSS) :

```astro
---
import backgroundImage from '../assets/images/reglement/background.webp';
---

<div class="hero-section">
  <!-- Contenu -->
</div>

<style define:vars={{ bgUrl: backgroundImage.src }}>
  .hero-section {
    background-image: url(var(--bgUrl));
    background-size: cover;
    background-position: center;
  }
</style>
```

---

## 🚀 Scripts disponibles

### Optimiser de nouvelles images

Si tu ajoutes de nouvelles images JPG/PNG dans `src/assets/images/` :

```bash
bun run optimize-images
```

Ce script :
- Convertit automatiquement en WebP
- Compresse avec qualité 80%
- Remplace les originaux
- Affiche les statistiques de réduction

**Note** : Le script `update-image-paths` n'est plus nécessaire car nous utilisons maintenant des imports TypeScript au lieu de chemins en chaîne.

---

## 📋 Checklist pour ajouter une nouvelle image

1. Ajouter l'image JPG/PNG dans `src/assets/images/[dossier]/` avec un nom lisible (ex: `hero-banner.jpg`)
2. Exécuter `bun run optimize-images` pour convertir en WebP
3. Importer l'image dans ton fichier `.astro` :
   ```astro
   import monImage from '../assets/images/dossier/hero-banner.webp';
   ```
4. Utiliser le composant `<Image src={monImage} alt="..." />`

---

## 🎨 Exemples concrets

### Image dans une card

```astro
---
import { Image } from 'astro:assets';
import teamPhoto from '../assets/images/equipe/José.webp';
---

<div class="bg-white rounded-lg shadow-lg p-6">
  <Image
    src={teamPhoto}
    alt="José, guide Anjou Explore"
    class="rounded-full mx-auto"
  />
  <h3 class="text-xl font-bold mt-4">José</h3>
  <p class="text-gray-600">Guide nature</p>
</div>
```

**Note** : Avec les imports, pas besoin de spécifier `width` et `height` - Astro les détecte automatiquement !

### Image responsive avec breakpoints

```astro
---
import { Image } from 'astro:assets';
import landscape from '../assets/images/catalogue/velo-foret.webp';
---

<Image
  src={landscape}
  alt="Balade à vélo en forêt"
  widths={[400, 800, 1200]}
  sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  class="w-full h-auto"
/>
```

---

## 💡 Bonnes pratiques

### ✅ À faire
- Toujours ajouter un attribut `alt` descriptif
- Utiliser `loading="lazy"` pour les images below-the-fold
- Spécifier `width` et `height` pour éviter le layout shift
- Compresser les images AVANT de les commit

### ❌ À éviter
- Commit d'images JPG/PNG non optimisées (> 500 KB)
- Oublier le texte alternatif (mauvais pour l'accessibilité et le SEO)
- Utiliser des images trop grandes pour le besoin réel

---

## 🔧 Configuration avancée (optionnel)

### Changer la qualité WebP

Éditer `scripts/optimize-images.ts` :

```ts
const WEBP_QUALITY = 80; // Par défaut 80, augmenter pour + de qualité
```

### Ajouter AVIF (format encore + performant)

Astro peut générer du AVIF automatiquement :

```astro
<Image
  src={myImage}
  format="avif"  <!-- Encore meilleur que WebP -->
  quality={80}
/>
```

---

## 📊 Résultats actuels

| Image | Avant | Après | Réduction |
|-------|-------|-------|-----------|
| background.jpg | 14.17 MB | 2 MB | -86% |
| marcheur.jpg | 7.46 MB | 2.84 MB | -62% |
| Logo VandB | 457 KB | 66 KB | -85% |

**Total** : 45 MB → 16 MB (-65%)
