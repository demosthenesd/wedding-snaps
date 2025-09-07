// netlify/functions/image.js
const { getDrive } = require("./_drive");

exports.handler = async (event) => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    return { statusCode: 401, body: "Not authenticated. Visit /auth first." };
  }
  try {
    const id = event.path.split("/").pop();
    const drive = getDrive();

    const meta = await drive.files.get({
      fileId: id,
      fields: "mimeType,name",
      supportsAllDrives: true,
    });

    const resp = await drive.files.get(
      { fileId: id, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    );

    const buf = Buffer.from(resp.data);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": meta.data.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=60",
      },
      body: buf.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error("Image error:", e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message || String(e) }) };
  }
};
