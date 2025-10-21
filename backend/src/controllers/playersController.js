import { prisma } from '../db.js';

export async function listPlayers(req, res) {
  const { teamId } = req.query;
  const where = teamId ? { teamId: Number(teamId) } : {};
  const players = await prisma.player.findMany({ where });
  res.json(players);
}

export async function createPlayer(req, res) {
  const data = req.validated ?? req.body;
  const player = await prisma.player.create({
    data: {
      name: data.name,
      number: Number(data.number),
      teamId: Number(data.teamId),
    },
  });
  res.status(201).json(player);
}

export async function updatePlayer(req, res) {
  const id = Number(req.params.id);
  const data = req.validated ?? req.body;
  const player = await prisma.player.update({
    where: { id },
    data: {
      name: data.name,
      number: Number(data.number),
      teamId: Number(data.teamId),
    },
  });
  res.json(player);
}

export async function deletePlayer(req, res) {
  const id = Number(req.params.id);
  await prisma.player.delete({ where: { id } });
  res.json({ ok: true });
}
