// netlify/functions/_drive.js
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT = process.env.OAUTH_REDIRECT || "http://localhost:8888/.netlify/functions/oauth2callback";

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);

// ---- Look for refresh token ----
let refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

// fallback: load from tokens.json (only exists locally, never pushed to GitHub!)
if (!refreshToken) {
  try {
    const tokenPath = path.join(__dirname, "../../tokens.json");
    const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    refreshToken = tokens.refresh_token;
    console.log("✅ Loaded refresh token from tokens.json");
  } catch {
    console.warn("⚠️ No GOOGLE_REFRESH_TOKEN found in env or tokens.json");
  }
}

if (refreshToken) {
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
}

const drive = google.drive({ version: "v3", auth: oAuth2Client });
module.exports = drive;
