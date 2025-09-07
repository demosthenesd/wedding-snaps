// netlify/functions/image.js
const { drive } = require("./_drive");

exports.handler = async (event) => {
  try {
    const id = event.path.split("/").pop();

    const meta = await drive.files.get({
      fileId: id,
      fields: "mimeType,name",
      supportsAllDrives: true,
    });

    const dl = await drive.files.get(
      { fileId: id, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": meta.data.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=60",
      },
      body: Buffer.from(dl.data).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error("Image error:", e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message || String(e) }) };
  }
};
