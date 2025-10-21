import { Router } from 'express';
import { z } from 'zod';
import {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
} from '../controllers/teamsController.js';

const router = Router();

/**
 * OJO: en tu schema.prisma, Team.city es String (no opcional).
 * Por eso aquí lo marcamos como requerido.
 */
const TeamDto = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  logoUrl: z.string().url().optional(),
});

// middleware simple de validación con zod
function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'validation_error', details: parsed.error.format() });
    }
    req.validated = parsed.data;
    next();
  };
}

// Rutas
router.get('/teams', listTeams);
router.get('/teams/:id', getTeam);
router.post('/teams', validate(TeamDto), createTeam);
router.put('/teams/:id', validate(TeamDto), updateTeam);
router.delete('/teams/:id', deleteTeam);

export default router;
