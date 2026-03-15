const slugify = require('slugify');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Génère un slug URL-safe
function makeSlug(str) {
  return slugify(str, { lower: true, strict: true, locale: 'fr' });
}

// Génère un code court aléatoire de 4 caractères hex
function randomShortCode() {
  return Math.random().toString(16).slice(2, 6);
}

// Génère un code court unique (vérifié en base)
async function uniqueShortCode() {
  let code;
  let exists = true;
  while (exists) {
    code = randomShortCode();
    exists = await prisma.qrCode.findUnique({ where: { shortCode: code } });
  }
  return code;
}

// Supprime un fichier de façon silencieuse
function deleteFile(filePath) {
  if (!filePath) return;
  const fs = require('fs');
  const path = require('path');
  const fullPath = path.join(process.cwd(), filePath);
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // silencieux
  }
}

// Convertit un chemin local en URL publique
function publicUrl(filePath) {
  if (!filePath) return null;
  return '/' + filePath.replace(/\\/g, '/');
}

module.exports = { makeSlug, randomShortCode, uniqueShortCode, deleteFile, publicUrl };
