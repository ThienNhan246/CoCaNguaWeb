require("dotenv").config();

const config = {
  port: Number(process.env.PORT || 3000),
  mongoUri: process.env.MONGODB_URI || "",
  databaseName: process.env.MONGODB_DB || "LudoGameDB",
  playersCollection: process.env.PLAYERS_COLLECTION || "Players",
  matchHistoryCollection: process.env.MATCH_HISTORY_COLLECTION || "MatchHistories",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminSessionSeconds: 8 * 60 * 60,
  secureCookies: process.env.RENDER === "true" || process.env.NODE_ENV === "production",
  defaultSkinId: "default_horse",
  startingCoins: 1000,
};

module.exports = config;
