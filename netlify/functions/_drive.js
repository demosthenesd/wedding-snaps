// netlify/functions/_drive.js
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const {
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN, // used in Netlify prod
  OAUTH_REDIRECT        // optional; we auto-derive if missing
} = process.env;

if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  throw new Error("Missing Google OAuth client credentials in env.");
}

// Auto-derive redirect on Netlify; fallback to localhost for dev
const DEFAULT_BASE = process.env.URL || "http://localhost:8888";
const REDIRECT = OAUTH_REDIRECT || `${DEFAULT_BASE}/.netlify/functions/oauth2callback`;

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  REDIRECT
);

// Find a refresh token: prefer env (Netlify), else local tokens.json (dev)
let refreshToken = GOOGLE_REFRESH_TOKEN;
if (!refreshToken) {
  try {
    const tokenPath = path.join(__dirname, "../../tokens.json");
    const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    refreshToken = tokens.refresh_token;
    console.log("✅ Using refresh token from tokens.json (local dev)");
  } catch {
    console.warn("⚠️ No refresh token found in env or tokens.json");
  }
}
if (refreshToken) {
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
}

function getDrive() {
  return google.drive({ version: "v3", auth: oAuth2Client });
}

const drive = getDrive();

module.exports = { drive, getDrive, oAuth2Client };
