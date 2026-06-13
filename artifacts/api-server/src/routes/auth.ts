import { Router } from "express";
import { z } from "zod/v4";

const router = Router();

const loginSchema = z.object({
  password: z.string().min(1),
});

router.post("/auth/admin-login", (req, res) => {
  const adminPassword = process.env["ADMIN_PASSWORD"];

  if (!adminPassword) {
    res.status(503).json({ error: "ADMIN_PASSWORD environment variable is not set." });
    return;
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Password is required." });
    return;
  }

  if (parsed.data.password !== adminPassword) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  res.json({ ok: true });
});

export default router;
