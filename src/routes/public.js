const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /go/:code — Redirection QR + compteur
router.get('/go/:code', async (req, res, next) => {
  try {
    const qr = await prisma.qrCode.findUnique({ where: { shortCode: req.params.code } });
    if (!qr) return res.status(404).render('errors/404', { title: 'QR Code introuvable', user: null });

    // Incrément non-bloquant
    prisma.qrCode.update({ where: { id: qr.id }, data: { clickCount: { increment: 1 } } }).catch(() => {});

    res.redirect(301, qr.targetUrl);
  } catch (err) { next(err); }
});

// GET /v/:orgSlug/:vcardSlug — Page vcard publique
router.get('/v/:orgSlug/:vcardSlug', async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({ where: { slug: req.params.orgSlug } });
    if (!org) return res.status(404).render('errors/404', { title: 'Page introuvable', user: null });

    const vcard = await prisma.vcard.findUnique({
      where: { organizationId_slug: { organizationId: org.id, slug: req.params.vcardSlug } },
    });

    if (!vcard || !vcard.isPublished) {
      return res.status(404).render('errors/404', { title: 'Page introuvable', user: null });
    }

    res.render('vcards/public-page', { title: vcard.name, vcard, org, user: null, layout: 'public' });
  } catch (err) { next(err); }
});

// GET /v/:orgSlug/:vcardSlug/contact.vcf — Téléchargement VCF
router.get('/v/:orgSlug/:vcardSlug/contact.vcf', async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({ where: { slug: req.params.orgSlug } });
    if (!org) return res.status(404).send('Not found');

    const vcard = await prisma.vcard.findUnique({
      where: { organizationId_slug: { organizationId: org.id, slug: req.params.vcardSlug } },
    });

    if (!vcard || !vcard.isPublished || !vcard.showVcard) return res.status(404).send('Not found');

    const { generateVcf } = require('../services/vcard.service');
    const vcf = generateVcf(vcard);

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${vcard.slug}.vcf"`);
    res.send(vcf);
  } catch (err) { next(err); }
});

module.exports = router;
