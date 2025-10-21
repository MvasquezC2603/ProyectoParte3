import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import teamsRoutes from "./routes/teams.js";
import playersRoutes from "./routes/players.js";
import matchesRoutes from "./routes/matches.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);            // público
app.use("/api", requireAuth, teamsRoutes);   // protegido
app.use("/api", requireAuth, playersRoutes); // protegido
app.use("/api", requireAuth, matchesRoutes); // protegido

const port = process.env.PORT || 3010;
app.listen(port, () => console.log(`[api] http://localhost:${port}`));

