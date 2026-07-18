function normalizeUsername(username) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function normalizeDisplayName(displayName, fallbackUsername) {
  const value = typeof displayName === "string" ? displayName.trim() : "";
  return value || fallbackUsername;
}

function validateCredentials(username, password) {
  if (!username) return "Username is required.";
  if (!password) return "Password is required.";
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return "";
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

module.exports = {
  normalizeDisplayName,
  normalizeUsername,
  toInteger,
  toStringArray,
  validateCredentials,
};
