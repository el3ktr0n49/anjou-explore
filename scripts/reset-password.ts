/**
 * Script CLI pour réinitialiser le mot de passe d'un administrateur
 *
 * Usage: bun run scripts/reset-password.ts <adminName>
 * Exemple: bun run scripts/reset-password.ts José
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Fonction pour générer un mot de passe aléatoire sécurisé
function generateSecurePassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '@$!%*?&';
  const all = lowercase + uppercase + numbers + special;

  // Garantir au moins un caractère de chaque type
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Compléter avec des caractères aléatoires jusqu'à 16 caractères
  for (let i = password.length; i < 16; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Mélanger les caractères pour éviter un motif prévisible
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

async function resetPassword() {
  // Récupérer le nom de l'admin depuis les arguments
  const adminName = process.argv[2];

  if (!adminName) {
    console.error('❌ Erreur : Nom d\'administrateur manquant');
    console.log('\nUsage: bun run scripts/reset-password.ts <adminName>');
    console.log('Exemple: bun run scripts/reset-password.ts José');
    console.log('\nAdmins disponibles: José, Fabien, Benoît, Adrien');
    process.exit(1);
  }

  try {
    // Vérifier que l'admin existe
    const admin = await prisma.admin.findUnique({
      where: { name: adminName },
    });

    if (!admin) {
      console.error(`❌ Erreur : Administrateur "${adminName}" non trouvé`);
      console.log('\nAdmins disponibles: José, Fabien, Benoît, Adrien');
      process.exit(1);
    }

    // Générer un nouveau mot de passe
    const newPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour l'admin
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
      },
    });

    console.log('\n' + '═'.repeat(70));
    console.log('✅ Mot de passe réinitialisé avec succès !');
    console.log('═'.repeat(70));
    console.log(`\nAdministrateur: ${adminName}`);
    console.log(`Nouveau mot de passe temporaire: ${newPassword}`);
    console.log('\nℹ️  Instructions:');
    console.log('   1. Communiquez ce mot de passe à l\'administrateur de manière sécurisée');
    console.log('   2. L\'administrateur devra changer son mot de passe au premier login');
    console.log('   3. Ce mot de passe ne sera plus affiché, notez-le maintenant');
    console.log('\n' + '═'.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
resetPassword();
