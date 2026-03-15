const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROLE_HIERARCHY = { owner: 3, admin: 2, member: 1 };

// Charge l'organisation et vérifie que l'utilisateur en est membre
async function loadOrganization(req, res, next) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: req.params.orgSlug },
    });

    if (!org) {
      return res.status(404).render('errors/404', { title: 'Organisation introuvable', user: req.user });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: org.id, userId: req.user.id } },
    });

    if (!membership || !membership.acceptedAt) {
      req.flash('error', "Vous n'avez pas accès à cette organisation.");
      return res.redirect('/dashboard');
    }

    req.organization = org;
    req.membership = membership;

    // Rendre dispo dans toutes les vues
    res.locals.currentOrg = org;
    res.locals.membership = membership;

    next();
  } catch (err) {
    next(err);
  }
}

// Vérifie que le membre a au minimum le rôle requis
function checkRole(minRole) {
  return (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.membership?.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel >= requiredLevel) return next();

    req.flash('error', "Vous n'avez pas les permissions nécessaires.");
    res.redirect(`/o/${req.params.orgSlug}`);
  };
}

module.exports = { loadOrganization, checkRole };
