require('dotenv').config();

const express = require('express');
const path    = require('path');
const helmet  = require('helmet');
const session = require('express-session');
const flash   = require('connect-flash');
const methodOverride = require('method-override');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const passport      = require('./config/auth');
const sessionConfig = require('./config/session');
const flashMw       = require('./middleware/flash');

// Routes
const authRoutes    = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const orgRoutes     = require('./routes/organizations');
const qrRoutes      = require('./routes/qr');
const sigRoutes     = require('./routes/signatures');
const vcardRoutes   = require('./routes/vcards');
const publicRoutes  = require('./routes/public');

const app = express();
const prisma = new PrismaClient();

// ─── Sécurité ──────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
      styleSrc:  ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
      fontSrc:   ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
      imgSrc:    ["'self'", 'data:', 'blob:', '*'],
      connectSrc: ["'self'"],
    },
  },
}));

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Method Override (PUT/DELETE via formulaires HTML) ────────────────────
app.use(methodOverride('_method'));

// ─── Fichiers statiques ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Sessions ─────────────────────────────────────────────────────────────
app.use(session(sessionConfig));

// ─── Passport ─────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── Flash ────────────────────────────────────────────────────────────────
app.use(flash());
app.use(flashMw);

// ─── Locals globaux EJS ───────────────────────────────────────────────────
app.use(async (req, res, next) => {
  res.locals.user    = req.user || null;
  res.locals.appUrl  = process.env.APP_URL || 'http://localhost:3000';
  res.locals.currentPath = req.path;

  // Charger les orgs du user pour le switcher sidebar
  if (req.user) {
    try {
      const memberships = await prisma.organizationMember.findMany({
        where: { userId: req.user.id, acceptedAt: { not: null } },
        include: { organization: true },
      });
      res.locals.userOrgs = memberships.map(m => m.organization);
    } catch {
      res.locals.userOrgs = [];
    }
  } else {
    res.locals.userOrgs = [];
  }

  next();
});

// ─── Moteur de templates ───────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Rate limiting sur l'auth ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: 'Trop de tentatives. Réessayez dans 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/auth', authLimiter, authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/o', orgRoutes);
app.use('/o', qrRoutes);
app.use('/o', sigRoutes);
app.use('/o', vcardRoutes);
app.use('/', publicRoutes);

// ─── Redirection racine ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

// ─── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Page introuvable' });
});

// ─── 500 ───────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', { title: 'Erreur serveur', error: process.env.NODE_ENV === 'development' ? err : {} });
});

// ─── Démarrage ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Voilà Voilà Tools — http://localhost:${PORT}`);
});

module.exports = app;
