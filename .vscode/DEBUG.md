# Guide de Debug avec Bun dans VSCode

## Configuration créée

Le fichier `.vscode/launch.json` contient 2 configurations :

### 1. Debug Astro Server (Bun)
Lance le serveur Astro avec le debugger attaché.

**Utilisation :**
1. Placez des breakpoints dans votre code (par ex. dans `src/pages/api/auth/login.ts`)
2. Appuyez sur `F5` ou allez dans Run > Start Debugging
3. Sélectionnez "Debug Astro Server (Bun)"
4. Le serveur démarre et s'arrête aux breakpoints

**Options :**
- `--inspect-wait` : Attend que le debugger soit attaché avant de démarrer
- Changez pour `--inspect` si vous voulez que le serveur démarre immédiatement

### 2. Attach to Bun
Se connecte à un processus Bun déjà en cours.

**Utilisation :**
1. Démarrez manuellement le serveur avec `bun --inspect run dev`
2. Dans VSCode, lancez "Attach to Bun"
3. Le debugger se connecte sur le port 9229

## Commandes manuelles

### Démarrer avec debugger (sans VSCode)
```bash
bun --inspect run dev           # Debugger disponible immédiatement
bun --inspect-wait run dev      # Attend la connexion du debugger
bun --inspect-brk run dev       # Pause à la première ligne
```

### Port personnalisé
```bash
bun --inspect=127.0.0.1:9229 run dev
```

## Debugging dans le terminal

### Console logs
Les `console.log()`, `console.error()` apparaissent dans :
- Terminal intégré VSCode
- Console du debugger VSCode

### Variables
Dans le debugger, vous pouvez :
- Inspecter les variables locales
- Évaluer des expressions
- Voir la call stack
- Utiliser la console pour exécuter du code

## Breakpoints

### Breakpoints classiques
Cliquez dans la marge gauche de l'éditeur (ligne rouge)

### Conditional breakpoints
Clic droit > Add Conditional Breakpoint
Exemple : `adminName === 'José'`

### Logpoints
Clic droit > Add Logpoint
Exemple : `Token 2FA: {token2FA}`

## Debugger Statement

Ajoutez `debugger;` directement dans votre code :

```typescript
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  debugger; // Le debugger s'arrêtera ici
  
  const { password, adminName, token2FA } = body;
  // ...
}
```

## Problèmes courants

### Le debugger ne se connecte pas
- Vérifiez que le port 9229 n'est pas déjà utilisé
- Essayez de redémarrer VSCode
- Utilisez `bun --inspect-wait` au lieu de `--inspect`

### Les breakpoints sont grisés
- VSCode n'a pas trouvé le fichier source
- Vérifiez que vous avez sauvegardé le fichier
- Redémarrez le debugger

### Pas de logs dans la console
- Vérifiez que vous êtes dans la bonne console (Debug Console vs Terminal)
- Utilisez `console.error()` qui est toujours affiché

## Tips

- Utilisez la Debug Console pour exécuter du code dans le contexte actuel
- Watch expressions pour suivre des variables
- Call Stack pour voir le chemin d'exécution
- Utilisez `--hot` avec précaution (peut interférer avec le debugger)

## Documentation

- [Bun Debugger](https://bun.sh/docs/runtime/debugger)
- [VSCode Debugging](https://code.visualstudio.com/docs/editor/debugging)
