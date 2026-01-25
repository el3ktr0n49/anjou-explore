# Anjou Explore

Site web pour l'association Anjou Explore - Escapades nature, patrimoine et gastronomie en Anjou.

## 🚀 Migration depuis Wix

Ce projet est une migration du site Wix vers une stack moderne :
- **Framework** : Astro 5.x
- **Runtime** : Bun
- **Styling** : TailwindCSS v4
- **Language** : TypeScript

## 📋 État de la Migration

### ✅ Fait
- [x] Structure de base du projet
- [x] Layout avec header/footer responsive
- [x] 9 pages créées avec structure de base
- [x] Formulaire groupe fonctionnel (sans paiement)
- [x] Navigation complète

### 🔄 En cours
- [ ] Migration du contenu exact depuis Wix (screenshots en cours)
- [ ] Images et assets
- [ ] Galerie photos

### 📅 À venir
- [ ] Intégration API SumUp (paiements)
- [ ] Base de données
- [ ] Page d'administration
- [ ] Déploiement Docker/Kubernetes

## 🛠️ Commandes

```bash
# Développement
bun run dev      # Démarre le serveur sur http://localhost:4321

# Build
bun run build    # Build de production
bun run preview  # Preview du build

# Dépendances
bun install      # Installe les dépendances
bun add <pkg>    # Ajoute un package
```

## 📁 Structure

```
src/
├── pages/           # Routes (file-based routing)
│   ├── index.astro              # Accueil
│   ├── notre-catalogue.astro    # Catalogue des activités
│   ├── nos-suggestions.astro    # Suggestions
│   ├── l-équipe.astro           # Présentation de l'équipe
│   ├── galerie-photos.astro     # Galerie photos
│   ├── témoignages.astro        # Témoignages clients
│   ├── formulaire-groupe.astro  # Formulaire de réservation
│   ├── règlement-course.astro   # Règlement
│   └── ae6.astro                # Page AE6
├── layouts/
│   └── Layout.astro # Layout principal
├── components/      # Composants réutilisables (à créer)
└── styles/
    └── global.css   # TailwindCSS

public/              # Assets statiques
screenshots/         # Screenshots du site Wix (référence)
```

## 🎨 Design

- **Couleur principale** : Vert (nature, Anjou)
- **Responsive** : Mobile-first avec menu hamburger
- **TailwindCSS** : Classes utility-first

## 📝 Prochaines Étapes

1. **Capturer screenshots du site Wix** (en cours)
2. **Migrer le contenu** page par page
3. **Ajouter images et assets**
4. **Affiner le formulaire** selon l'original
5. **Intégrer SumUp** pour les paiements

## 📞 Contact

Site original : https://www.anjouexplore.com/
Téléphone : 06.83.92.45.03

## 📚 Documentation

- [Astro Docs](https://docs.astro.build)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Bun Docs](https://bun.sh/docs)
- Voir [CLAUDE.md](./CLAUDE.md) pour plus de détails techniques
