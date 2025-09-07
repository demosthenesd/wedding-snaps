// netlify/functions/upload-drive.js
const { getDrive, DRIVE_FOLDER_ID } = require("./_drive");
const Busboy = require("busboy");
const { Readable } = require("stream");

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    let fileBuf = null;
    let filename = "photo.jpg";
    let mimetype = "image/jpeg";

    const bb = Busboy({
      headers: event.headers,
    });

    bb.on("file", (_name, file, info) => {
      filename = info.filename || filename;
      mimetype = info.mimeType || mimetype;
      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("end", () => {
        fileBuf = Buffer.concat(chunks);
      });
    });

    bb.on("field", (name, val) => { fields[name] = val; });
    bb.on("error", reject);
    bb.on("close", () => resolve({ fields, fileBuf, filename, mimetype }));

    // Body may be base64-encoded
    const body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
    bb.end(body);
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  // Require that a refresh token is configured
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    return { statusCode: 401, body: "Not authenticated. Visit /auth and set GOOGLE_REFRESH_TOKEN in Netlify env." };
  }

  try {
    const { fileBuf, filename, mimetype } = await parseMultipart(event);
    if (!fileBuf) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "No file" }) };

    const drive = getDrive();
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = filename || `photo-${ts}.jpg`;

    const fileMetadata = { name: safeName, parents: [DRIVE_FOLDER_ID] };
    const media = { mimeType: mimetype || "image/jpeg", body: Readable.from(fileBuf) };

    const { data } = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id,name,mimeType,createdTime",
      supportsAllDrives: true,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, id: data.id, name: data.name }),
    };
  } catch (e) {
    console.error("Upload error:", e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message || String(e) }) };
  }
};
