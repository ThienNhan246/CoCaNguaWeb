const { ObjectId } = require("mongodb");
const config = require("./config");
const { getCollections } = require("./db");
const { createPasswordHash } = require("./password");
const {
  normalizeDisplayName,
  normalizeUsername,
  toInteger,
  toStringArray,
  validateCredentials,
} = require("./validators");

const safeProjection = {
  password: 0,
  passwordHash: 0,
  passwordSalt: 0,
};

function objectIdFromString(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

function playerFilterFromId(id) {
  const objectId = objectIdFromString(id);
  if (!objectId) return null;
  return { _id: objectId };
}

async function createPlayer(input) {
  const username = normalizeUsername(input.username);
  const password = typeof input.password === "string" ? input.password : "";
  const displayName = normalizeDisplayName(input.displayName, username);
  const validationMessage = validateCredentials(username, password);

  if (validationMessage) {
    const error = new Error(validationMessage);
    error.status = 400;
    throw error;
  }

  const { players } = await getCollections();
  const existing = await players.findOne({ username }, { projection: { _id: 1 } });

  if (existing) {
    const error = new Error("Username already exists.");
    error.status = 409;
    throw error;
  }

  const { passwordHash, passwordSalt } = createPasswordHash(password);
  const now = new Date();
  const startingCoins = input.coins == null
    ? config.startingCoins
    : Math.max(0, toInteger(input.coins, config.startingCoins));

  const ownedSkinIds = toStringArray(input.ownedSkinIds);
  if (!ownedSkinIds.includes(config.defaultSkinId)) {
    ownedSkinIds.unshift(config.defaultSkinId);
  }

  const equippedSkinId = typeof input.equippedSkinId === "string" && input.equippedSkinId.trim()
    ? input.equippedSkinId.trim()
    : config.defaultSkinId;

  const player = {
    username,
    passwordHash,
    passwordSalt,
    displayName,
    coins: startingCoins,
    ownedSkinIds,
    equippedSkinId,
    rewardedMatchIds: [],
    createdAtUtc: now,
    lastLoginUtc: now,
  };

  const result = await players.insertOne(player);
  return getPlayerById(result.insertedId.toString());
}

async function listPlayers(search = "") {
  const { players } = await getCollections();
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = normalizedSearch
    ? {
        $or: [
          { username: { $regex: escapedSearch, $options: "i" } },
          { displayName: { $regex: escapedSearch, $options: "i" } },
        ],
      }
    : {};

  return players
    .find(filter, { projection: safeProjection })
    .sort({ createdAtUtc: -1 })
    .limit(100)
    .toArray();
}

async function getPlayerById(id) {
  const { players } = await getCollections();
  const filter = playerFilterFromId(id);
  if (!filter) return null;
  return players.findOne(filter, { projection: safeProjection });
}

async function updatePlayer(id, input) {
  const { players } = await getCollections();
  const filter = playerFilterFromId(id);
  if (!filter) {
    const error = new Error("Invalid player id.");
    error.status = 400;
    throw error;
  }

  const update = {};

  if (typeof input.username === "string") {
    const username = normalizeUsername(input.username);
    if (username.length < 3) {
      const error = new Error("Username must be at least 3 characters.");
      error.status = 400;
      throw error;
    }

    const existing = await players.findOne(
      { username, _id: { $ne: filter._id } },
      { projection: { _id: 1 } },
    );
    if (existing) {
      const error = new Error("Username already exists.");
      error.status = 409;
      throw error;
    }
    update.username = username;
  }

  if (typeof input.displayName === "string") {
    update.displayName = input.displayName.trim();
  }

  if (input.coins != null) {
    update.coins = Math.max(0, toInteger(input.coins, 0));
  }

  if (input.ownedSkinIds != null) {
    const ownedSkinIds = toStringArray(input.ownedSkinIds);
    if (!ownedSkinIds.includes(config.defaultSkinId)) {
      ownedSkinIds.unshift(config.defaultSkinId);
    }
    update.ownedSkinIds = ownedSkinIds;
  }

  if (typeof input.equippedSkinId === "string") {
    update.equippedSkinId = input.equippedSkinId.trim() || config.defaultSkinId;
  }

  if (typeof input.password === "string" && input.password.trim()) {
    if (input.password.length < 6) {
      const error = new Error("Password must be at least 6 characters.");
      error.status = 400;
      throw error;
    }
    const { passwordHash, passwordSalt } = createPasswordHash(input.password);
    update.passwordHash = passwordHash;
    update.passwordSalt = passwordSalt;
  }

  if (Object.keys(update).length === 0) {
    return getPlayerById(id);
  }

  const result = await players.findOneAndUpdate(
    filter,
    {
      $set: update,
      $unset: input.password ? { password: "" } : {},
    },
    {
      projection: safeProjection,
      returnDocument: "after",
    },
  );

  if (!result) {
    const error = new Error("Player not found.");
    error.status = 404;
    throw error;
  }

  return result;
}

async function deletePlayer(id) {
  const { players } = await getCollections();
  const filter = playerFilterFromId(id);
  if (!filter) {
    const error = new Error("Invalid player id.");
    error.status = 400;
    throw error;
  }

  const result = await players.deleteOne(filter);
  return result.deletedCount > 0;
}

async function listMatchHistories(limit = 25) {
  const { matchHistories } = await getCollections();
  return matchHistories
    .find({})
    .sort({ startedAtUtc: -1 })
    .limit(Math.min(Math.max(toInteger(limit, 25), 1), 100))
    .toArray();
}

module.exports = {
  createPlayer,
  deletePlayer,
  getPlayerById,
  listMatchHistories,
  listPlayers,
  updatePlayer,
};
