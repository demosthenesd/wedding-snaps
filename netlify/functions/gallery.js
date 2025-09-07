// netlify/functions/gallery.js
const { getDrive, DRIVE_FOLDER_ID } = require("./_drive");

exports.handler = async () => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    return { statusCode: 401, body: "Not authenticated. Visit /auth first." };
  }
  try {
    const drive = getDrive();
    const { data } = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
      orderBy: "createdTime desc",
      pageSize: 30,
      fields: "files(id,name,mimeType,createdTime)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: "allDrives",
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: data.files || [] }),
    };
  } catch (e) {
    console.error("Gallery error:", e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message || String(e) }) };
  }
};
