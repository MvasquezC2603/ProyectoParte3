import { prisma } from '../db.js';

export async function listMatches(_req, res) {
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { date: 'asc' },
  });
  res.json(matches);
}

export async function createMatch(req, res) {
  const data = req.validated ?? req.body;
  const match = await prisma.match.create({
    data: {
      homeId: Number(data.homeId),
      awayId: Number(data.awayId),
      date: new Date(data.date),
    },
  });
  res.status(201).json(match);
}

export async function updateScore(req, res) {
  const id = Number(req.params.id);
  const data = req.validated ?? req.body;
  const match = await prisma.match.update({
    where: { id },
    data: {
      scoreHome: Number(data.scoreHome),
      scoreAway: Number(data.scoreAway),
    },
    include: { homeTeam: true, awayTeam: true },
  });
  res.json(match);
}

export async function deleteMatch(req, res) {
  const id = Number(req.params.id);
  await prisma.match.delete({ where: { id } });
  res.json({ ok: true });
}
