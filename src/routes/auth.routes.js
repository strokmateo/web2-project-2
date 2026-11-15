import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = express.Router();

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
const MIN_PASSWORD_LENGTH = 6;

function readCredentials(body) {
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  return { username, password };
}

router.post('/register', async (req, res) => {
  const { username, password } = readCredentials(req.body);

  if (!USERNAME_PATTERN.test(username)) {
    return res.status(400).json({ error: 'Korisničko ime: 3-30 znakova, slova, brojke i _.' });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Lozinka mora imati barem ${MIN_PASSWORD_LENGTH} znakova.` });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: 'Korisničko ime je zauzeto.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, passwordHash } });

  res.status(201).json({ token: signToken(user) });
});

router.post('/login', async (req, res) => {
  const { username, password } = readCredentials(req.body);

  const user = await prisma.user.findUnique({ where: { username } });
  const passwordMatches = user && (await bcrypt.compare(password, user.passwordHash));
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });
  }

  res.json({ token: signToken(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
