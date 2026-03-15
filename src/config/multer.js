const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function makeStorage(getDestination) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = getDestination(req);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const type = file.fieldname;
      cb(null, `${type}_${Date.now()}${ext}`);
    },
  });
}

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Images uniquement.'), false);
  }
}

// Upload pour les QR codes
const qrUpload = multer({
  storage: makeStorage((req) =>
    path.join('public', 'uploads', 'organizations', String(req.organization?.id || 'tmp'), 'qr', String(req.params.id || 'new'))
  ),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

// Upload pour les signatures
const signatureUpload = multer({
  storage: makeStorage((req) =>
    path.join('public', 'uploads', 'organizations', String(req.organization?.id || 'tmp'), 'signatures', String(req.params.id || 'new'))
  ),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

// Upload pour les vcards
const vcardUpload = multer({
  storage: makeStorage((req) =>
    path.join('public', 'uploads', 'organizations', String(req.organization?.id || 'tmp'), 'vcards', String(req.params.id || 'new'))
  ),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

// Upload logo organisation
const orgUpload = multer({
  storage: makeStorage((req) =>
    path.join('public', 'uploads', 'organizations', String(req.organization?.id || 'tmp'))
  ),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

module.exports = { qrUpload, signatureUpload, vcardUpload, orgUpload };
