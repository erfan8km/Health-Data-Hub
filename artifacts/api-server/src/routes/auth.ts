import { Router } from "express";

const router = Router();

router.post("/auth/admin-login", (req, res) => {
  const adminPassword = process.env["ADMIN_PASSWORD"];

  if (!adminPassword) {
    res.status(503).json({ error: "ADMIN_PASSWORD environment variable is not set." });
    return;
  }

  const password = req.body?.password;

  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "Password is required." });
    return;
  }

  if (password !== adminPassword) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  res.json({ ok: true });
});

export default router;
