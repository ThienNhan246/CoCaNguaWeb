const crypto = require("crypto");

function createPasswordHash(password) {
  const saltBuffer = crypto.randomBytes(16);
  const passwordSalt = saltBuffer.toString("base64");
  const passwordHash = hashPassword(password, passwordSalt);

  return { passwordSalt, passwordHash };
}

function hashPassword(password, passwordSalt) {
  const saltBuffer = Buffer.from(passwordSalt, "base64");
  return crypto
    .createHmac("sha256", saltBuffer)
    .update(password, "utf8")
    .digest("base64");
}

function verifyPassword(player, password) {
  if (player.passwordHash && player.passwordSalt) {
    return hashPassword(password, player.passwordSalt) === player.passwordHash;
  }

  return Boolean(player.password && player.password === password);
}

module.exports = {
  createPasswordHash,
  hashPassword,
  verifyPassword,
};
