/**
 * Script de seed pour ajouter des données de test pour les contacts et réservations
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db/client';

async function main() {
  console.log('🌱 Ajout de données de test pour les contacts...');

  // Supprimer les données existantes
  await prisma.contactRequest.deleteMany({});
  console.log('✅ Données existantes supprimées');

  // Créer des contacts simples
  const contact1 = await prisma.contactRequest.create({
    data: {
      nom: 'Marie Dubois',
      email: 'marie.dubois@example.com',
      telephone: '06 12 34 56 78',
      message: 'Bonjour,\n\nJe souhaiterais avoir plus d\'informations sur vos escapades en Anjou. Est-ce que vous proposez des sorties pour les familles avec enfants ?\n\nMerci d\'avance,\nMarie',
      isBooking: false,
      status: 'NEW',
    },
  });
  console.log('✅ Contact simple créé (NEW):', contact1.nom);

  const contact2 = await prisma.contactRequest.create({
    data: {
      nom: 'Jean Martin',
      email: 'jean.martin@gmail.com',
      telephone: '07 89 45 62 31',
      message: 'Bonjour,\n\nJe suis intéressé par vos activités de canoë sur la Loire. Pouvez-vous me dire si vous organisez des sorties pour débutants ?\n\nCordialement,\nJean',
      isBooking: false,
      status: 'PROCESSED',
      processedBy: 'José',
      processedAt: new Date('2026-01-26T10:30:00Z'),
    },
  });
  console.log('✅ Contact simple créé (PROCESSED):', contact2.nom);

  const contact3 = await prisma.contactRequest.create({
    data: {
      nom: 'Sophie Lefebvre',
      email: 'sophie.lefebvre@yahoo.fr',
      telephone: '06 45 78 90 12',
      message: 'Bonjour,\n\nJe voudrais savoir si vous avez des tarifs de groupe pour une sortie avec mes collègues (environ 15 personnes).\n\nMerci',
      isBooking: false,
      status: 'ARCHIVED',
      processedBy: 'Fabien',
      processedAt: new Date('2026-01-25T14:20:00Z'),
    },
  });
  console.log('✅ Contact simple créé (ARCHIVED):', contact3.nom);

  // Créer des demandes de réservation
  const booking1 = await prisma.contactRequest.create({
    data: {
      nom: 'Pierre Durand',
      email: 'pierre.durand@hotmail.com',
      telephone: '06 23 45 67 89',
      message: 'Bonjour,\n\nJe souhaite réserver pour l\'Anjou Explore #6. Nous serons 2 participants. Pouvez-vous me confirmer la disponibilité ?\n\nMerci',
      isBooking: true,
      bookingData: {
        evenement: 'Anjou Explore #6',
        date: '2026-06-15',
        participants: 2,
        formule: 'Week-end complet',
        hebergement: 'Oui',
        commentaires: 'Nous avons des restrictions alimentaires (végétarien)',
      },
      status: 'NEW',
    },
  });
  console.log('✅ Réservation créée (NEW):', booking1.nom);

  const booking2 = await prisma.contactRequest.create({
    data: {
      nom: 'Claire Bernard',
      email: 'claire.bernard@outlook.fr',
      telephone: '07 56 89 12 34',
      message: 'Bonjour,\n\nJe voudrais m\'inscrire à l\'Anjou Explore #6 avec mon mari. Nous aimerions avoir la formule complète avec hébergement.\n\nCordialement,\nClaire',
      isBooking: true,
      bookingData: {
        evenement: 'Anjou Explore #6',
        date: '2026-06-15',
        participants: 2,
        formule: 'Week-end + hébergement',
        transport: 'Covoiturage souhaité',
        telephone_secondaire: '06 78 90 12 34',
      },
      status: 'PROCESSED',
      processedBy: 'Benoît',
      processedAt: new Date('2026-01-26T09:15:00Z'),
    },
  });
  console.log('✅ Réservation créée (PROCESSED):', booking2.nom);

  const booking3 = await prisma.contactRequest.create({
    data: {
      nom: 'Thomas Petit',
      email: 'thomas.petit@free.fr',
      telephone: '06 34 56 78 90',
      message: 'Bonjour,\n\nJe souhaite participer à l\'Anjou Explore #6. Je viens seul et je n\'ai pas besoin d\'hébergement.\n\nMerci',
      isBooking: true,
      bookingData: {
        evenement: 'Anjou Explore #6',
        date: '2026-06-15',
        participants: 1,
        formule: 'Journée uniquement',
        niveau: 'Débutant',
        equipement_personnel: 'Non',
      },
      status: 'NEW',
    },
  });
  console.log('✅ Réservation créée (NEW):', booking3.nom);

  const booking4 = await prisma.contactRequest.create({
    data: {
      nom: 'Isabelle Moreau',
      email: 'isabelle.moreau@gmail.com',
      telephone: '07 12 34 56 78',
      message: 'Bonjour,\n\nJe souhaite réserver pour 4 personnes (2 adultes + 2 enfants de 12 et 15 ans). Est-ce que c\'est possible ?\n\nMerci beaucoup',
      isBooking: true,
      bookingData: {
        evenement: 'Escapade Loire à vélo',
        date: '2026-07-20',
        participants: 4,
        details_participants: '2 adultes + 2 enfants (12 et 15 ans)',
        formule: 'Journée famille',
        velos_necessaires: 4,
        casques_necessaires: 4,
      },
      status: 'NEW',
    },
  });
  console.log('✅ Réservation créée (NEW):', booking4.nom);

  const contact4 = await prisma.contactRequest.create({
    data: {
      nom: 'Lucas Robert',
      email: 'lucas.robert@orange.fr',
      telephone: '06 89 01 23 45',
      message: 'Bonjour,\n\nEst-ce que vous organisez des sorties pour les entreprises ? Nous cherchons une activité team-building pour notre équipe de 20 personnes.\n\nBien cordialement,\nLucas',
      isBooking: false,
      status: 'NEW',
    },
  });
  console.log('✅ Contact simple créé (NEW):', contact4.nom);

  const booking5 = await prisma.contactRequest.create({
    data: {
      nom: 'Camille Laurent',
      email: 'camille.laurent@wanadoo.fr',
      telephone: '07 45 67 89 01',
      message: 'Bonjour,\n\nJe souhaite m\'inscrire à l\'Anjou Explore #6. C\'est ma première fois, j\'ai hâte !\n\nCamille',
      isBooking: true,
      bookingData: {
        evenement: 'Anjou Explore #6',
        date: '2026-06-15',
        participants: 1,
        formule: 'Week-end complet',
        premiere_participation: true,
        niveau_sportif: 'Moyen',
        allergies: 'Aucune',
      },
      status: 'ARCHIVED',
      processedBy: 'Adrien',
      processedAt: new Date('2026-01-24T16:45:00Z'),
    },
  });
  console.log('✅ Réservation créée (ARCHIVED):', booking5.nom);

  console.log('\n✅ Seed terminé avec succès !');
  console.log(`📊 Total: 8 demandes créées (4 contacts simples + 4 réservations)`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
