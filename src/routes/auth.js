const express  = require('express');
const bcrypt   = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const passport = require('../config/auth');
const { isGuest, isAuthenticated } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /auth/login
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { title: 'Connexion', errors: [] });
});

// POST /auth/login
router.post('/login',
  isGuest,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide.'),
    body('password').notEmpty().withMessage('Mot de passe requis.'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/login', { title: 'Connexion', errors: errors.array() });
    }

    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.render('auth/login', {
          title: 'Connexion',
          errors: [{ msg: info?.message || 'Email ou mot de passe incorrect.' }],
        });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.redirect('/dashboard');
      });
    })(req, res, next);
  }
);

// GET /auth/register
router.get('/register', isGuest, (req, res) => {
  res.render('auth/register', { title: 'Créer un compte', errors: [], old: {} });
});

// POST /auth/register
router.post('/register',
  isGuest,
  [
    body('name').trim().notEmpty().withMessage('Nom requis.').isLength({ max: 100 }),
    body('email').isEmail().normalizeEmail().withMessage('Email invalide.'),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum.'),
    body('password_confirm').custom((val, { req }) => {
      if (val !== req.body.password) throw new Error('Les mots de passe ne correspondent pas.');
      return true;
    }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/register', { title: 'Créer un compte', errors: errors.array(), old: req.body });
    }

    try {
      const exists = await prisma.user.findUnique({ where: { email: req.body.email } });
      if (exists) {
        return res.render('auth/register', {
          title: 'Créer un compte',
          errors: [{ msg: 'Cet email est déjà utilisé.' }],
          old: req.body,
        });
      }

      const hash = await bcrypt.hash(req.body.password, 12);

      const user = await prisma.user.create({
        data: {
          name: req.body.name,
          email: req.body.email,
          password: hash,
        },
      });

      req.logIn(user, (err) => {
        if (err) return next(err);
        req.flash('success', `Bienvenue ${user.name} ! Créez maintenant votre première organisation.`);
        res.redirect('/o/new');
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /auth/logout
router.get('/logout', isAuthenticated, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'Vous êtes déconnecté.');
    res.redirect('/auth/login');
  });
});

module.exports = router;
