// server.js
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_REDIRECT_URI } = process.env;
const REDIRECT = (OAUTH_REDIRECT_URI || "http://localhost:3000/auth/google/callback").trim();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cookieParser());

// ---- static files & pages
const REG_DIR   = path.join(__dirname, "register");
const REG_FILE  = path.join(REG_DIR, "register.html");
const TEST_FILE = path.join(__dirname, "test.html");

console.log("[CONF] CLIENT_ID:", GOOGLE_CLIENT_ID);
console.log("[CONF] REDIRECT:", JSON.stringify(REDIRECT));
console.log("[BOOT] REG_FILE exists?", fs.existsSync(REG_FILE), REG_FILE);
console.log("[BOOT] TEST_FILE exists?", fs.existsSync(TEST_FILE), TEST_FILE);

app.use((req, _res, next) => { console.log(req.method, req.url); next(); });
app.use("/register", express.static(REG_DIR, { extensions: ["html"] }));
app.get(["/register", "/register/", "/register/register", "/register/register.html"], (_req, res) => res.sendFile(REG_FILE));
app.get("/test.html", (_req, res) => res.sendFile(TEST_FILE));
app.get("/auth/google/callback", (_req, res) => res.send("Google OAuth callback received."));
app.get("/", (_req, res) => res.send("Auth server running"));

// session helpers (your test.html uses these)
app.get("/me", (req, res) => {
  try {
    const user = req.cookies?.sid ? JSON.parse(req.cookies.sid) : null;
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});
app.post("/logout", (_req, res) => {
  res.clearCookie("sid");
  res.json({ ok: true });
});

// ---- single exchange route (ONLY here we call Google)
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.post("/auth/google/exchange", async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ ok:false, error:"missing_code" });
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ ok:false, error:"server_config_missing" });
    }

    console.log("[XCHG] redirect_uri ->", JSON.stringify(REDIRECT));

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT
    });

    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { id_token } = tokenRes.data;

    const ticket = await oauthClient.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID
    });
    const p = ticket.getPayload();
    const user = { sub: p.sub, email: p.email, name: p.name, picture: p.picture };

    res.cookie("sid", JSON.stringify(user), { httpOnly: true, sameSite: "lax", secure: false });
    res.json({ ok:true, user });
  } catch (e) {
    console.error("EXCHANGE ERROR:", e?.response?.data || e);
    const msg =
      e?.response?.data?.error_description ||
      e?.response?.data?.error ||
      e.message || "exchange_failed";
    res.status(400).json({ ok:false, error: msg });
  }
});

app.listen(3000, "localhost", () => console.log("Server running at http://localhost:3000"));
