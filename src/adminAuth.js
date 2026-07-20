const crypto = require("crypto");

const COOKIE_NAME = "cocangua_admin";

function encode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, pair) => {
    const separator = pair.indexOf("=");
    if (separator < 0) return cookies;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key) cookies[key] = value;
    return cookies;
  }, {});
}

function createAdminAuth({ secret, sessionSeconds, secureCookies }) {
  const configured = typeof secret === "string" && secret.length >= 12;

  function createToken(now = Date.now()) {
    if (!configured) throw new Error("Admin access is not configured.");
    const payload = encode(JSON.stringify({ exp: now + sessionSeconds * 1000 }));
    return `${payload}.${sign(payload, secret)}`;
  }

  function verifyToken(token, now = Date.now()) {
    if (!configured || typeof token !== "string") return false;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra || !safeEqual(signature, sign(payload, secret))) return false;

    try {
      const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      return Number.isFinite(data.exp) && data.exp > now;
    } catch {
      return false;
    }
  }

  function passwordMatches(password) {
    return configured && safeEqual(password, secret);
  }

  function setSessionCookie(res) {
    const secure = secureCookies ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${createToken()}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${sessionSeconds}${secure}`,
    );
  }

  function clearSessionCookie(res) {
    const secure = secureCookies ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`,
    );
  }

  function requireAdmin(req, res, next) {
    res.setHeader("Cache-Control", "no-store");
    if (!configured) {
      return res.status(503).json({ ok: false, message: "Admin access is not configured." });
    }

    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!verifyToken(token)) {
      return res.status(401).json({ ok: false, message: "Admin login required." });
    }

    return next();
  }

  return {
    clearSessionCookie,
    configured,
    createToken,
    passwordMatches,
    requireAdmin,
    setSessionCookie,
    verifyToken,
  };
}

module.exports = {
  COOKIE_NAME,
  createAdminAuth,
  parseCookies,
  safeEqual,
};
