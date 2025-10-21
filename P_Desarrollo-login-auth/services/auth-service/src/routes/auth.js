import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Datos incompletos" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "El correo ya está registrado" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "8h"
    });
    res.status(201).json({ token, user: { id: user._id, name, email } });
  } catch (e) {
    res.status(500).json({ error: "Error en registro" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "8h"
    });
    res.json({ token, user: { id: user._id, name: user.name, email } });
  } catch {
    res.status(500).json({ error: "Error en login" });
  }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("_id name email");
  res.json({ user });
});

export default router;