/**
 * Prisma Seed Script - Initialisation de la base de données
 *
 * Exécuter avec: bun run db:seed
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { generateSecret, generate, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Début du seed de la base de données...\n');

  // ═══════════════════════════════════════════════════════════
  // 1. CRÉATION DES ADMINS AVEC 2FA
  // ═══════════════════════════════════════════════════════════

  console.log('👤 Création des administrateurs...');

  const adminNames = ['José', 'Fabien', 'Benoît', 'Adrien'];
  const admins: Array<{ name: string; secret: string; qrCode: string; password: string }> = [];

  for (const name of adminNames) {
    // Générer un secret unique pour Google Authenticator
    const secret = generateSecret();

    // Créer l'URI pour le QR Code
    // Format: otpauth://totp/AnjouExplore:José?secret=XXXXX&issuer=AnjouExplore
    const otpauth = generateURI({
      issuer: 'AnjouExplore',
      label: `${name}`,
      secret,
    }
    );

    // Générer le QR Code en base64
    const qrCodeDataURL = await QRCode.toDataURL(otpauth);

    // Générer un mot de passe par défaut
    const defaultPassword = `AnjouExplore2026_${name}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Créer ou mettre à jour l'admin
    await prisma.admin.upsert({
      where: { name },
      update: {
        secret2FA: secret,
        password: hashedPassword,
        mustChangePassword: true,
        isActive: true,
      },
      create: {
        name,
        secret2FA: secret,
        password: hashedPassword,
        mustChangePassword: true,
        isActive: true,
      },
    });

    admins.push({ name, secret, qrCode: qrCodeDataURL, password: defaultPassword });
    console.log(`  ✓ ${name} créé avec secret 2FA et mot de passe par défaut`);
  }

  console.log('\n🔐 Mots de passe par défaut:\n');
  console.log('IMPORTANT : Ces mots de passe doivent être changés au premier login !\n');
  console.log('═'.repeat(70));

  for (const admin of admins) {
    console.log(`\n${admin.name}:`);
    console.log(`  Mot de passe : ${admin.password}`);
    console.log('─'.repeat(70));
  }

  console.log('\n📱 QR Codes pour Google Authenticator:\n');
  console.log('Scannez ces QR codes avec votre app Google Authenticator:\n');
  console.log('═'.repeat(70));

  for (const admin of admins) {
    console.log(`\n${admin.name}:`);
    console.log(`Secret: ${admin.secret}`);
    console.log(`QR Code (ouvrir dans navigateur):`);
    console.log(admin.qrCode);
    console.log('─'.repeat(70));
  }

  // ═══════════════════════════════════════════════════════════
  // 2. CRÉATION DES ÉVÉNEMENTS
  // ═══════════════════════════════════════════════════════════

  console.log('\n🎪 Création des événements...');

  // AE6 - Événement passé (2025)
  const ae6 = await prisma.event.upsert({
    where: { slug: 'ae6' },
    update: {},
    create: {
      name: 'Anjou Explore #6',
      slug: 'ae6',
      description: 'Édition 2025 au Domaine de Nerleux',
      date: new Date('2025-06-14'),
      status: 'CLOSED',
      paymentEnabled: true,
      registrationDeadline: new Date('2025-06-07'),
      registrationOpenOverride: false, // Forcé fermé
      location: 'Domaine de Nerleux, Varennes-sur-Loire',
      partnerLogo: '/images/partners/nerleux.png',
    },
  });

  console.log(`  ✓ Événement "${ae6.name}" créé (${ae6.slug}) - CLOSED`);

  // AE7 - Événement futur (2026)
  const ae7 = await prisma.event.upsert({
    where: { slug: 'ae7' },
    update: {},
    create: {
      name: 'Anjou Explore #7',
      slug: 'ae7',
      description: 'Nouvelle édition 2026 avec parcours inédits',
      date: new Date('2026-06-20'),
      status: 'OPEN',
      paymentEnabled: true,
      registrationDeadline: new Date('2026-06-13'),
      registrationOpenOverride: null, // Mode auto (géré par deadline)
      location: 'À confirmer',
    },
  });

  console.log(`  ✓ Événement "${ae7.name}" créé (${ae7.slug}) - OPEN`);

  // ═══════════════════════════════════════════════════════════
  // 3. CRÉATION DES ACTIVITÉS ET TARIFS POUR AE6
  // ═══════════════════════════════════════════════════════════

  console.log('\n🏃 Création des activités pour AE6...');

  // Activité 1 : Rando Papilles (AE6)
  const ae6RandoPapilles = await prisma.activity.upsert({
    where: {
      eventId_name: {
        eventId: ae6.id,
        name: 'rando papilles',
      },
    },
    update: {},
    create: {
      eventId: ae6.id,
      name: 'rando papilles',
      description: 'Randonnée gourmande avec dégustation de produits locaux',
      maxParticipants: 50,
    },
  });

  console.log(`  ✓ Activité "${ae6RandoPapilles.name}" créée (max ${ae6RandoPapilles.maxParticipants} places)`);

  // Tarifs Rando Papilles AE6
  await prisma.eventPricing.upsert({
    where: {
      activityId_priceType: {
        activityId: ae6RandoPapilles.id,
        priceType: 'adulte',
      },
    },
    update: {},
    create: {
      activityId: ae6RandoPapilles.id,
      priceType: 'adulte',
      label: 'Adulte (+16 ans)',
      price: 45,
    },
  });

  await prisma.eventPricing.upsert({
    where: {
      activityId_priceType: {
        activityId: ae6RandoPapilles.id,
        priceType: 'enfant',
      },
    },
    update: {},
    create: {
      activityId: ae6RandoPapilles.id,
      priceType: 'enfant',
      label: 'Enfant (6-15 ans)',
      price: 25,
    },
  });

  console.log(`    - Adulte: 45€ | Enfant: 25€`);

  // Activité 2 : Le Défi (AE6)
  const ae6Defi = await prisma.activity.upsert({
    where: {
      eventId_name: {
        eventId: ae6.id,
        name: 'le défi',
      },
    },
    update: {},
    create: {
      eventId: ae6.id,
      name: 'le défi',
      description: 'Parcours sportif avec défis et énigmes',
      maxParticipants: 30,
    },
  });

  console.log(`  ✓ Activité "${ae6Defi.name}" créée (max ${ae6Defi.maxParticipants} places)`);

  // Tarifs Le Défi AE6
  await prisma.eventPricing.upsert({
    where: {
      activityId_priceType: {
        activityId: ae6Defi.id,
        priceType: 'adulte',
      },
    },
    update: {},
    create: {
      activityId: ae6Defi.id,
      priceType: 'adulte',
      label: 'Adulte (+16 ans)',
      price: 50,
    },
  });

  await prisma.eventPricing.upsert({
    where: {
      activityId_priceType: {
        activityId: ae6Defi.id,
        priceType: 'enfant',
      },
    },
    update: {},
    create: {
      activityId: ae6Defi.id,
      priceType: 'enfant',
      label: 'Enfant (6-15 ans)',
      price: 30,
    },
  });

  console.log(`    - Adulte: 50€ | Enfant: 30€`);

  // ═══════════════════════════════════════════════════════════
  // 4. CRÉATION DES ACTIVITÉS ET TARIFS POUR AE7
  // ═══════════════════════════════════════════════════════════

  console.log('\n🏃 Création des activités pour AE7...');

  // Activité 1 : Rando Papilles (AE7)
  const ae7RandoPapilles = await prisma.activity.upsert({
    where: {
      eventId_name: {
        eventId: ae7.id,
        name: 'rando papilles',
      },
    },
    update: {},
    create: {
      eventId: ae7.id,
      name: 'rando papilles',
      description: 'Randonnée gourmande avec dégustation de produits locaux',
      maxParticipants: 60,
    },
  });

  console.log(`  ✓ Activité "${ae7RandoPapilles.name}" créée (max ${ae7RandoPapilles.maxParticipants} places)`);

  // Tarifs Rando Papilles AE7
  await prisma.eventPricing.upsert({
    where: {
      activityId_priceType: {
        activityId: ae7RandoPapilles.id,
        priceType: 'adulte',
      },
    },
    update: {},
    create: {
      activityId: ae7RandoPapilles.id,
      priceType: 'adulte',
      label: 'Adulte (+16 ans)',
      price: 48,
    },
  });

  await prisma.eventPricing.upsert({
    where: {
      activityId_priceType: {
        activityId: ae7RandoPapilles.id,
        priceType: 'enfant',
      },
    },
    update: {},
    create: {
      activityId: ae7RandoPapilles.id,
      priceType: 'enfant',
      label: 'Enfant (6-15 ans)',
      price: 28,
    },
  });

  console.log(`    - Adulte: 48€ | Enfant: 28€`);

  // Activité 2 : Le Défi (AE7)
  const ae7Defi = await prisma.activity.upsert({
    where: {
      eventId_name: {
        eventId: ae7.id,
        name: 'le défi',
      },
    },
    update: {},
    create: {
      eventId: ae7.id,
      name: 'le défi',
      description: 'Parcours sportif avec défis et énigmes',
      maxParticipants: 40,
    },
  });

  console.log(`  ✓ Activité "${ae7Defi.name}" créée (max ${ae7Defi.maxParticipants} places)`);

  // Tarifs Le Défi AE7
  await prisma.eventPricing.upsert({
    where: {
      activityId_priceType: {
        activityId: ae7Defi.id,
        priceType: 'adulte',
      },
    },
    update: {},
    create: {
      activityId: ae7Defi.id,
      priceType: 'adulte',
      label: 'Adulte (+16 ans)',
      price: 55,
    },
  });

  await prisma.eventPricing.upsert({
    where: {
      activityId_priceType: {
        activityId: ae7Defi.id,
        priceType: 'enfant',
      },
    },
    update: {},
    create: {
      activityId: ae7Defi.id,
      priceType: 'enfant',
      label: 'Enfant (6-15 ans)',
      price: 35,
    },
  });

  console.log(`    - Adulte: 55€ | Enfant: 35€`);

  // ═══════════════════════════════════════════════════════════
  // 5. CRÉATION D'UNE RÉSERVATION DE TEST
  // ═══════════════════════════════════════════════════════════

  console.log('\n📝 Création d\'une réservation de test...');

  await prisma.reservation.create({
    data: {
      eventId: ae7.id,
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@example.com',
      telephone: '0612345678',
      activityName: 'rando papilles',
      participants: {
        adulte: 2,
        enfant: 1,
      },
      amount: 124, // 2*48 + 1*28 = 124€ (tarifs AE7)
      paymentStatus: 'PENDING',
    },
  });

  console.log('  ✓ Réservation test créée pour Jean Dupont (AE7 - Rando Papilles)');

  // ═══════════════════════════════════════════════════════════
  // 6. CRÉATION D'UNE DEMANDE DE CONTACT DE TEST
  // ═══════════════════════════════════════════════════════════

  console.log('\n✉️  Création d\'une demande de contact de test...');

  await prisma.contactRequest.create({
    data: {
      nom: 'Martin',
      prenom: 'Sophie',
      email: 'sophie.martin@example.com',
      telephone: '0687654321',
      message: 'Bonjour, je souhaite avoir plus d\'informations sur vos formules Adventure.',
      isBooking: true,
      bookingData: {
        participants: 4,
        durée: '2jours',
        formule: 'adventure-plus',
      },
    },
  });

  console.log('  ✓ Demande de contact test créée pour Sophie Martin');

  console.log('\n✅ Seed terminé avec succès!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
