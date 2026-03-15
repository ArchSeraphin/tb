/**
 * Génère le contenu d'un fichier .vcf (vCard 3.0)
 */
function generateVcf(vcard) {
  const id = vcard.identity || {};
  const ct = vcard.contact  || {};

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${id.lastName || ''};${id.firstName || ''};;;`,
    `FN:${id.firstName || ''} ${id.lastName || ''}`.trim(),
  ];

  if (ct.phone)   lines.push(`TEL;TYPE=CELL:${ct.phone}`);
  if (ct.email)   lines.push(`EMAIL:${ct.email}`);
  if (ct.address) lines.push(`ADR;TYPE=HOME:;;${ct.address};;;;`);
  if (ct.mainButtonUrl) lines.push(`URL:${ct.mainButtonUrl}`);

  // Photo (si chemin disponible et base64 possible)
  const mediaPaths = vcard.mediaPaths || {};
  if (mediaPaths.photo) {
    try {
      const fs   = require('fs');
      const path = require('path');
      const ext  = path.extname(mediaPaths.photo).toLowerCase().replace('.', '');
      const mime = ext === 'jpg' ? 'JPEG' : ext.toUpperCase();
      const fullPath = path.join(process.cwd(), mediaPaths.photo);
      if (fs.existsSync(fullPath)) {
        const b64 = fs.readFileSync(fullPath).toString('base64');
        lines.push(`PHOTO;ENCODING=b;TYPE=${mime}:${b64}`);
      }
    } catch {
      // Photo ignorée si erreur
    }
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

module.exports = { generateVcf };
