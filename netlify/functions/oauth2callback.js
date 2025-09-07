// netlify/functions/oauth2callback.js
const { oAuth2Client } = require("./_drive");

exports.handler = async (event) => {
  try {
    const code = new URL(event.rawUrl).searchParams.get("code");
    const { tokens } = await oAuth2Client.getToken(code);

    return {
      statusCode: 200,
      body: `
        <h2>OAuth complete ✅</h2>
        <p>Copy this REFRESH TOKEN into Netlify as <code>GOOGLE_REFRESH_TOKEN</code>:</p>
        <pre>${tokens.refresh_token}</pre>
        <p>Then redeploy your site, and guests can upload without ever logging in.</p>
      `,
    };
  } catch (err) {
    return { statusCode: 500, body: "OAuth error: " + err.message };
  }
};
