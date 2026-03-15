const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /dashboard
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    // Récupère toutes les orgs du user
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.user.id, acceptedAt: { not: null } },
      include: { organization: true },
    });

    if (memberships.length === 0) {
      return res.render('dashboard/index', { title: 'Tableau de bord', stats: null, org: null });
    }

    // Par défaut, affiche les stats de la première org
    const org = memberships[0].organization;

    const [qrCount, sigCount, vcardCount] = await Promise.all([
      prisma.qrCode.count({ where: { organizationId: org.id } }),
      prisma.signature.count({ where: { organizationId: org.id } }),
      prisma.vcard.count({ where: { organizationId: org.id } }),
    ]);

    // Total clics QR
    const clickResult = await prisma.qrCode.aggregate({
      where: { organizationId: org.id },
      _sum: { clickCount: true },
    });

    const stats = {
      qrCount,
      sigCount,
      vcardCount,
      totalClicks: clickResult._sum.clickCount || 0,
    };

    res.render('dashboard/index', { title: 'Tableau de bord', stats, org });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
