// netlify/functions/upload-drive.js
const { getDrive } = require("./_drive");
const Busboy = require("busboy");
const { Readable } = require("stream");

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Robust multipart parser for Netlify Functions
function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    // Normalize headers → all lowercase (what Busboy expects)
    const headers = {};
    for (const [k, v] of Object.entries(event.headers || {})) {
      headers[k.toLowerCase()] = v;
    }

    const contentType = headers["content-type"];
    if (!contentType || !contentType.startsWith("multipart/form-data")) {
      return reject(new Error("Invalid or missing Content-Type multipart/form-data"));
    }

    const bb = Busboy({ headers });

    let fileBuffer = null;
    let filename = "upload.jpg";
    let mimeType = "image/jpeg";
    const fields = {};

    bb.on("file", (_name, file, info) => {
      // Busboy v1+: info = { filename, encoding, mimeType }
      filename = info?.filename || filename;
      mimeType = info?.mimeType || mimeType;
      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("end", () => (fileBuffer = Buffer.concat(chunks)));
    });

    bb.on("field", (name, val) => (fields[name] = val));
    bb.on("error", reject);
    bb.on("finish", () => resolve({ fileBuffer, filename, mimeType, fields }));

    // Body may be base64-encoded
    const body = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");

    bb.end(body);
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      // In Netlify prod you must set this. Local dev can use tokens.json via _drive.js fallback.
      return { statusCode: 401, body: "Not authenticated. Run /auth once and set GOOGLE_REFRESH_TOKEN." };
    }

    // Parse multipart
    const { fileBuffer, filename, mimeType } = await parseMultipart(event);
    if (!fileBuffer || !fileBuffer.length) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "No file received" }),
      };
    }

    const drive = getDrive();
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = filename || `photo-${ts}.jpg`;

    const { data } = await drive.files.create({
      requestBody: {
        name: safeName,
        parents: [DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: mimeType || "image/jpeg",
        body: Readable.from(fileBuffer),
      },
      fields: "id,name,mimeType,createdTime",
      supportsAllDrives: true,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, id: data.id, name: data.name }),
    };
  } catch (e) {
    console.error("upload-drive error:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: e.message || String(e) }),
    };
  }
};
