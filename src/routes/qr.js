const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated } = require('../middleware/auth');
const { loadOrganization } = require('../middleware/organization');
const { qrUpload } = require('../config/multer');
const { uniqueShortCode, deleteFile, publicUrl } = require('../helpers/utils');

const router = express.Router();
const prisma = new PrismaClient();

router.use('/:orgSlug/qr', isAuthenticated, loadOrganization);

const qrValidation = [
  body('name').trim().notEmpty().withMessage('Nom requis.').isLength({ max: 100 }),
  body('targetUrl').isURL({ require_protocol: true }).withMessage("URL de destination invalide (inclure http:// ou https://)."),
];

// GET /o/:orgSlug/qr
router.get('/:orgSlug/qr', async (req, res, next) => {
  try {
    const qrCodes = await prisma.qrCode.findMany({
      where: { organizationId: req.organization.id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.render('qr/index', { title: 'QR Codes', qrCodes, appUrl: process.env.APP_URL });
  } catch (err) { next(err); }
});

// GET /o/:orgSlug/qr/create
router.get('/:orgSlug/qr/create', (req, res) => {
  res.render('qr/form', {
    title: 'Nouveau QR Code',
    qr: null,
    errors: [],
    old: {},
    appUrl: process.env.APP_URL,
  });
});

// POST /o/:orgSlug/qr
router.post('/:orgSlug/qr',
  qrUpload.single('logo'),
  qrValidation,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) deleteFile(req.file.path);
      return res.render('qr/form', { title: 'Nouveau QR Code', qr: null, errors: errors.array(), old: req.body, appUrl: process.env.APP_URL });
    }
    try {
      const shortCode = await uniqueShortCode();
      const design = {
        color:       req.body['design.color']       || '#000000',
        bg:          req.body['design.bg']          || '#ffffff',
        style:       req.body['design.style']       || 'square',
        transparent: req.body['design.transparent'] === 'true',
        logoSize:    parseFloat(req.body['design.logoSize'] || '0.3'),
      };
      const qr = await prisma.qrCode.create({
        data: {
          organizationId: req.organization.id,
          createdById:    req.user.id,
          name:           req.body.name,
          shortCode,
          targetUrl:      req.body.targetUrl,
          design,
          logoPath:       req.file ? req.file.path : null,
        },
      });
      req.flash('success', 'QR Code créé avec succès.');
      res.redirect(`/o/${req.params.orgSlug}/qr`);
    } catch (err) {
      if (req.file) deleteFile(req.file.path);
      next(err);
    }
  }
);

// GET /o/:orgSlug/qr/:id/edit
router.get('/:orgSlug/qr/:id/edit', async (req, res, next) => {
  try {
    const qr = await prisma.qrCode.findFirst({
      where: { id: parseInt(req.params.id), organizationId: req.organization.id },
    });
    if (!qr) { req.flash('error', 'QR Code introuvable.'); return res.redirect(`/o/${req.params.orgSlug}/qr`); }
    res.render('qr/form', { title: 'Modifier le QR Code', qr, errors: [], old: {}, appUrl: process.env.APP_URL });
  } catch (err) { next(err); }
});

// PUT /o/:orgSlug/qr/:id
router.put('/:orgSlug/qr/:id',
  qrUpload.single('logo'),
  qrValidation,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) deleteFile(req.file.path);
      const qr = await prisma.qrCode.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.render('qr/form', { title: 'Modifier le QR Code', qr, errors: errors.array(), old: req.body, appUrl: process.env.APP_URL });
    }
    try {
      const existing = await prisma.qrCode.findFirst({
        where: { id: parseInt(req.params.id), organizationId: req.organization.id },
      });
      if (!existing) { req.flash('error', 'QR Code introuvable.'); return res.redirect(`/o/${req.params.orgSlug}/qr`); }

      const design = {
        color:       req.body['design.color']       || '#000000',
        bg:          req.body['design.bg']          || '#ffffff',
        style:       req.body['design.style']       || 'square',
        transparent: req.body['design.transparent'] === 'true',
        logoSize:    parseFloat(req.body['design.logoSize'] || '0.3'),
      };

      const data = { name: req.body.name, targetUrl: req.body.targetUrl, design };
      if (req.file) {
        if (existing.logoPath) deleteFile(existing.logoPath);
        data.logoPath = req.file.path;
      }

      await prisma.qrCode.update({ where: { id: existing.id }, data });
      req.flash('success', 'QR Code mis à jour.');
      res.redirect(`/o/${req.params.orgSlug}/qr`);
    } catch (err) {
      if (req.file) deleteFile(req.file.path);
      next(err);
    }
  }
);

// DELETE /o/:orgSlug/qr/:id
router.delete('/:orgSlug/qr/:id', async (req, res, next) => {
  try {
    const qr = await prisma.qrCode.findFirst({
      where: { id: parseInt(req.params.id), organizationId: req.organization.id },
    });
    if (!qr) return res.status(404).json({ error: 'Introuvable' });

    if (qr.logoPath) deleteFile(qr.logoPath);
    await prisma.qrCode.delete({ where: { id: qr.id } });

    // Réponse HTMX : renvoie une ligne vide (la suppression est inline)
    res.status(200).send('');
  } catch (err) { next(err); }
});

module.exports = router;
