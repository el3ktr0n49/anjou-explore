# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anjou Explore** - Site web pour une association proposant des escapades nature, patrimoine et gastronomie dans la région de l'Anjou (France).

Ce projet est une migration d'un site Wix vers une stack moderne basée sur Astro et Bun.

### Stack Technique
- **Framework**: Astro 5.x (SSG - Static Site Generation)
- **Runtime**: Bun (au lieu de Node.js)
- **Styling**: TailwindCSS v4
- **Language**: TypeScript
- **Déploiement futur**: Docker/Kubernetes

### Pourquoi Astro ?
- Site principalement statique avec quelques éléments interactifs (formulaires)
- Performance optimale pour le SEO
- HTML généré par défaut, JavaScript uniquement où nécessaire
- Architecture "Islands" pour les composants interactifs
- Facilité d'évolution vers une architecture avec API/BDD

## Commands

### Development
```bash
bun.exe run dev          # Start dev server on http://localhost:4321
bun.exe run build        # Build for production
bun.exe run preview      # Preview production build
```

### Package Management
```bash
bun.exe install          # Install dependencies
bun.exe add <package>    # Add a dependency
```

### Astro-specific
```bash
bun.exe astro add <integration>  # Add Astro integrations (react, vue, etc.)
bun.exe astro telemetry disable  # Disable telemetry
```

### Image Optimization
```bash
bun.exe run optimize-images       # Compresse et convertit toutes les images en WebP
bun.exe run update-image-paths    # Met à jour les chemins d'images dans les fichiers .astro
```

## Project Structure

```
anjouexplore/
├── src/
│   ├── assets/
│   │   └── images/         # Images optimisées (WebP) - importées dans les fichiers .astro
│   │       ├── homepage/
│   │       ├── equipe/
│   │       ├── catalogue/
│   │       ├── suggestions/
│   │       ├── ae6/
│   │       ├── formulaire/
│   │       └── reglement/
│   ├── pages/              # File-based routing
│   │   ├── index.astro           # Homepage (/)
│   │   ├── notre-catalogue.astro # (/notre-catalogue)
│   │   ├── nos-suggestions.astro # (/nos-suggestions)
│   │   ├── l-équipe.astro        # (/l-équipe)
│   │   ├── galerie-photos.astro  # (/galerie-photos)
│   │   ├── témoignages.astro     # (/témoignages)
│   │   ├── formulaire-groupe.astro # (/formulaire-groupe)
│   │   ├── règlement-course.astro  # (/règlement-course)
│   │   └── ae6.astro             # (/ae6)
│   ├── layouts/
│   │   └── Layout.astro    # Main layout (header, footer, navigation)
│   ├── components/         # Reusable components
│   │   └── OptimizedImage.astro  # Wrapper du composant Image d'Astro
│   └── styles/
│       └── global.css      # TailwindCSS import
├── public/                 # Assets statiques non traités (favicon, robots.txt, etc.)
├── scripts/                # Scripts d'optimisation
│   ├── optimize-images.ts  # Conversion JPG/PNG → WebP
│   └── update-image-paths.ts  # (legacy) Mise à jour chemins
├── screenshots/            # Wix site screenshots for migration reference
└── astro.config.mjs        # Astro configuration
```

## Architecture & Patterns

### Routing
Astro utilise le **file-based routing**. Chaque fichier `.astro` dans `src/pages/` devient automatiquement une route.

### Layout System
- Le layout principal (`src/layouts/Layout.astro`) contient :
  - Header avec navigation (responsive avec menu mobile)
  - Footer avec informations de contact
  - Import des styles globaux (TailwindCSS)
  - Structure HTML de base

### Components
- Les pages utilisent le composant `<Layout>` pour une structure cohérente
- Props importantes : `title` (requis) et `description` (optionnel)

### Styling
- **TailwindCSS v4** avec la nouvelle syntaxe `@import "tailwindcss"`
- Classes utility-first directement dans les templates
- Palette de couleurs principale : vert (green-600, green-700) pour représenter la nature

### Images
- **Localisation** : `src/assets/images/` (optimisation maximale par Astro)
- **Format** : Toutes les images sont en **WebP** (optimisées automatiquement)
- **Taille** : 16 MB au total (réduit de 65% depuis les originaux)
- **Usage** : Imports TypeScript + composant `<Image>` d'Astro
- **Outil** : Sharp pour la compression et conversion
- **Nommage** : Utiliser des noms descriptifs en kebab-case (ex: `canoe.webp`, `hero-background.webp`)
- **Voir** : [GUIDE-IMAGES.md](GUIDE-IMAGES.md) pour les détails complets

**Exemple d'utilisation** :
```astro
---
import { Image } from 'astro:assets';
import heroImage from '../assets/images/homepage/canoe.webp';
---

<Image src={heroImage} alt="Description" loading="lazy" />
```

## Migration Status

### ✅ Complété (25 janvier 2026)
- ✅ Initialisation du projet avec Astro + Bun + TailwindCSS v4
- ✅ Copie de toutes les images depuis Wix (19 fichiers, 44MB)
- ✅ **Optimisation des images** :
  - Conversion automatique en WebP (script `optimize-images.ts`)
  - Réduction de 65% : 45 MB → 16 MB
  - Mise à jour automatique des chemins dans les fichiers .astro
  - Composant `<OptimizedImage>` créé
  - Guide complet : [GUIDE-IMAGES.md](GUIDE-IMAGES.md)
- ✅ Layout complet :
  - Header avec logo Anjou Explore
  - Navigation avec sous-menus hover (Notre Catalogue > Nos Suggestions, Anjou Explore #6 > Règlement)
  - Bouton Contact doré + téléphone + icônes sociales
  - Footer beige avec infos de contact
  - Menu mobile responsive
- ✅ **Page d'accueil complète** :
  - Hero avec effet parallaxe (background-attachment: fixed)
  - Logo + bandeau transparent au-dessus du titre
  - Section "Qui sommes-nous ?" avec rectangle blanc sur fond doré
  - Images canoë + groupe Loire
  - Section Nos Partenaires (3 logos avec liens cliquables)
- ✅ Palette de couleurs Wix :
  - Or : #c4a571
  - Olive : #6b7456
  - Marron : #4a3b2f
  - Beige : #f5f1e8

### 🔄 En cours (prochaine étape)
- Page L'Équipe (José, Fabien, Benoît - 3 cartes avec photos)
- Migration des autres pages (Notre Catalogue, Nos Suggestions, AE6, Formulaire, Règlement)

### 📋 À faire
- Amélioration du design (header plus fin, meilleure navigation)
- Page Galerie Photos
- Page Témoignages
- Intégration API SumUp pour les paiements
- Base de données (gestion paiements + auth admin)
- Page d'administration
- Configuration Docker/Kubernetes

## Important Notes

### Paiements SumUp
- L'intégration de l'API SumUp était la principale difficulté sur Wix
- À réintégrer plus tard après migration du contenu statique
- Sera intégré dans le formulaire groupe

### Contact
- Téléphone : 06.83.92.45.03
- Mettre à jour dans le footer si changement

### Navigation
- 9 pages au total (incluant l'accueil)
- Menu responsive avec hamburger sur mobile
- "Formulaire Groupe" mis en évidence (bouton vert)

### Composants à créer
Composants réutilisables à extraire au fur et à mesure :
- Card d'activité
- Testimonial card
- Gallery image component
- Form input components

### Best Practices pour ce Projet
- Privilégier la simplicité : c'est un site vitrine, pas une application complexe
- Optimiser les images avant de les ajouter (performance)
- Garder le même ton et style visuel que le site Wix original
- Tester la responsivité mobile (beaucoup d'utilisateurs sur mobile)

## Development Workflow

1. **Ajout d'une nouvelle page** : Créer un fichier `.astro` dans `src/pages/`
2. **Modification du layout** : Éditer `src/layouts/Layout.astro`
3. **Ajout de composants** : Créer dans `src/components/` et importer où nécessaire
4. **Ajout d'assets** : Placer dans `public/` (accessible via `/filename.ext`)
5. **Styling** : Utiliser les classes TailwindCSS directement dans les templates

## Future Enhancements

- **Backend API** : À créer pour gérer les réservations et paiements
- **Database** : PostgreSQL ou SQLite pour stocker les réservations
- **Auth System** : Pour la page d'administration
- **Email Notifications** : Envoyer des confirmations de réservation
- **CMS** : Éventuellement ajouter un headless CMS pour faciliter l'édition de contenu
