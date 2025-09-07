// netlify/functions/auth.js
const { oAuth2Client } = require("./_drive");

exports.handler = async () => {
  const scopes = ["https://www.googleapis.com/auth/drive.file"];
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
  return {
    statusCode: 302,
    headers: { Location: url },
    body: "Redirecting to Google OAuth...",
  };
};
