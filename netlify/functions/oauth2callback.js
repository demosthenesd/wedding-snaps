// netlify/functions/_drive.js
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const {
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,       // from Netlify env in production
  OAUTH_REDIRECT,             // e.g. http://localhost:8888/.netlify/functions/oauth2callback
  DRIVE_FOLDER_ID,
} = process.env;

if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  throw new Error("Missing Google OAuth client credentials in env.");
}

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  OAUTH_REDIRECT
);

// ---- Load refresh token ----
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

const drive = google.drive({ version: "v3", auth: oAuth2Client });
module.exports = { drive, oAuth2Client };
