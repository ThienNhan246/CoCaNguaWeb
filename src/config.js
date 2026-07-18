require("dotenv").config();

const config = {
  port: Number(process.env.PORT || 3000),
  mongoUri: process.env.MONGODB_URI || "",
  databaseName: process.env.MONGODB_DB || "LudoGameDB",
  playersCollection: process.env.PLAYERS_COLLECTION || "Players",
  matchHistoryCollection: process.env.MATCH_HISTORY_COLLECTION || "MatchHistories",
  defaultSkinId: "default_horse",
  startingCoins: 1000,
};

module.exports = config;
