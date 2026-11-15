import jwt from 'jsonwebtoken';
import config from './config.js';

function roleFor(username) {
  return username === config.adminUsername ? 'admin' : 'user';
}

export function signToken(user) {
  const payload = { username: user.username, role: roleFor(user.username) };
  return jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn,
  });
}

function readBearerToken(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  return scheme === 'Bearer' ? token : null;
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

function decodeTokenWithoutVerifying(token) {
  return jwt.decode(token);
}

export function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Nedostaje token.' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: `Neispravan token: ${err.message}` });
  }
}

export function requireAdmin(req, res, next) {
  const vulnerable = req.query.vulnerable === 'true';
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Nedostaje token.' });
  }

  let payload;
  try {
    payload = vulnerable ? decodeTokenWithoutVerifying(token) : verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: `Neispravan token: ${err.message}` });
  }

  if (payload?.role !== 'admin') {
    return res.status(403).json({ error: 'Zabranjeno: potrebna je uloga admin.', tokenPayload: payload });
  }

  req.user = payload;
  req.tokenCheck = vulnerable ? 'jwt.decode() - potpis NIJE provjeren' : 'jwt.verify() - potpis provjeren';
  next();
}
