const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const jwt = require("jsonwebtoken");

// A local server stands in for https://<ref>.supabase.co and serves the JWKS.
const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "ES256", use: "sig" };

let server;
let supabaseAuth;
let issuer;

test.before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === "/auth/v1/.well-known/jwks.json") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ keys: [jwk] }));
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  issuer = `${url}/auth/v1`;
  Object.assign(process.env, {
    SUPABASE_URL: url,
    AUTH_MODE: "supabase",
    DATABASE_URL: "postgresql://u:p@localhost:5432/d",
  });
  supabaseAuth = require("../src/lib/supabaseAuth");
});

test.after(() => server.close());

const sign = (claims = {}, options = {}) => jwt.sign(
  { sub: crypto.randomUUID(), email: "Guest@Example.com", aud: "authenticated", iss: issuer, ...claims },
  privateKey,
  { algorithm: "ES256", keyid: "test-key", expiresIn: "1h", ...options },
);

test("accepts a valid Supabase token and lowercases the email", async () => {
  const id = crypto.randomUUID();
  const identity = await supabaseAuth.verifySupabaseToken(sign({ sub: id, user_metadata: { name: "Asha" } }));
  assert.equal(identity.sub, id);
  assert.equal(identity.email, "guest@example.com");
  assert.equal(identity.name, "Asha");
});

test("rejects expired, wrong-issuer and wrong-audience tokens", async () => {
  await assert.rejects(supabaseAuth.verifySupabaseToken(sign({}, { expiresIn: -10 })), { code: "TOKEN_INVALID" });
  await assert.rejects(supabaseAuth.verifySupabaseToken(sign({ iss: "https://evil.example/auth/v1" })), { code: "TOKEN_INVALID" });
  await assert.rejects(supabaseAuth.verifySupabaseToken(sign({ aud: "anon" })), { code: "TOKEN_INVALID" });
});

test("rejects tokens signed by an unknown key and HS256 tokens", async () => {
  const other = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey;
  const forged = jwt.sign({ sub: "x", email: "a@b.co", aud: "authenticated", iss: issuer }, other, { algorithm: "ES256", keyid: "test-key" });
  await assert.rejects(supabaseAuth.verifySupabaseToken(forged), { code: "TOKEN_INVALID" });
  const hs = jwt.sign({ sub: "x", email: "a@b.co", aud: "authenticated", iss: issuer }, "secret", { algorithm: "HS256" });
  await assert.rejects(supabaseAuth.verifySupabaseToken(hs), { code: "TOKEN_INVALID" });
});
