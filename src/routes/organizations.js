const express = require('express');
const bcrypt  = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { isAuthenticated } = require('../middleware/auth');
const { loadOrganization, checkRole } = require('../middleware/organization');
const { makeSlug, deleteFile } = require('../helpers/utils');
const { orgUpload } = require('../config/multer');

const router = express.Router();
const prisma = new PrismaClient();

// Toutes les routes nécessitent auth + org chargée
router.use('/:orgSlug', isAuthenticated, loadOrganization);

// GET /o/:orgSlug/settings
router.get('/:orgSlug/settings', checkRole('admin'), async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.organization.id } });
    res.render('organizations/settings', { title: 'Paramètres', org, errors: [] });
  } catch (err) { next(err); }
});

// PUT /o/:orgSlug/settings (form envoie POST + _method=PUT)
router.put('/:orgSlug/settings',
  checkRole('admin'),
  orgUpload.single('logo'),
  [body('name').trim().notEmpty().withMessage('Nom requis.')],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('organizations/settings', {
        title: 'Paramètres', org: req.organization, errors: errors.array(),
      });
    }
    try {
      const data = { name: req.body.name };
      if (req.file) {
        if (req.organization.logo) deleteFile(req.organization.logo);
        data.logo = req.file.path;
      }
      await prisma.organization.update({ where: { id: req.organization.id }, data });
      req.flash('success', 'Paramètres mis à jour.');
      res.redirect(`/o/${req.params.orgSlug}/settings`);
    } catch (err) { next(err); }
  }
);

// GET /o/:orgSlug/members
router.get('/:orgSlug/members', async (req, res, next) => {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: req.organization.id },
      include: { user: true },
      orderBy: { invitedAt: 'asc' },
    });
    res.render('organizations/members', { title: 'Membres', members, errors: [], old: {} });
  } catch (err) { next(err); }
});

// POST /o/:orgSlug/members/invite
router.post('/:orgSlug/members/invite',
  checkRole('admin'),
  [body('email').isEmail().normalizeEmail().withMessage('Email invalide.')],
  async (req, res, next) => {
    try {
      const targetUser = await prisma.user.findUnique({ where: { email: req.body.email } });
      if (!targetUser) {
        req.flash('error', "Aucun compte trouvé pour cet email.");
        return res.redirect(`/o/${req.params.orgSlug}/members`);
      }

      const exists = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: req.organization.id, userId: targetUser.id } },
      });
      if (exists) {
        req.flash('error', "Cet utilisateur est déjà membre.");
        return res.redirect(`/o/${req.params.orgSlug}/members`);
      }

      await prisma.organizationMember.create({
        data: {
          organizationId: req.organization.id,
          userId: targetUser.id,
          role: 'member',
          acceptedAt: new Date(), // Auto-accepté (pas d'email d'invitation en V1)
        },
      });

      req.flash('success', `${targetUser.name} a été ajouté comme membre.`);
      res.redirect(`/o/${req.params.orgSlug}/members`);
    } catch (err) { next(err); }
  }
);

// POST /o/:orgSlug/members/:id/remove
router.post('/:orgSlug/members/:id/remove', checkRole('admin'), async (req, res, next) => {
  try {
    const member = await prisma.organizationMember.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!member || member.organizationId !== req.organization.id) {
      req.flash('error', 'Membre introuvable.');
      return res.redirect(`/o/${req.params.orgSlug}/members`);
    }
    if (member.role === 'owner') {
      req.flash('error', "Impossible de retirer le propriétaire de l'organisation.");
      return res.redirect(`/o/${req.params.orgSlug}/members`);
    }
    await prisma.organizationMember.delete({ where: { id: member.id } });
    req.flash('success', 'Membre retiré.');
    res.redirect(`/o/${req.params.orgSlug}/members`);
  } catch (err) { next(err); }
});

// PUT /o/:orgSlug/members/:id/role
router.put('/:orgSlug/members/:id/role', checkRole('admin'), async (req, res, next) => {
  try {
    const role = req.body.role;
    if (!['admin', 'member'].includes(role)) {
      req.flash('error', 'Rôle invalide.');
      return res.redirect(`/o/${req.params.orgSlug}/members`);
    }
    const member = await prisma.organizationMember.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!member || member.organizationId !== req.organization.id) {
      req.flash('error', 'Membre introuvable.');
      return res.redirect(`/o/${req.params.orgSlug}/members`);
    }
    if (member.role === 'owner') {
      req.flash('error', 'Impossible de modifier le rôle du propriétaire.');
      return res.redirect(`/o/${req.params.orgSlug}/members`);
    }
    if (member.userId === req.user.id) {
      req.flash('error', 'Vous ne pouvez pas modifier votre propre rôle.');
      return res.redirect(`/o/${req.params.orgSlug}/members`);
    }
    await prisma.organizationMember.update({ where: { id: member.id }, data: { role } });
    req.flash('success', 'Rôle mis à jour.');
    res.redirect(`/o/${req.params.orgSlug}/members`);
  } catch (err) { next(err); }
});

// POST /o/:orgSlug/leave
router.post('/:orgSlug/leave', async (req, res, next) => {
  try {
    if (req.membership.role === 'owner') {
      req.flash('error', "Le propriétaire ne peut pas quitter l'organisation. Supprimez l'organisation ou transférez la propriété.");
      return res.redirect(`/o/${req.params.orgSlug}/settings`);
    }
    await prisma.organizationMember.delete({ where: { id: req.membership.id } });
    req.flash('success', "Vous avez quitté l'organisation.");
    res.redirect('/dashboard');
  } catch (err) { next(err); }
});

module.exports = router;
