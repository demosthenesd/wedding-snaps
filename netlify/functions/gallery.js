// netlify/functions/gallery.js
const { drive } = require("./_drive");

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

exports.handler = async () => {
  try {
    const { data } = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
      orderBy: "createdTime desc",
      pageSize: 30,
      fields: "files(id,name,createdTime)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: data.files || [] }),
    };
  } catch (e) {
    console.error("Gallery error:", e);
    return { statusCode: 500, body: e.message };
  }
};
