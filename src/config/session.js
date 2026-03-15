const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = {
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000, // purge sessions expirées toutes les 2min
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  }),
};
