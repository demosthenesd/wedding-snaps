// netlify/functions/auth.js
const { getOAuth2Client } = require("./_drive");
exports.handler = async () => {
  const auth = getOAuth2Client();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });
  return {
    statusCode: 302,
    headers: { Location: url },
  };
};
