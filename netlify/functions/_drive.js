// netlify/functions/_drive.js
const { google } = require("googleapis");

const {
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,       // put your refresh token in Netlify env
  OAUTH_REDIRECT,             // e.g. https://<site>.netlify.app/oauth2callback
  DRIVE_FOLDER_ID,
} = process.env;

if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID/SECRET");
}
if (!DRIVE_FOLDER_ID) {
  throw new Error("Missing DRIVE_FOLDER_ID");
}

function getOAuth2Client() {
  const redirect = OAUTH_REDIRECT; // must match the value in Google Console
  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    redirect
  );

  // Provide the refresh_token each invocation; googleapis fetches access token on the fly
  if (GOOGLE_REFRESH_TOKEN) {
    oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  }
  return oAuth2Client;
}

function getDrive() {
  const auth = getOAuth2Client();
  return google.drive({ version: "v3", auth });
}

async function ensureFolderOnAllDrives(drive) {
  // Optional: sanity check (not strictly required every call)
  const { data } = await drive.files.get({
    fileId: DRIVE_FOLDER_ID,
    fields: "id,name,mimeType,driveId",
    supportsAllDrives: true,
  });
  if (data.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error(`The ID is not a folder (mimeType=${data.mimeType}).`);
  }
  return data.driveId || null;
}

module.exports = {
  getDrive,
  ensureFolderOnAllDrives,
  DRIVE_FOLDER_ID,
  getOAuth2Client
};
