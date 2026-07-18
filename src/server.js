const path = require("path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const config = require("./config");
const { connectDatabase } = require("./db");
const { createPlayer } = require("./playerService");

const app = express();
const publicDir = path.join(__dirname, "..", "public");

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

app.use("/api", (req, res) => {
  res.status(404).json({
    ok: false,
    message: "API endpoint not found.",
  });
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
