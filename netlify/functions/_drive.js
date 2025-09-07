// netlify/functions/_drive.js
const { google } = require("googleapis");

const {
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,       // put your refresh token in Netlify env
  OAUTH_REDIRECT,             // e.g. https://<site>.netlify.app/oauth2callback
} = process.env;

if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  throw new Error("Missing Google OAuth client credentials in env.");
}

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  OAUTH_REDIRECT
);

if (GOOGLE_REFRESH_TOKEN) {
  oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
}

const drive = google.drive({ version: "v3", auth: oAuth2Client });

module.exports = { drive, oAuth2Client };