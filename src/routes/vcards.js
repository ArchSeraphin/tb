const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated } = require('../middleware/auth');
const { loadOrganization } = require('../middleware/organization');
const { vcardUpload } = require('../config/multer');
const { makeSlug, deleteFile } = require('../helpers/utils');
const { generateVcf } = require('../services/vcard.service');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

router.use('/:orgSlug/vcards', isAuthenticated, loadOrganization);

const vcardValidation = [
  body('name').trim().notEmpty().withMessage('Nom requis.').isLength({ max: 100 }),
  body('identity.firstName').trim().notEmpty().withMessage('Prénom requis.'),
];

function buildVcardData(req, existing = null) {
  const socialLinks = [];
  const types = [].concat(req.body['social.type'] || []);
  const urls  = [].concat(req.body['social.url']  || []);
  types.forEach((t, i) => { if (urls[i]) socialLinks.push({ type: t, url: urls[i] }); });

  const extraButtons = [];
  const btnTexts = [].concat(req.body['extra.text'] || []);
  const btnUrls  = [].concat(req.body['extra.url']  || []);
  btnTexts.forEach((text, i) => { if (btnUrls[i]) extraButtons.push({ text, url: btnUrls[i] }); });

  return {
    name:  req.body.name,
    slug:  makeSlug(req.body['identity.firstName'] + '-' + (req.body['identity.lastName'] || '')) + '-' + (existing?.id || Date.now()),
    identity: {
      firstName: req.body['identity.firstName'] || '',
      lastName:  req.body['identity.lastName']  || '',
      showName:  req.body['identity.showName']  === 'true',
      showPhoto: req.body['identity.showPhoto'] === 'true',
    },
    contact: {
      phone:          req.body['contact.phone']          || '',
      email:          req.body['contact.email']          || '',
      address:        req.body['contact.address']        || '',
      mapsUrl:        req.body['contact.mapsUrl']        || '',
      mainButtonText: req.body['contact.mainButtonText'] || '',
      mainButtonUrl:  req.body['contact.mainButtonUrl']  || '',
    },
    design: {
      colorBg:   req.body['design.colorBg']   || '#f0f4ff',
      colorCard: req.body['design.colorCard'] || '#ffffff',
      colorText: req.body['design.colorText'] || '#1e293b',
      colorBtn:  req.body['design.colorBtn']  || '#5b6af5',
      fontStyle: req.body['design.fontStyle'] || 'inter',
    },
    socialLinks:  socialLinks.length  ? socialLinks  : null,
    extraButtons: extraButtons.length ? extraButtons : null,
    showVcard:    req.body.showVcard   === 'true',
    isPublished:  req.body.isPublished === 'true',
  };
}

// GET /o/:orgSlug/vcards
router.get('/:orgSlug/vcards', async (req, res, next) => {
  try {
    const vcards = await prisma.vcard.findMany({
      where: { organizationId: req.organization.id },
      orderBy: { createdAt: 'desc' },
    });
    res.render('vcards/index', { title: 'VCards', vcards, appUrl: process.env.APP_URL });
  } catch (err) { next(err); }
});

// GET /o/:orgSlug/vcards/create
router.get('/:orgSlug/vcards/create', (req, res) => {
  res.render('vcards/form', { title: 'Nouvelle VCard', vcard: null, errors: [], old: {}, appUrl: process.env.APP_URL });
});

// POST /o/:orgSlug/vcards
router.post('/:orgSlug/vcards',
  vcardUpload.fields([{ name: 'logo', maxCount: 1 }, { name: 'photo', maxCount: 1 }, { name: 'background', maxCount: 1 }]),
  vcardValidation,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('vcards/form', { title: 'Nouvelle VCard', vcard: null, errors: errors.array(), old: req.body, appUrl: process.env.APP_URL });
    }
    try {
      const data = buildVcardData(req);
      data.organizationId = req.organization.id;
      data.createdById    = req.user.id;

      // Chemins des médias uploadés
      const files = req.files || {};
      const mediaPaths = {};
      if (files.logo?.[0])       mediaPaths.logo       = files.logo[0].path;
      if (files.photo?.[0])      mediaPaths.photo      = files.photo[0].path;
      if (files.background?.[0]) mediaPaths.background = files.background[0].path;
      if (Object.keys(mediaPaths).length) data.mediaPaths = mediaPaths;

      const vcard = await prisma.vcard.create({ data });

      // Génération du fichier .vcf
      const vcf = generateVcf(vcard);
      const vcfDir  = path.join('public', 'uploads', 'organizations', String(req.organization.id), 'vcards', String(vcard.id));
      const vcfPath = path.join(vcfDir, 'contact.vcf');
      fs.mkdirSync(vcfDir, { recursive: true });
      fs.writeFileSync(vcfPath, vcf, 'utf-8');
      await prisma.vcard.update({ where: { id: vcard.id }, data: { vcardFilePath: vcfPath } });

      req.flash('success', 'VCard créée avec succès.');
      res.redirect(`/o/${req.params.orgSlug}/vcards`);
    } catch (err) { next(err); }
  }
);

// GET /o/:orgSlug/vcards/:id/edit
router.get('/:orgSlug/vcards/:id/edit', async (req, res, next) => {
  try {
    const vcard = await prisma.vcard.findFirst({
      where: { id: parseInt(req.params.id), organizationId: req.organization.id },
    });
    if (!vcard) { req.flash('error', 'VCard introuvable.'); return res.redirect(`/o/${req.params.orgSlug}/vcards`); }
    res.render('vcards/form', { title: 'Modifier la VCard', vcard, errors: [], old: {}, appUrl: process.env.APP_URL });
  } catch (err) { next(err); }
});

// PUT /o/:orgSlug/vcards/:id
router.put('/:orgSlug/vcards/:id',
  vcardUpload.fields([{ name: 'logo', maxCount: 1 }, { name: 'photo', maxCount: 1 }, { name: 'background', maxCount: 1 }]),
  vcardValidation,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const vcard = await prisma.vcard.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.render('vcards/form', { title: 'Modifier la VCard', vcard, errors: errors.array(), old: req.body, appUrl: process.env.APP_URL });
    }
    try {
      const existing = await prisma.vcard.findFirst({
        where: { id: parseInt(req.params.id), organizationId: req.organization.id },
      });
      if (!existing) { req.flash('error', 'VCard introuvable.'); return res.redirect(`/o/${req.params.orgSlug}/vcards`); }

      const data = buildVcardData(req, existing);

      // Gestion uploads médias
      const files = req.files || {};
      const mediaPaths = Object.assign({}, existing.mediaPaths || {});
      if (files.logo?.[0])       { deleteFile(mediaPaths.logo);       mediaPaths.logo       = files.logo[0].path; }
      if (files.photo?.[0])      { deleteFile(mediaPaths.photo);      mediaPaths.photo      = files.photo[0].path; }
      if (files.background?.[0]) { deleteFile(mediaPaths.background); mediaPaths.background = files.background[0].path; }
      if (Object.keys(mediaPaths).length) data.mediaPaths = mediaPaths;

      const updated = await prisma.vcard.update({ where: { id: existing.id }, data });

      // Re-génération .vcf
      const vcf = generateVcf(updated);
      const vcfDir  = path.join('public', 'uploads', 'organizations', String(req.organization.id), 'vcards', String(updated.id));
      const vcfPath = path.join(vcfDir, 'contact.vcf');
      fs.mkdirSync(vcfDir, { recursive: true });
      fs.writeFileSync(vcfPath, vcf, 'utf-8');
      await prisma.vcard.update({ where: { id: updated.id }, data: { vcardFilePath: vcfPath } });

      req.flash('success', 'VCard mise à jour.');
      res.redirect(`/o/${req.params.orgSlug}/vcards`);
    } catch (err) { next(err); }
  }
);

// DELETE /o/:orgSlug/vcards/:id
router.delete('/:orgSlug/vcards/:id', async (req, res, next) => {
  try {
    const vcard = await prisma.vcard.findFirst({
      where: { id: parseInt(req.params.id), organizationId: req.organization.id },
    });
    if (!vcard) return res.status(404).json({ error: 'Introuvable' });

    const mp = vcard.mediaPaths || {};
    deleteFile(mp.logo); deleteFile(mp.photo); deleteFile(mp.background);
    if (vcard.vcardFilePath) deleteFile(vcard.vcardFilePath);

    await prisma.vcard.delete({ where: { id: vcard.id } });
    res.status(200).send('');
  } catch (err) { next(err); }
});

module.exports = router;
