import { Router } from 'express';
import { z } from 'zod';
import {
  listPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from '../controllers/playersController.js';

const router = Router();

const PlayerDto = z.object({
  name: z.string().min(1),
  number: z.number().int(),
  teamId: z.number().int(),
});

// validador genérico con zod
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

router.get('/players', listPlayers);                 // ?teamId=1 (opcional)
router.post('/players', validate(PlayerDto), createPlayer);
router.put('/players/:id', validate(PlayerDto), updatePlayer);
router.delete('/players/:id', deletePlayer);

export default router;
