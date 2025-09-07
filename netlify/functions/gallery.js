// netlify/functions/gallery.js
const { drive } = require("./_drive");

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

exports.handler = async () => {
  try {
    const { data } = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed=false`,
      orderBy: "createdTime desc",
      pageSize: 30,
      fields: "files(id,name,createdTime)",
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ files: data.files || [] }),
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
