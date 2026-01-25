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
│   │       ├── galerie/
│   │       ├── evenements/
│   │       │   └── ae6/
│   │       ├── formulaire/
│   │       └── reglement/
│   ├── pages/              # File-based routing
│   │   ├── index.astro              # Homepage (/)
│   │   ├── equipe.astro             # (/equipe)
│   │   ├── notre-catalogue.astro    # (/notre-catalogue)
│   │   ├── nos-suggestions.astro    # (/nos-suggestions)
│   │   ├── galerie-photos.astro     # (/galerie-photos)
│   │   ├── formulaire-groupe.astro  # (/formulaire-groupe)
│   │   ├── témoignages.astro        # (/témoignages) - À faire
│   │   └── evenements/
│   │       └── ae6/
│   │           ├── index.astro      # (/evenements/ae6)
│   │           └── reglement.astro  # (/evenements/ae6/reglement)
│   ├── layouts/
│   │   └── Layout.astro    # Main layout (header, footer, navigation)
│   ├── components/         # Reusable components
│   │   └── OptimizedImage.astro  # Wrapper du composant Image d'Astro
│   ├── scripts/            # Scripts TypeScript pour client-side
│   │   ├── galerie-photos.ts      # Lightbox gallery
│   │   └── formulaire-groupe.ts   # Dynamic form logic
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

#### Infrastructure
- ✅ Initialisation du projet avec Astro + Bun + TailwindCSS v4
- ✅ Copie de toutes les images depuis Wix (19 fichiers, 44MB)
- ✅ **Optimisation des images** :
  - Conversion automatique en WebP (script `optimize-images.ts`)
  - Réduction de 65% : 45 MB → 16 MB
  - Mise à jour automatique des chemins dans les fichiers .astro
  - Composant `<OptimizedImage>` créé
  - Guide complet : [GUIDE-IMAGES.md](GUIDE-IMAGES.md)

#### Layout & Navigation
- ✅ Layout complet (`src/layouts/Layout.astro`) :
  - Header avec logo Anjou Explore
  - Navigation desktop avec sous-menus hover :
    - Notre Catalogue > Nos Suggestions
    - Evènements > Anjou Explore #6
  - Bouton Contact doré + téléphone + icônes sociales
  - Footer beige avec infos de contact
  - Menu mobile responsive
- ✅ Palette de couleurs Wix :
  - Or : #c4a571
  - Olive : #6b7456
  - Marron : #4a3b2f
  - Beige : #f5f1e8

#### Pages Migrées
- ✅ **Page d'accueil** (`index.astro`) :
  - Hero avec effet parallaxe (background-attachment: fixed)
  - Logo + bandeau transparent au-dessus du titre
  - Section "Qui sommes-nous ?" avec rectangle blanc sur fond doré
  - Images canoë + groupe Loire
  - Section Nos Partenaires (3 logos avec liens cliquables)
- ✅ **Page L'Équipe** (`equipe.astro`) :
  - Présentation de José, Fabien et Benoît avec photos
  - Cartes élégantes avec hover effects
- ✅ **Page Notre Catalogue** (`notre-catalogue.astro`) :
  - 4 formules : All Inclusive, Adventure, Adventure +, Race
  - Layout alternant image/texte avec CTA
- ✅ **Page Nos Suggestions** (`nos-suggestions.astro`) :
  - Hero avec parallaxe
  - Sections : Châteaux, Caves, Restaurants, Musées, Activités insolites
- ✅ **Page Formulaire Groupe** (`formulaire-groupe.astro`) :
  - Formulaire dynamique avec toggle checkbox
  - Champs conditionnels pour réservations
  - Script externe : `src/scripts/formulaire-groupe.ts`
- ✅ **Page Galerie Photos** (`galerie-photos.astro`) :
  - Grille responsive (1/2/3 colonnes)
  - Lightbox avec navigation (prev/next, clavier)
  - Effets hover élégants
  - Script externe : `src/scripts/galerie-photos.ts`
- ✅ **Page Evènement AE6** (`evenements/ae6/index.astro`) :
  - Structure extensible pour futurs évènements
  - Badge "Évènement terminé"
  - Logo partenaire (Domaine de Nerleux)
  - Programme détaillé avec sections colorées
  - Flyer avec effet poster
  - Bouton réservation désactivé
  - Lien vers règlement
- ✅ **Page Règlement** (`evenements/ae6/reglement.astro`) :
  - Règlement complet du Défi Anjou Explore
  - Sections structurées et colorées
  - Hero avec parallaxe
  - Lien retour vers évènement

### 📋 À faire
- Page Témoignages
- Intégration API SumUp pour les paiements (évènements AE6+)
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
- Structure hiérarchique avec sous-menus :
  - Accueil
  - L'équipe
  - Notre Catalogue
    - Nos Suggestions
  - Evènements
    - Anjou Explore #6 (avec lien vers Règlement dans la page)
  - Galerie Photos
  - Contact (bouton doré mis en évidence)
- Menu responsive avec hamburger sur mobile
- Architecture extensible pour futurs évènements

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
