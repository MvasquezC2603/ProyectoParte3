// backend/src/controllers/teamsController.js
import { prisma } from '../db.js';

export async function listTeams(_req, res) {
  const teams = await prisma.team.findMany({
    include: { players: true },
  });
  res.json(teams);
}

export async function getTeam(req, res) {
  const id = Number(req.params.id);
  const team = await prisma.team.findUnique({
    where: { id },
    include: { players: true, homeMatches: true, awayMatches: true },
  });
  if (!team) return res.status(404).json({ error: 'not_found' });
  res.json(team);
}

export async function createTeam(req, res) {
  const data = req.validated ?? req.body; // si no usas zod en alguna ruta
  const { name, city, logoUrl } = data || {};
  if (!name || !city) return res.status(400).json({ error: 'missing_fields' });

  const team = await prisma.team.create({ data: { name, city, logoUrl } });
  res.status(201).json(team);
}

export async function updateTeam(req, res) {
  const id = Number(req.params.id);
  const data = req.validated ?? req.body;
  const { name, city, logoUrl } = data || {};
  if (!name || !city) return res.status(400).json({ error: 'missing_fields' });

  const team = await prisma.team.update({
    where: { id },
    data: { name, city, logoUrl },
  });
  res.json(team);
}

export async function deleteTeam(req, res) {
  const id = Number(req.params.id);
  // Borra jugadores para respetar FK
  await prisma.player.deleteMany({ where: { teamId: id } });
  await prisma.team.delete({ where: { id } });
  res.json({ ok: true });
}
