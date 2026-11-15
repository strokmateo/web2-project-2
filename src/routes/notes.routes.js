import express from "express";
import prisma from "../db.js";
import { requireAuth } from "../auth.js";

const router = express.Router();
const MAX_NOTE_LENGTH = 1000;

router.use(requireAuth);

router.get("/", async (req, res) => {
  const notes = await prisma.note.findMany({
    where: { ownerId: Number(req.user.sub) },
    orderBy: { createdAt: "desc" },
  });
  res.json({ notes });
});

router.post("/", async (req, res) => {
  const content =
    typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content || content.length > MAX_NOTE_LENGTH) {
    return res
      .status(400)
      .json({ error: `Bilješka mora imati 1-${MAX_NOTE_LENGTH} znakova.` });
  }

  const note = await prisma.note.create({
    data: { content, ownerId: Number(req.user.sub) },
  });
  res.status(201).json({ note });
});

router.delete("/:id", async (req, res) => {
  const { count } = await prisma.note.deleteMany({
    where: { id: Number(req.params.id), ownerId: Number(req.user.sub) },
  });
  if (count === 0) {
    return res.status(404).json({ error: "Bilješka nije pronađena." });
  }
  res.status(204).end();
});

export default router;
