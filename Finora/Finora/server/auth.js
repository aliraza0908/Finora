/**
 * AUTHENTICATION
 * - Password: bcrypt se hash hota hai (plain password kabhi store nahi hota)
 * - Login ke baad JWT token "httpOnly cookie" mein milta hai
 *   (JavaScript is cookie ko padh nahi sakta -> XSS se token chori nahi hota)
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');

const IS_PROD = process.env.NODE_ENV === 'production';
let SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[auth] JWT_SECRET set nahi hai - temporary secret use ho raha hai (restart par sessions khatam).');
}
const COOKIE = 'finora_token';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function issueCookie(res, userId) {
  const token = jwt.sign({ uid: userId }, SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: MAX_AGE, path: '/' });
}
function clearCookie(res) { res.clearCookie(COOKIE, { path: '/' }); }

const getUser = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');

/** Cookie se current user nikalta hai (nahi mila to null). */
function userFromRequest(req) {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) return null;
  try {
    const { uid } = jwt.verify(token, SECRET);
    return getUser.get(uid) || null;
  } catch { return null; }
}

/** API guard: login ke baghair 401. */
function requireAuth(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Pehle login karein.' });
  req.user = user;
  next();
}

module.exports = { issueCookie, clearCookie, userFromRequest, requireAuth };
