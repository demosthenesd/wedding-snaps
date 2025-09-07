// index.js
require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { google } = require("googleapis");
const { Readable } = require("stream");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 3000;
const DRIVE_FOLDER_ID = (process.env.DRIVE_FOLDER_ID || "").trim();
const AUTH_TYPE = (process.env.GOOGLE_AUTH_TYPE || "oauth").toLowerCase();
const REDIRECT = process.env.OAUTH_REDIRECT || "http://localhost:3000/oauth2callback";

if (!DRIVE_FOLDER_ID) {
  console.error("❌ Missing DRIVE_FOLDER_ID in .env");
  process.exit(1);
}

let drive;           // initialized by initAuth()
let DRIVE_ID = null; // populated by ensureFolder()
const tokenPath = path.join(__dirname, "tokens.json");

function tokensExist() {
  return fs.existsSync(tokenPath);
}

// -------------------- Auth init (OAuth, recommended) --------------------
async function initAuth() {
  if (AUTH_TYPE !== "oauth") {
    console.error("❌ This file is set up for OAuth. Set GOOGLE_AUTH_TYPE=oauth in .env.");
    process.exit(1);
  }

  const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env");
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);

  if (tokensExist()) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(tokenPath, "utf8")));
    console.log("🔐 Using existing OAuth tokens.");
  } else {
    console.log(`🔓 No tokens yet. Visit http://localhost:${PORT}/auth to connect your Google account.`);
  }

  // Persist refreshed tokens automatically
  oAuth2Client.on("tokens", (t) => {
    const current = tokensExist() ? JSON.parse(fs.readFileSync(tokenPath, "utf8")) : {};
    const merged = { ...current, ...t };
    fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
    console.log("🔁 OAuth tokens refreshed & saved.");
  });

  drive = google.drive({ version: "v3", auth: oAuth2Client });

  // OAuth routes
  app.get("/auth", (req, res) => {
    // Use narrower scope to avoid verification: your app can access files it creates
    const scopes = ["https://www.googleapis.com/auth/drive.file"];
    const url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
    });
    res.redirect(url);
  });

  app.get("/oauth2callback", async (req, res) => {
    try {
      const { code } = req.query;
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
      console.log("✅ OAuth tokens saved to tokens.json");

      // Now that we have tokens, verify folder and then go home
      await ensureFolder();
      res.send("✅ Google Drive connected. You can close this tab and go back to the app.");
    } catch (e) {
      console.error("OAuth callback error:", e.message || e);
      res.status(500).send("OAuth error");
    }
  });
}

// -------------------- Verify folder --------------------
async function ensureFolder() {
  const { data } = await drive.files.get({
    fileId: DRIVE_FOLDER_ID,
    fields: "id,name,mimeType,driveId",
    supportsAllDrives: true,
  });
  if (data.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error(`The ID is not a folder (mimeType=${data.mimeType}).`);
  }
  DRIVE_ID = data.driveId || null;
  console.log(`✅ Folder ok: "${data.name}" (${data.id})` + (DRIVE_ID ? ` on Shared Drive ${DRIVE_ID}` : " on My Drive"));
}

// -------------------- Static client --------------------
app.use(express.static(path.join(__dirname, "public")));

// -------------------- Upload to Drive --------------------
app.post("/upload-drive", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "No file" });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = req.file.originalname || `photo-${ts}.jpg`;

    const fileMetadata = { name: filename, parents: [DRIVE_FOLDER_ID] };
    const media = {
      mimeType: req.file.mimetype || "image/jpeg",
      body: Readable.from(req.file.buffer),
    };

    const { data } = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id,name,mimeType,createdTime",
      supportsAllDrives: true,
    });

    res.json({ ok: true, id: data.id, name: data.name });
  } catch (e) {
    console.error("Upload error:", e.response?.data || e.message || e);
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// -------------------- Gallery (list latest images) --------------------
app.get("/gallery", async (req, res) => {
  try {
    const listParams = {
      q: `'${DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
      orderBy: "createdTime desc",
      pageSize: 30,
      fields: "files(id,name,mimeType,createdTime)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    };
    if (DRIVE_ID) {
      listParams.corpora = "drive";
      listParams.driveId = DRIVE_ID;
    }
    const { data } = await drive.files.list(listParams);
    res.json({ files: data.files || [] });
  } catch (e) {
    console.error("Gallery error:", e.response?.data || e.message || e);
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// -------------------- Image proxy (keeps files private) --------------------
app.get("/image/:id", async (req, res) => {
  try {
    const fileId = req.params.id;
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType,name",
      supportsAllDrives: true,
    });
    res.setHeader("Content-Type", meta.data.mimeType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=60");

    const dl = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "stream" }
    );
    dl.data.on("error", (err) => {
      console.error("Stream error:", err);
      res.status(500).end();
    }).pipe(res);
  } catch (e) {
    console.error("Image proxy error:", e.response?.data || e.message || e);
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// -------------------- Start server --------------------
(async () => {
  await initAuth();

  // Only check folder at startup if we already have tokens
  if (tokensExist()) {
    await ensureFolder();
  }

  app.listen(PORT, () => {
    console.log(`🚀 http://localhost:${PORT}`);
  });
})();
