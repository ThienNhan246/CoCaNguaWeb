const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminAuth, parseCookies, safeEqual } = require("../src/adminAuth");

function makeAuth() {
  return createAdminAuth({
    secret: "test-admin-password",
    sessionSeconds: 60,
    secureCookies: false,
  });
}

test("creates and verifies a signed admin token", () => {
  const auth = makeAuth();
  const token = auth.createToken(1_000);

  assert.equal(auth.verifyToken(token, 1_500), true);
  assert.equal(auth.verifyToken(token, 61_001), false);
});

test("rejects tampered and malformed tokens", () => {
  const auth = makeAuth();
  const token = auth.createToken(1_000);
  const [payload, signature] = token.split(".");

  assert.equal(auth.verifyToken(`${payload}.${signature}x`, 1_500), false);
  assert.equal(auth.verifyToken("not-a-token", 1_500), false);
});

test("requires a sufficiently long configured password", () => {
  const auth = createAdminAuth({ secret: "short", sessionSeconds: 60, secureCookies: false });

  assert.equal(auth.configured, false);
  assert.equal(auth.passwordMatches("short"), false);
  assert.throws(() => auth.createToken(), /not configured/i);
});

test("compares passwords and parses cookies safely", () => {
  const auth = makeAuth();

  assert.equal(auth.passwordMatches("test-admin-password"), true);
  assert.equal(auth.passwordMatches("wrong-password"), false);
  assert.equal(safeEqual("same", "same"), true);
  assert.equal(safeEqual("same", "different"), false);
  assert.deepEqual(parseCookies("theme=dark; cocangua_admin=token.value"), {
    theme: "dark",
    cocangua_admin: "token.value",
  });
});
