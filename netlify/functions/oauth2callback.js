// netlify/functions/oauth2callback.js
const { getOAuth2Client } = require("./_drive");

exports.handler = async (event) => {
  try {
    const auth = getOAuth2Client();
    const url = new URL(event.rawUrl);
    const code = url.searchParams.get("code");
    if (!code) {
      return { statusCode: 400, body: "Missing code" };
    }
    const { tokens } = await auth.getToken(code);

    // Show refresh token so you can copy it into Netlify env
    const html = `
      <h1>OAuth complete</h1>
      <p>Copy this <strong>REFRESH TOKEN</strong> into Netlify env as <code>GOOGLE_REFRESH_TOKEN</code>:</p>
      <pre style="white-space:pre-wrap">${tokens.refresh_token || "(no refresh_token received; try removing access & retry)"}</pre>
      <p>Then redeploy and you can use the app without this page.</p>
    `;
    return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
  } catch (e) {
    return { statusCode: 500, body: String(e && e.message || e) };
  }
};
