const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Utilisateur admin
  const hashedPassword = await bcrypt.hash('voilavoila', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@voilavoila.tv' },
    update: {},
    create: {
      name: 'Admin Voilà Voilà',
      email: 'admin@voilavoila.tv',
      password: hashedPassword,
    },
  });

  // Organisation
  const org = await prisma.organization.upsert({
    where: { slug: 'voila-voila' },
    update: {},
    create: {
      name: 'Voilà Voilà',
      slug: 'voila-voila',
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'owner',
          acceptedAt: new Date(),
        },
      },
    },
  });

  // QR Code 1
  await prisma.qrCode.upsert({
    where: { shortCode: 'vv01' },
    update: {},
    create: {
      organizationId: org.id,
      createdById: user.id,
      name: 'Site Voilà Voilà',
      shortCode: 'vv01',
      targetUrl: 'https://voilavoila.tv',
      design: {
        color: '#5b6af5',
        bg: '#ffffff',
        style: 'rounded',
        transparent: false,
        logoSize: 0.3,
      },
    },
  });

  // QR Code 2
  await prisma.qrCode.upsert({
    where: { shortCode: 'vv02' },
    update: {},
    create: {
      organizationId: org.id,
      createdById: user.id,
      name: 'Portfolio démo',
      shortCode: 'vv02',
      targetUrl: 'https://example.com',
      design: {
        color: '#1e293b',
        bg: '#f8fafc',
        style: 'dots',
        transparent: false,
        logoSize: 0.25,
      },
    },
  });

  // Signature
  const sigSlug = 'signature-admin';
  await prisma.signature.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: sigSlug } },
    update: {},
    create: {
      organizationId: org.id,
      createdById: user.id,
      name: 'Signature Admin',
      slug: sigSlug,
      template: 'classic',
      identity: { name: 'Admin Voilà Voilà', job: 'Développeur Freelance', tagline: "L'agence du web sur mesure" },
      contact: { email: 'admin@voilavoila.tv', phone: '+33 6 00 00 00 00', website: 'https://voilavoila.tv', company: 'Voilà Voilà', address: 'Paris, France' },
      style: { primaryColor: '#5b6af5', fontSize: 13, logoWidth: 120, showBorder: true },
      socialLinks: [
        { type: 'linkedin', url: 'https://linkedin.com/company/voilavoila' },
        { type: 'instagram', url: 'https://instagram.com/voilavoila' },
      ],
    },
  });

  // VCard
  const vcardSlug = 'admin-voilavoila';
  await prisma.vcard.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: vcardSlug } },
    update: {},
    create: {
      organizationId: org.id,
      createdById: user.id,
      name: 'VCard Admin',
      slug: vcardSlug,
      identity: { firstName: 'Admin', lastName: 'Voilà Voilà', showName: true, showPhoto: false },
      contact: {
        phone: '+33600000000',
        email: 'admin@voilavoila.tv',
        address: 'Paris, France',
        mapsUrl: '',
        mainButtonText: 'Visiter le site',
        mainButtonUrl: 'https://voilavoila.tv',
      },
      design: { colorBg: '#f0f4ff', colorCard: '#ffffff', colorText: '#1e293b', colorBtn: '#5b6af5', fontStyle: 'inter' },
      socialLinks: [{ type: 'linkedin', url: 'https://linkedin.com' }],
      showVcard: true,
      isPublished: true,
    },
  });

  console.log('Seed terminé !');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
