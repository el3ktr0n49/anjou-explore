/**
 * Prisma Seed Script - Initialisation de la base de données
 *
 * Exécuter avec: bun run db:seed
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { generateSecret, generate, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';

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
  const admins: Array<{ name: string; secret: string; qrCode: string }> = [];

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

    // Créer ou mettre à jour l'admin
    await prisma.admin.upsert({
      where: { name },
      update: {
        secret2FA: secret,
        isActive: true,
      },
      create: {
        name,
        secret2FA: secret,
        isActive: true,
      },
    });

    admins.push({ name, secret, qrCode: qrCodeDataURL });
    console.log(`  ✓ ${name} créé avec secret 2FA`);
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
  // 2. CRÉATION D'UN ÉVÉNEMENT DE TEST (AE7)
  // ═══════════════════════════════════════════════════════════

  console.log('\n🎪 Création d\'un événement de test (AE7)...');

  const ae7 = await prisma.event.upsert({
    where: { slug: 'ae7' },
    update: {},
    create: {
      name: 'Anjou Explore #7',
      slug: 'ae7',
      description: 'Événement test pour validation du système',
      date: new Date('2026-06-15'),
      status: 'DRAFT',
      paymentEnabled: false,
      maxParticipants: 100,
      location: 'Lieu à définir',
    },
  });

  console.log(`  ✓ Événement "${ae7.name}" créé (${ae7.slug})`);

  // ═══════════════════════════════════════════════════════════
  // 3. CRÉATION DES FORMULES POUR AE7
  // ═══════════════════════════════════════════════════════════

  console.log('\n💰 Création des formules/tarifs pour AE7...');

  const formulas = [
    {
      activityName: 'rando papilles',
      priceType: 'adulte',
      label: 'Adulte (+16 ans)',
      price: 25,
    },
    {
      activityName: 'rando papilles',
      priceType: 'enfant',
      label: 'Enfant (-16 ans)',
      price: 15,
    },
    {
      activityName: 'le défi',
      priceType: 'adulte',
      label: 'Adulte (+16 ans)',
      price: 30,
    },
    {
      activityName: 'le défi',
      priceType: 'enfant',
      label: 'Enfant (-16 ans)',
      price: 18,
    },
  ];

  for (const formula of formulas) {
    await prisma.formula.upsert({
      where: {
        eventId_activityName_priceType: {
          eventId: ae7.id,
          activityName: formula.activityName,
          priceType: formula.priceType,
        },
      },
      update: {},
      create: {
        eventId: ae7.id,
        ...formula,
      },
    });

    console.log(`  ✓ ${formula.activityName} - ${formula.label}: ${formula.price}€`);
  }

  // ═══════════════════════════════════════════════════════════
  // 4. CRÉATION D'UNE RÉSERVATION DE TEST
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
      amount: 65, // 2*25 + 1*15
      paymentStatus: 'PENDING',
    },
  });

  console.log('  ✓ Réservation test créée pour Jean Dupont');

  // ═══════════════════════════════════════════════════════════
  // 5. CRÉATION D'UNE DEMANDE DE CONTACT DE TEST
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
