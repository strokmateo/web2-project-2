import express from 'express';
import prisma from '../db.js';
import { requireAdmin } from '../auth.js';

const router = express.Router();

router.use(requireAdmin);

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      notes: { select: { id: true, content: true }, orderBy: { id: 'asc' } },
    },
  });

  res.json({ tokenCheck: req.tokenCheck, requestedBy: req.user, users });
});

export default router;
