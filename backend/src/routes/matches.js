import { Router } from 'express';
import { z } from 'zod';
import {
  listMatches,
  createMatch,
  updateScore,
  deleteMatch,
} from '../controllers/matchesController.js';

const router = Router();

const MatchCreateDto = z.object({
  homeId: z.number().int(),
  awayId: z.number().int(),
  date: z.string(), // ISO string
});

const MatchScoreDto = z.object({
  scoreHome: z.number().int(),
  scoreAway: z.number().int(),
});

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

router.get('/matches', listMatches);
router.post('/matches', validate(MatchCreateDto), createMatch);
router.put('/matches/:id/score', validate(MatchScoreDto), updateScore);
router.delete('/matches/:id', deleteMatch);

export default router;
