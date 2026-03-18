const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated } = require('../middleware/auth');
const { loadOrganization } = require('../middleware/organization');
const { signatureUpload } = require('../config/multer');
const { makeSlug, deleteFile } = require('../helpers/utils');

const router = express.Router();
const prisma = new PrismaClient();

router.use('/:orgSlug/signatures', isAuthenticated, loadOrganization);

const sigValidation = [
  body('name').trim().notEmpty().withMessage('Nom requis.').isLength({ max: 100 }),
  body('identity.name').trim().notEmpty().withMessage('Nom complet requis.'),
];

function buildSignatureData(req, existing = null) {
  const rawSocials = req.body.socialLinks;
  const socialsArray = Array.isArray(rawSocials) ? rawSocials : (rawSocials ? [rawSocials] : []);
  const socialLinks = socialsArray.filter(s => s && s.url).map(s => ({ type: s.type, url: s.url }));

  return {
    name:     req.body.name,
    slug:     makeSlug(req.body.name) + '-' + (existing?.id || Date.now()),
    template: req.body.template || 'classic',
    identity: {
      name:    req.body.identity?.name    || '',
      job:     req.body.identity?.job     || '',
      tagline: req.body.identity?.tagline || '',
    },
    contact: {
      email:   req.body.contact?.email   || '',
      phone:   req.body.contact?.phone   || '',
      address: req.body.contact?.address || '',
      company: req.body.contact?.company || '',
      website: req.body.contact?.website || '',
    },
    style: {
      primaryColor: req.body.style?.primaryColor || '#5b6af5',
      fontSize:     parseInt(req.body.style?.fontSize || '13'),
      logoWidth:    parseInt(req.body.style?.logoWidth || '120'),
      showBorder:   req.body.style?.showBorder === 'true',
    },
    socialLinks: socialLinks.length ? socialLinks : null,
    googleReviewUrl: req.body.googleReviewUrl || null,
  };
}

// GET /o/:orgSlug/signatures
router.get('/:orgSlug/signatures', async (req, res, next) => {
  try {
    const signatures = await prisma.signature.findMany({
      where: { organizationId: req.organization.id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.render('signatures/index', { title: 'Signatures Email', signatures });
  } catch (err) { next(err); }
});

// GET /o/:orgSlug/signatures/create
router.get('/:orgSlug/signatures/create', (req, res) => {
  res.render('signatures/form', { title: 'Nouvelle Signature', sig: null, errors: [], old: {} });
});

// POST /o/:orgSlug/signatures
router.post('/:orgSlug/signatures',
  signatureUpload.single('logo'),
  sigValidation,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) deleteFile(req.file.path);
      return res.render('signatures/form', { title: 'Nouvelle Signature', sig: null, errors: errors.array(), old: req.body });
    }
    try {
      const data = buildSignatureData(req);
      if (req.file) data.logoPath = req.file.path;
      data.organizationId = req.organization.id;
      data.createdById    = req.user.id;

      await prisma.signature.create({ data });
      req.flash('success', 'Signature créée avec succès.');
      res.redirect(`/o/${req.params.orgSlug}/signatures`);
    } catch (err) {
      if (req.file) deleteFile(req.file.path);
      next(err);
    }
  }
);

// GET /o/:orgSlug/signatures/:id/edit
router.get('/:orgSlug/signatures/:id/edit', async (req, res, next) => {
  try {
    const sig = await prisma.signature.findFirst({
      where: { id: parseInt(req.params.id), organizationId: req.organization.id },
    });
    if (!sig) { req.flash('error', 'Signature introuvable.'); return res.redirect(`/o/${req.params.orgSlug}/signatures`); }
    res.render('signatures/form', { title: 'Modifier la Signature', sig, errors: [], old: {} });
  } catch (err) { next(err); }
});

// PUT /o/:orgSlug/signatures/:id
router.put('/:orgSlug/signatures/:id',
  signatureUpload.single('logo'),
  sigValidation,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) deleteFile(req.file.path);
      const sig = await prisma.signature.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.render('signatures/form', { title: 'Modifier la Signature', sig, errors: errors.array(), old: req.body });
    }
    try {
      const existing = await prisma.signature.findFirst({
        where: { id: parseInt(req.params.id), organizationId: req.organization.id },
      });
      if (!existing) { req.flash('error', 'Signature introuvable.'); return res.redirect(`/o/${req.params.orgSlug}/signatures`); }

      const data = buildSignatureData(req, existing);
      if (req.file) {
        if (existing.logoPath) deleteFile(existing.logoPath);
        data.logoPath = req.file.path;
      }

      await prisma.signature.update({ where: { id: existing.id }, data });
      req.flash('success', 'Signature mise à jour.');
      res.redirect(`/o/${req.params.orgSlug}/signatures`);
    } catch (err) {
      if (req.file) deleteFile(req.file.path);
      next(err);
    }
  }
);

// DELETE /o/:orgSlug/signatures/:id
router.delete('/:orgSlug/signatures/:id', async (req, res, next) => {
  try {
    const sig = await prisma.signature.findFirst({
      where: { id: parseInt(req.params.id), organizationId: req.organization.id },
    });
    if (!sig) return res.status(404).json({ error: 'Introuvable' });
    if (sig.logoPath) deleteFile(sig.logoPath);
    await prisma.signature.delete({ where: { id: sig.id } });
    res.status(200).send('');
  } catch (err) { next(err); }
});

module.exports = router;
