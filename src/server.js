const path = require("path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const config = require("./config");
const { createAdminAuth } = require("./adminAuth");
const { connectDatabase } = require("./db");
const {
  createPlayer,
  deletePlayer,
  getPlayerById,
  listPlayers,
  updatePlayer,
} = require("./playerService");

const app = express();
const publicDir = path.join(__dirname, "..", "public");
const adminAuth = createAdminAuth({
  secret: config.adminPassword,
  sessionSeconds: config.adminSessionSeconds,
  secureCookies: config.secureCookies,
});

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: "64kb" }));
app.use(express.static(publicDir));

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

app.get("/api/health", asyncRoute(async (req, res) => {
  await connectDatabase();
  res.json({
    ok: true,
    database: config.databaseName,
    playersCollection: config.playersCollection,
    matchHistoryCollection: config.matchHistoryCollection,
  });
}));

app.post("/api/register", asyncRoute(async (req, res) => {
  const player = await createPlayer(req.body);
  res.status(201).json({
    ok: true,
    message: "Register success. You can now log in from the game exe.",
    player,
  });
}));

app.post("/api/admin/login", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!adminAuth.configured) {
    return res.status(503).json({ ok: false, message: "Admin access is not configured." });
  }
  if (!adminAuth.passwordMatches(req.body && req.body.password)) {
    return res.status(401).json({ ok: false, message: "Admin password is incorrect." });
  }

  adminAuth.setSessionCookie(res);
  return res.json({ ok: true, message: "Admin login successful." });
});

app.post("/api/admin/logout", (req, res) => {
  adminAuth.clearSessionCookie(res);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ ok: true });
});

app.get("/api/admin/session", adminAuth.requireAdmin, (req, res) => {
  res.json({ ok: true, authenticated: true });
});

app.get("/api/admin/players", adminAuth.requireAdmin, asyncRoute(async (req, res) => {
  const players = await listPlayers(req.query.q);
  res.json({ ok: true, players });
}));

app.post("/api/admin/players", adminAuth.requireAdmin, asyncRoute(async (req, res) => {
  const player = await createPlayer(req.body);
  res.status(201).json({ ok: true, player });
}));

app.get("/api/admin/players/:id", adminAuth.requireAdmin, asyncRoute(async (req, res) => {
  const player = await getPlayerById(req.params.id);
  if (!player) return res.status(404).json({ ok: false, message: "Player not found." });
  return res.json({ ok: true, player });
}));

app.patch("/api/admin/players/:id", adminAuth.requireAdmin, asyncRoute(async (req, res) => {
  const player = await updatePlayer(req.params.id, req.body);
  res.json({ ok: true, player });
}));

app.delete("/api/admin/players/:id", adminAuth.requireAdmin, asyncRoute(async (req, res) => {
  const deleted = await deletePlayer(req.params.id);
  if (!deleted) return res.status(404).json({ ok: false, message: "Player not found." });
  return res.json({ ok: true });
}));

app.use("/api", (req, res) => {
  res.status(404).json({
    ok: false,
    message: "API endpoint not found.",
  });
});

app.get("/admin", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, req, res, next) => {
  if (error && error.code === 11000) {
    return res.status(409).json({
      ok: false,
      message: "Username already exists.",
    });
  }

  const status = error.status || 500;
  return res.status(status).json({
    ok: false,
    message: error.message || "Server error.",
  });
});

connectDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Co Ca Ngua web is running on http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
