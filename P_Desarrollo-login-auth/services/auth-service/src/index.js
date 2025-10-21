process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: false }));
app.use(express.json());

app.get("/", (_req, res) => res.json({ ok: true, service: "auth-service" }));

app.use("/api/auth", authRoutes);

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB conectado");
    app.listen(process.env.PORT || 4000, () =>
      console.log(`✅ auth-service en puerto ${process.env.PORT || 4000}`)
    );
  } catch (err) {
    console.error("❌ Error al iniciar:", err.message);
    process.exit(1);
  }
};

start();