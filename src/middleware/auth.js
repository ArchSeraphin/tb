// Vérifie que l'utilisateur est connecté
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash('error', 'Vous devez être connecté pour accéder à cette page.');
  res.redirect('/auth/login');
}

// Redirige les utilisateurs déjà connectés (ex: pages login/register)
function isGuest(req, res, next) {
  if (!req.isAuthenticated()) return next();
  res.redirect('/dashboard');
}

module.exports = { isAuthenticated, isGuest };
