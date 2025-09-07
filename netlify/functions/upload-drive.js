// netlify/functions/upload-drive.js
const { drive } = require("./_drive");
const Busboy = require("busboy");

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: event.headers });
    let fileBuffer = Buffer.from([]);
    let filename = "upload.jpg";

    busboy.on("file", (fieldname, file, info) => {
      filename = info.filename || filename;
      file.on("data", (d) => (fileBuffer = Buffer.concat([fileBuffer, d])));
    });

    busboy.on("finish", async () => {
      try {
        const res = await drive.files.create({
          requestBody: { name: filename, parents: [DRIVE_FOLDER_ID] },
          media: { mimeType: "image/jpeg", body: Buffer.from(fileBuffer) },
          fields: "id,name",
        });
        resolve({
          statusCode: 200,
          body: JSON.stringify({ ok: true, id: res.data.id, name: res.data.name }),
        });
      } catch (e) {
        reject({ statusCode: 500, body: e.message });
      }
    });

    busboy.end(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
  });
};
