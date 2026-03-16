const fs   = require('fs');
const path = require('path');

const SVG_DIR = path.join(__dirname, '../../public/icons/social');

const SOCIAL_NETWORKS = [
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'x',         label: 'X (Twitter)' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'threads',   label: 'Threads' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'snapchat',  label: 'Snapchat' },
  { value: 'behance',   label: 'Behance' },
  { value: 'twitch',    label: 'Twitch' },
  { value: 'web',       label: 'Site web' },
  { value: 'calendar',  label: 'Calendrier' },
];

// Labels plats pour les exports texte (signatures email)
const SOCIAL_LABELS = Object.fromEntries(SOCIAL_NETWORKS.map(n => [n.value, n.label]));

const cache = {};

/**
 * Retourne le contenu SVG inline prêt à l'emploi.
 * - fill="currentColor" injecté sur <svg> → la couleur se contrôle via la propriété CSS `color`
 * - bounding box transparente préservée
 * - attributs id supprimés pour éviter les conflits de page
 *
 * @param {string} network  ex: 'linkedin', 'facebook', 'web', 'calendar'
 * @param {string} style    'plat' | 'cercle' | 'carre' (défaut: 'plat')
 * @returns {string|null}   SVG string ou null si introuvable
 */
function getSocialIconSvg(network, style = 'plat') {
  const key = `${network}_${style}`;
  if (cache[key] !== undefined) return cache[key];

  try {
    let svg = fs.readFileSync(path.join(SVG_DIR, `${key}.svg`), 'utf8');

    // Supprime la déclaration XML (non valide en inline HTML)
    svg = svg.replace(/<\?xml[^?]*\?>\n?/g, '');

    // Supprime les attributs id pour éviter les doublons sur la page
    svg = svg.replace(/ id="[^"]*"/g, '');

    // Supprime le bloc <defs> (contient .cls-1 { fill: none } et .cls-2)
    svg = svg.replace(/<defs>[\s\S]*?<\/defs>\s*/g, '');

    // Remplace class="cls-1" (bounding box) par fill="none" en attribut de présentation
    svg = svg.replace(/class="cls-1"/g, 'fill="none"');

    // Remplace class="cls-2" (fill-rule: evenodd) par attribut de présentation
    svg = svg.replace(/class="cls-2"/g, 'fill-rule="evenodd"');

    // Injecte fill="currentColor" sur l'élément <svg> pour que la couleur
    // soit contrôlable via la propriété CSS `color` du conteneur parent
    svg = svg.replace(/^<svg /, '<svg fill="currentColor" ');

    cache[key] = svg.trim();
    return cache[key];
  } catch {
    cache[key] = null;
    return null;
  }
}

module.exports = { getSocialIconSvg, SOCIAL_NETWORKS, SOCIAL_LABELS };
