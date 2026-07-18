const { MongoClient } = require("mongodb");
const config = require("./config");

let client;
let database;

async function connectDatabase() {
  if (database) return database;

  if (!config.mongoUri.trim()) {
    throw new Error("Missing MONGODB_URI. Create .env or set it in your deploy environment.");
  }

  client = new MongoClient(config.mongoUri.trim());
  await client.connect();
  database = client.db(config.databaseName);

  await database
    .collection(config.playersCollection)
    .createIndex({ username: 1 }, { unique: true });

  await database
    .collection(config.matchHistoryCollection)
    .createIndex({ startedAtUtc: -1 });

  return database;
}

async function getCollections() {
  const db = await connectDatabase();
  return {
    players: db.collection(config.playersCollection),
    matchHistories: db.collection(config.matchHistoryCollection),
  };
}

async function closeDatabase() {
  if (client) await client.close();
  client = null;
  database = null;
}

module.exports = {
  closeDatabase,
  connectDatabase,
  getCollections,
};
