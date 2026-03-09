// middleware/flash.js

function flashMiddleware(req, res, next) {
  // ── WRITER ──────────────────────────────────
  req.flash = function (type, message) {
    if (!req.session.flash) {
      req.session.flash = [];
    }
    req.session.flash.push({ type, message });
  };

  // ── READER ──────────────────────────────────
  if (req.session.flash && req.session.flash.length > 0) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  } else {
    res.locals.flash = [];
  }

  next();
}

module.exports = flashMiddleware;