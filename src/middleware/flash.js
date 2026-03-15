// Injecte les messages flash dans les locals EJS
module.exports = function flashMiddleware(req, res, next) {
  res.locals.flashSuccess = req.flash('success');
  res.locals.flashError   = req.flash('error');
  res.locals.flashInfo    = req.flash('info');
  next();
};
