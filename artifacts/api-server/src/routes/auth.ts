import { Router } from "express";
import {
  clearAdminSession,
  compareAdminPassword,
  hasValidAdminSession,
  requireAdmin,
  setAdminSession,
} from "../middleware/admin-auth";

const router = Router();

router.post("/auth/admin-login", (req, res) => {
  const adminPassword = process.env["ADMIN_PASSWORD"];

  if (!adminPassword || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    res.status(503).json({ error: "Admin authentication is not configured." });
    return;
  }

  const password = req.body?.password;

  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "Password is required." });
    return;
  }

  if (!compareAdminPassword(password)) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  res.json({ ok: true, expiresAt: setAdminSession(res) });
});

router.get("/auth/admin-session", (req, res) => {
  res.json({ authenticated: hasValidAdminSession(req) });
});

router.post("/auth/admin-logout", requireAdmin, (_req, res) => {
  clearAdminSession(res);
  res.status(204).send();
});

export default router;
