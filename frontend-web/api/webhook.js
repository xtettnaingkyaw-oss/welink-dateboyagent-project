import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

function escapeHTML(str) {
  if (!str) return "";
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getBaseUrl(req) {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const proto = req?.headers?.["x-forwarded-proto"] || "https";
  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host || "";
  if (!host) return "";
  return `${proto}://${host}`;
}

/**
 * Extracts a permanent Telegram file_id from either a raw file_id string
 * or a proxy URL like https://.../api/webhook?file_id=AgACAgU...
 */
function extractTelegramFileId(item) {
  if (!item || typeof item !== "string") return null;
  const trimmed = item.trim();
  if (!trimmed) return null;

  if (trimmed.includes("file_id=")) {
    try {
      const qIndex = trimmed.indexOf("?");
      if (qIndex !== -1) {
        const params = new URLSearchParams(trimmed.slice(qIndex + 1));
        const fid = params.get("file_id");
        if (fid) return fid;
      }
    } catch (e) {
      console.error("Failed to parse file_id param:", e);
    }
  }

  // Raw Telegram file_id (does not start with http, /, or data:)
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("/") &&
    !trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  return null;
}

/**
 * Extracts the temporary file_path from a legacy api.telegram.org/file/bot<TOKEN>/<file_path> URL.
 */
function extractLegacyTelegramFilePath(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/api\.telegram\.org\/file\/bot[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Checks whether a Date Boy record has any legacy expired-prone api.telegram.org URLs without file_ids.
 */
function hasLegacyRawTelegramUrls(boy) {
  if (!boy) return false;
  const pubIds = Array.isArray(boy.publicFileIds) ? boy.publicFileIds.filter(Boolean) : [];
  const privIds = Array.isArray(boy.privateFileIds) ? boy.privateFileIds.filter(Boolean) : [];
  const pubPhotos = Array.isArray(boy.publicPhotos) ? boy.publicPhotos : [];
  const privPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : [];

  const hasRawPub =
    pubIds.length === 0 && pubPhotos.some((u) => typeof u === "string" && u.includes("api.telegram.org/file/bot"));
  const hasRawPriv =
    privIds.length === 0 && privPhotos.some((u) => typeof u === "string" && u.includes("api.telegram.org/file/bot"));
  const hasRawVid =
    !boy.privateVideoFileId &&
    typeof boy.privateVideo === "string" &&
    boy.privateVideo.includes("api.telegram.org/file/bot");

  return hasRawPub || hasRawPriv || hasRawVid;
}

/**
 * Generates safe, non-expiring HTML anchor links for Telegram messages.
 * Uses /api/webhook?boy_id=... or /api/webhook?file_id=... so links NEVER expire
 * and NEVER expose TELEGRAM_BOT_TOKEN.
 */
function processMediaLinks(mediaArray, typeLabel, options = {}) {
  const { baseUrl = "", boyId = "", mediaType = "public", fileIds = [] } = options;
  const list = Array.isArray(mediaArray) ? mediaArray : [];
  const ids = Array.isArray(fileIds) ? fileIds : [];
  const count = Math.max(list.length, ids.length);
  if (count === 0) return "";

  const validLinks = [];
  let unroutableBase64Count = 0;

  for (let i = 0; i < count; i++) {
    const rawItem = list[i] || "";
    const fileId = ids[i] || extractTelegramFileId(rawItem);

    if (baseUrl && boyId) {
      const safeUrl = `${baseUrl}/api/webhook?boy_id=${encodeURIComponent(boyId)}&type=${encodeURIComponent(mediaType)}&index=${i}`.replace(
        /&/g,
        "&amp;"
      );
      validLinks.push(`<a href="${safeUrl}">${typeLabel} ${i + 1}</a>`);
    } else if (baseUrl && fileId) {
      const safeUrl = `${baseUrl}/api/webhook?file_id=${encodeURIComponent(fileId)}`.replace(
        /&/g,
        "&amp;"
      );
      validLinks.push(`<a href="${safeUrl}">${typeLabel} ${i + 1}</a>`);
    } else if (typeof rawItem === "string" && rawItem.startsWith("http")) {
      const legacyPath = extractLegacyTelegramFilePath(rawItem);
      if (baseUrl && legacyPath) {
        const safeUrl = `${baseUrl}/api/webhook?legacy_path=${encodeURIComponent(legacyPath)}`.replace(
          /&/g,
          "&amp;"
        );
        validLinks.push(`<a href="${safeUrl}">${typeLabel} ${i + 1}</a>`);
      } else {
        const safeUrl = rawItem.replace(/&/g, "&amp;");
        validLinks.push(`<a href="${safeUrl}">${typeLabel} ${i + 1}</a>`);
      }
    } else if (typeof rawItem === "string" && rawItem.startsWith("data:")) {
      unroutableBase64Count++;
    }
  }

  let resultText = validLinks.length > 0 ? validLinks.join(" | ") : "";
  if (unroutableBase64Count > 0) {
    resultText += resultText ? " | " : "";
    resultText += `<i>(Web မှတင်ထားသော ပုံ ${unroutableBase64Count} ပုံ ပါဝင်သည်)</i>`;
  }
  return resultText;
}

function buildVideoLinkHtml(boy, boyId, baseUrl) {
  if (!boy || (!boy.privateVideo && !boy.privateVideoFileId)) return "မရှိပါ";
  const fileId = boy.privateVideoFileId || extractTelegramFileId(boy.privateVideo);

  if (baseUrl && boyId) {
    const safeVid = `${baseUrl}/api/webhook?boy_id=${encodeURIComponent(boyId)}&type=video&index=0`.replace(
      /&/g,
      "&amp;"
    );
    return `<a href="${safeVid}">Video ကြည့်ရန်</a>`;
  }
  if (baseUrl && fileId) {
    const safeVid = `${baseUrl}/api/webhook?file_id=${encodeURIComponent(fileId)}&type=video`.replace(
      /&/g,
      "&amp;"
    );
    return `<a href="${safeVid}">Video ကြည့်ရန်</a>`;
  }
  if (typeof boy.privateVideo === "string" && boy.privateVideo.startsWith("http")) {
    const legacyPath = extractLegacyTelegramFilePath(boy.privateVideo);
    if (baseUrl && legacyPath) {
      const safeVid = `${baseUrl}/api/webhook?legacy_path=${encodeURIComponent(legacyPath)}&type=video`.replace(
        /&/g,
        "&amp;"
      );
      return `<a href="${safeVid}">Video ကြည့်ရန်</a>`;
    }
    const safeVid = boy.privateVideo.replace(/&/g, "&amp;");
    return `<a href="${safeVid}">Video ကြည့်ရန်</a>`;
  }
  return `<i>Web မှတင်ထားသော Video ဖြစ်သဖြင့် တိုက်ရိုက်ပြ၍ မရပါ</i>`;
}

/**
 * Sends Public Photos, Private Photos, and/or Video natively into the Telegram Chat
 * using permanent Telegram file_ids so users and Admins can view them right inside Telegram.
 */
async function sendCompanionMediaToChat(
  chatId,
  boy,
  boyId,
  { includePublic = true, includePrivate = false, includeVideo = false } = {}
) {
  if (!boy) return { sentCount: 0 };
  const boyCode = `WLDB-${String(boyId || "").substring(0, 5).toUpperCase()}`;
  let sentCount = 0;

  // 1. Public Photos
  if (includePublic) {
    const pubPhotos = Array.isArray(boy.publicPhotos)
      ? boy.publicPhotos
      : boy.publicPhoto
        ? [boy.publicPhoto]
        : [];
    const pubIds = Array.isArray(boy.publicFileIds) ? boy.publicFileIds : [];
    const resolvedPubIds = [];
    const maxPub = Math.max(pubPhotos.length, pubIds.length);
    for (let i = 0; i < maxPub; i++) {
      const fid = pubIds[i] || extractTelegramFileId(pubPhotos[i]);
      if (fid) resolvedPubIds.push(fid);
    }

    if (resolvedPubIds.length > 1) {
      try {
        const media = resolvedPubIds.slice(0, 10).map((fid, idx) => ({
          type: "photo",
          media: fid,
          ...(idx === 0
            ? { caption: `📸 <b>${boyCode}</b> — Public အလှဓာတ်ပုံများ`, parse_mode: "HTML" }
            : {}),
        }));
        const res = await fetch(`${TELEGRAM_API}/sendMediaGroup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, media, protect_content: true }),
        });
        const data = await res.json();
        if (data.ok) sentCount += resolvedPubIds.length;
      } catch (e) {
        console.error("sendMediaGroup public error:", e);
      }
    } else if (resolvedPubIds.length === 1) {
      try {
        const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: resolvedPubIds[0],
            caption: `📸 <b>${boyCode}</b> — Public ဓာတ်ပုံ`,
            parse_mode: "HTML",
            protect_content: true,
          }),
        });
        const data = await res.json();
        if (data.ok) sentCount += 1;
      } catch (e) {
        console.error("sendPhoto public error:", e);
      }
    }
  }

  // 2. Private Photos
  if (includePrivate) {
    const privPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : [];
    const privIds = Array.isArray(boy.privateFileIds) ? boy.privateFileIds : [];
    const resolvedPrivIds = [];
    const maxPriv = Math.max(privPhotos.length, privIds.length);
    for (let i = 0; i < maxPriv; i++) {
      const fid = privIds[i] || extractTelegramFileId(privPhotos[i]);
      if (fid) resolvedPrivIds.push(fid);
    }

    if (resolvedPrivIds.length > 1) {
      try {
        const media = resolvedPrivIds.slice(0, 10).map((fid, idx) => ({
          type: "photo",
          media: fid,
          ...(idx === 0
            ? { caption: `🔒 <b>${boyCode}</b> — Private ဓာတ်ပုံများ`, parse_mode: "HTML" }
            : {}),
        }));
        const res = await fetch(`${TELEGRAM_API}/sendMediaGroup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, media, protect_content: true }),
        });
        const data = await res.json();
        if (data.ok) sentCount += resolvedPrivIds.length;
      } catch (e) {
        console.error("sendMediaGroup private error:", e);
      }
    } else if (resolvedPrivIds.length === 1) {
      try {
        const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: resolvedPrivIds[0],
            caption: `🔒 <b>${boyCode}</b> — Private ဓာတ်ပုံ`,
            parse_mode: "HTML",
            protect_content: true,
          }),
        });
        const data = await res.json();
        if (data.ok) sentCount += 1;
      } catch (e) {
        console.error("sendPhoto private error:", e);
      }
    }
  }

  // 3. Private Video
  if (includeVideo) {
    const videoFileId = boy.privateVideoFileId || extractTelegramFileId(boy.privateVideo);
    if (videoFileId) {
      try {
        const res = await fetch(`${TELEGRAM_API}/sendVideo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            video: videoFileId,
            caption: `🎬 <b>${boyCode}</b> — Private Verification Video`,
            parse_mode: "HTML",
            protect_content: true,
          }),
        });
        const data = await res.json();
        if (data.ok) sentCount += 1;
      } catch (e) {
        console.error("sendVideo error:", e);
      }
    }
  }

  return { sentCount };
}

async function getAdminChatId() {
  const adminDoc = await getDoc(doc(db, "settings", "admin_config"));
  return adminDoc.exists() ? adminDoc.data().chatId : null;
}

async function getAppConfig() {
  const cDoc = await getDoc(doc(db, "settings", "app_config"));
  return cDoc.exists()
    ? cDoc.data()
    : {
        paymentInfo: "Admin ကိုဆက်သွယ်ပါ",
        privFee: 5000,
        feeSec: 30000,
        feeDay: 70000,
        feeNight: 100000,
        clientIdFee: 10000,
        reqText: "၁။ အသက် ၂၁ နှစ်ပြည့်ပြီးသူ ဖြစ်ရပါမည်။",
        ruleText: "၁။ အမှန်တကယ် လုပ်ကိုင်လိုသူ ဖြစ်ရပါမည်။",
      };
}

const MAIN_MENU_KEYBOARD = {
  keyboard: [
    [{ text: "🔄 အစသို့ ပြန်သွားမည်" }, { text: "🔍 Date Boy ထပ်ရှာမည်" }],
    [{ text: "💼 Date Boy လျှောက်မည်" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      protect_content: true,
      disable_web_page_preview: true,
    };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("SendMessage Error:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Verifies that a file exists on Telegram and is within the 20MB Bot API limit,
 * returning a permanent proxy URL backed by file_id so it NEVER expires after 1 hour.
 */
async function getPermanentMediaUrl(fileId, baseUrl, isVideo = false) {
  try {
    const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      const typeSuffix = isVideo ? "&type=video" : "";
      if (baseUrl) {
        return `${baseUrl}/api/webhook?file_id=${encodeURIComponent(fileId)}${typeSuffix}`;
      }
      return `/api/webhook?file_id=${encodeURIComponent(fileId)}${typeSuffix}`;
    }
  } catch (e) {
    console.error("Error verifying Telegram file_id:", e);
  }
  return null;
}

/**
 * Downloads a compact medium-resolution Telegram photo and returns a permanent
 * data:image/jpeg;base64,... string if under 80KB so Web Admin renders it in 0ms
 * directly from Firestore without any external request.
 */
async function fetchTelegramPhotoDataUrl(fileId) {
  if (!BOT_TOKEN || !fileId) return null;
  try {
    const metaRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const metaData = await metaRes.json();
    const filePath = metaData?.result?.file_path;
    if (!metaData?.ok || !filePath) return null;
    if (metaData.result.file_size && metaData.result.file_size > 85 * 1024) {
      return null;
    }
    const imgRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    if (!imgRes.ok) return null;
    const arrBuf = await imgRes.arrayBuffer();
    if (arrBuf.byteLength > 85 * 1024) return null;
    const base64 = Buffer.from(arrBuf).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch (e) {
    console.error("fetchTelegramPhotoDataUrl fallback to proxy:", e);
    return null;
  }
}

/**
 * Streams a Telegram file_path or fresh file_id lookup to the HTTP response.
 */
async function streamTelegramFilePathToResponse(res, filePath, explicitType = "") {
  if (!BOT_TOKEN || !filePath) {
    return false;
  }
  const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const upstream = await fetch(downloadUrl);
  if (!upstream.ok) {
    return false;
  }

  const lowerPath = filePath.toLowerCase();
  let contentType = upstream.headers.get("content-type") || "application/octet-stream";
  if (
    explicitType === "video" ||
    lowerPath.endsWith(".mp4") ||
    lowerPath.endsWith(".mov") ||
    lowerPath.endsWith(".webm")
  ) {
    contentType = "video/mp4";
  } else if (
    lowerPath.endsWith(".jpg") ||
    lowerPath.endsWith(".jpeg") ||
    contentType === "application/octet-stream"
  ) {
    contentType = "image/jpeg";
  } else if (lowerPath.endsWith(".png")) {
    contentType = "image/png";
  } else if (lowerPath.endsWith(".webp")) {
    contentType = "image/webp";
  }

  const arrayBuffer = await upstream.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "public, max-age=3000");
  res.statusCode = 200;
  return res.end(buffer);
}

/**
 * Renders a helpful, mobile-friendly Burmese explanation page when a legacy 1-hour
 * api.telegram.org link from an older registration has expired.
 */
function sendExpiredLegacyMediaHtml(res, boyCode = "") {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!doctype html>
<html lang="my">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WE LINK — Media Link Update Required</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0b1120 0%, #0f172a 55%, #062e22 100%);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Padauk", sans-serif;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      max-width: 460px;
      width: 100%;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(251, 191, 36, 0.35);
      border-radius: 20px;
      padding: 28px 24px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
    }
    .bar {
      height: 5px;
      border-radius: 999px;
      background: linear-gradient(90deg, #ef4444, #f97316, #facc15, #22c55e, #3b82f6, #8b5cf6);
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
      font-size: 12px;
      font-weight: 700;
      padding: 5px 10px;
      border-radius: 8px;
      margin-bottom: 12px;
      letter-spacing: 0.08em;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 12px;
      line-height: 1.5;
      color: #ffffff;
    }
    p {
      font-size: 14px;
      line-height: 1.75;
      color: #cbd5e1;
      margin: 0 0 14px;
    }
    .steps {
      background: rgba(2, 6, 23, 0.65);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 13px;
      line-height: 1.75;
      color: #e2e8f0;
      margin-bottom: 18px;
    }
    .btn {
      display: block;
      text-align: center;
      background: linear-gradient(135deg, #facc15 0%, #84cc16 50%, #10b981 100%);
      color: #020617;
      font-weight: 700;
      text-decoration: none;
      padding: 13px 18px;
      border-radius: 12px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="bar"></div>
    <span class="badge">WE LINK · MEDIA PROTECTION</span>
    <h1>ပုံ/Video Link အဟောင်း သက်တမ်းကုန်ဆုံးနေပါသည် ${boyCode ? `(${escapeHTML(boyCode)})` : ""}</h1>
    <p>
      ယခင်စနစ်အဟောင်းဖြင့် တင်ထားခဲ့သော Telegram <code>getFile</code> တိုက်ရိုက် Link များသည် Telegram ၏ သတ်မှတ်ချက်အရ <b>(၁) နာရီကြာပြီးနောက်</b> အလိုအလျောက် သက်တမ်းကုန်ဆုံးသွားပါသည်။
    </p>
    <div class="steps">
      <b>ပြန်လည်ကြည့်ရှုနိုင်ရန် ဖြေရှင်းနည်း (၂) မျိုး —</b><br/>
      ၁။ Telegram Bot ထဲတွင် <code>${boyCode || "WLDB-XXXXX"}</code> ရိုက်ပြီး <b>"🔄 Admin မှ ပုံ/Video အသစ်လဲမည်"</b> သို့မဟုတ် <b>"📩 Date Boy ထံ ပုံအသစ်ပြန်တောင်းမည်"</b> ခလုတ်ကို နှိပ်ပါ။<br/>
      ၂။ သို့မဟုတ် Web <b>Admin Console (/admin)</b> တွင် <b>Edit</b> နှိပ်၍ ပုံအသစ် တိုက်ရိုက်တင်ပေးနိုင်ပါသည်။ (ယခု စနစ်အသစ်ဖြင့် တင်သောပုံများသည် သက်တမ်းလုံးဝ မကုန်တော့ပါ။)
    </div>
    <a class="btn" href="/admin">Admin Console သို့ သွားရောက်ပြင်ဆင်မည်</a>
  </div>
</body>
</html>`);
}

/**
 * Handles GET /api/webhook requests to proxy Telegram photos & videos on-demand
 * using permanent file_ids or Firestore document references.
 */
async function handleMediaProxyGet(req, res) {
  const { file_id, boy_id, type = "public", index = "0", legacy_path, code = "" } = req.query || {};

  try {
    let targetFileId = file_id ? String(file_id).trim() : null;
    let targetLegacyPath = legacy_path ? String(legacy_path).trim() : null;
    const idx = parseInt(String(index), 10) || 0;

    if (boy_id) {
      const snap = await getDoc(doc(db, "dateboys", String(boy_id)));
      if (!snap.exists()) {
        return sendExpiredLegacyMediaHtml(res, code);
      }
      const boy = snap.data();
      const boyCode = `WLDB-${String(boy_id).substring(0, 5).toUpperCase()}`;

      let rawMediaItem = null;
      if (type === "public") {
        const pubIds = Array.isArray(boy.publicFileIds) ? boy.publicFileIds : [];
        const pubPhotos = Array.isArray(boy.publicPhotos)
          ? boy.publicPhotos
          : boy.publicPhoto
            ? [boy.publicPhoto]
            : [];
        targetFileId = pubIds[idx] || extractTelegramFileId(pubPhotos[idx]);
        rawMediaItem = pubPhotos[idx];
      } else if (type === "private") {
        const privIds = Array.isArray(boy.privateFileIds) ? boy.privateFileIds : [];
        const privPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : [];
        targetFileId = privIds[idx] || extractTelegramFileId(privPhotos[idx]);
        rawMediaItem = privPhotos[idx];
      } else if (type === "video") {
        targetFileId = boy.privateVideoFileId || extractTelegramFileId(boy.privateVideo);
        rawMediaItem = boy.privateVideo;
      }

      // If stored item is a Base64 Data URL (from Web /register or Admin upload), serve it directly!
      if (!targetFileId && typeof rawMediaItem === "string" && rawMediaItem.startsWith("data:")) {
        const match = rawMediaItem.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const buffer = Buffer.from(match[2], "base64");
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Content-Disposition", "inline");
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.statusCode = 200;
          return res.end(buffer);
        }
      }

      if (!targetFileId && typeof rawMediaItem === "string") {
        targetLegacyPath = extractLegacyTelegramFilePath(rawMediaItem);
        // If it's a normal external HTTPS URL (not api.telegram.org), redirect to it
        if (!targetLegacyPath && rawMediaItem.startsWith("http")) {
          res.setHeader("Location", rawMediaItem);
          return res.status(302).end();
        }
      }

      if (!targetFileId && !targetLegacyPath) {
        return sendExpiredLegacyMediaHtml(res, boyCode);
      }
    }

    // 1. Resolve permanent Telegram file_id via fresh getFile call
    if (targetFileId && BOT_TOKEN) {
      const metaRes = await fetch(
        `${TELEGRAM_API}/getFile?file_id=${encodeURIComponent(targetFileId)}`
      );
      const metaData = await metaRes.json();
      if (metaData.ok && metaData.result?.file_path) {
        const streamed = await streamTelegramFilePathToResponse(
          res,
          metaData.result.file_path,
          String(type)
        );
        if (streamed !== false) return streamed;
      }
    }

    // 2. Fallback: attempt legacy file_path if still within 1-hour Telegram window
    if (targetLegacyPath && BOT_TOKEN) {
      const streamed = await streamTelegramFilePathToResponse(
        res,
        targetLegacyPath,
        String(type)
      );
      if (streamed !== false) return streamed;
    }

    return sendExpiredLegacyMediaHtml(res, String(code || ""));
  } catch (err) {
    console.error("Media Proxy Error:", err);
    return sendExpiredLegacyMediaHtml(res, String(code || ""));
  }
}

async function handleUserRejection(clientChatId, reasonMsg, telegramProfileLink) {
  const stateRef = doc(db, "telegram_states", String(clientChatId));
  const stateSnap = await getDoc(stateRef);
  let currentRejects = 0;

  if (stateSnap.exists() && stateSnap.data().rejectCount) {
    currentRejects = stateSnap.data().rejectCount;
  }
  currentRejects += 1;
  const isBanned = currentRejects >= 3;

  await setDoc(
    stateRef,
    {
      step: "IDLE",
      data: {},
      rejectCount: currentRejects,
      banned: isBanned,
      telegramProfileLink: telegramProfileLink,
    },
    { merge: true }
  );

  let finalMessage = `${reasonMsg}\n\n`;
  if (isBanned) {
    finalMessage += `🚨 <b>အသိပေးချက်:</b> သင့်အား စနစ်မှ (၃) ကြိမ်တိတိ ပယ်ချထားပြီးဖြစ်သောကြောင့် Date Boy အဖြစ် ထပ်မံလျှောက်ထားခွင့် မရှိတော့ပါ။`;
  } else {
    finalMessage += `⚠️ <b>မှတ်ချက် -</b> အကြိမ် (၃) ကြိမ်တိတိ ပယ်ချခံရပါက နောက်ထပ် လျှောက်ထားခွင့် ပြုမည်မဟုတ်ပါ။ (ယခု ${currentRejects} ကြိမ် ရှိပါပြီ)`;
  }

  await sendMessage(clientChatId, finalMessage, MAIN_MENU_KEYBOARD);
}

async function sendDateBoyCard(chatId, boy, boyId, baseUrl = "") {
  const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
  const pPhotos = Array.isArray(boy.publicPhotos)
    ? boy.publicPhotos
    : boy.publicPhoto
      ? [boy.publicPhoto]
      : [];
  const pFileIds = Array.isArray(boy.publicFileIds) ? boy.publicFileIds : [];

  // Send native public photo album directly to chat when Telegram file_ids exist
  await sendCompanionMediaToChat(chatId, boy, boyId, {
    includePublic: true,
    includePrivate: false,
    includeVideo: false,
  });

  const publicLinksText = processMediaLinks(pPhotos, "Public ပုံ", {
    baseUrl,
    boyId,
    mediaType: "public",
    fileIds: pFileIds,
  });
  const publicDisplay = publicLinksText ? `\n\n📸 <b>Public ပုံများ:</b> ${publicLinksText}` : "";

  const caption = `👤 <b>Code:</b> ${boyCode}\n🎂 <b>အသက်:</b> ${escapeHTML(boy.age)} နှစ်\n📏 <b>အရပ်:</b> ${escapeHTML(boy.height)}\n🍆 <b>Size:</b> ${escapeHTML(boy.cockSize || "N/A")}\n📍 <b>နေရာ:</b> ${escapeHTML(boy.township)}, ${escapeHTML(boy.city)}${publicDisplay}`;
  const keyboard = {
    inline_keyboard: [
      [{ text: "🔒 Private ပုံ ကြည့်ရန်", callback_data: `REQ_P_${boyId}` }],
      [{ text: "❤️ ခေါ်ယူမည် (Hire)", callback_data: `REQ_H_${boyId}` }],
    ],
  };
  await sendMessage(chatId, caption, keyboard);
}

async function startBotFlow(chatId, stateRef) {
  await setDoc(stateRef, { step: "CHOOSING_ROLE", data: {} }, { merge: true });
  await sendMessage(
    chatId,
    "✨ <b>WE LINK Dating Agency</b> မှ ကြိုဆိုပါတယ်ခင်ဗျာ! \n\nကျေးဇူးပြု၍ လိုချင်သော ဝန်ဆောင်မှုကို ရွေးချယ်ပေးပါ -",
    {
      inline_keyboard: [
        [{ text: "🔍 Date Boy ရှာမည်", callback_data: "ROLE_CLIENT" }],
        [{ text: "💼 Date Boy လျှောက်မည်", callback_data: "ROLE_APPLICANT" }],
      ],
    }
  );
}

export default async function handler(req, res) {
  let globalChatId = null;

  try {
    // 1. Handle GET requests for permanent on-demand Telegram photo/video streaming
    if (req.method === "GET") {
      if (req.query && (req.query.file_id || req.query.boy_id || req.query.legacy_path)) {
        return await handleMediaProxyGet(req, res);
      }
      return res.status(200).json({ status: "Bot Server & Media Proxy running!" });
    }

    if (req.method !== "POST") {
      return res.status(200).json({ status: "Bot Server is running!" });
    }

    const baseUrl = getBaseUrl(req);
    const reqBody =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    if (reqBody.internal_action === "notify_user") {
      await sendMessage(
        reqBody.chatId,
        reqBody.text,
        reqBody.useMenu ? MAIN_MENU_KEYBOARD : null
      );
      return res.status(200).json({ status: "notified" });
    }

    if (reqBody.internal_action === "reject_user") {
      await handleUserRejection(
        reqBody.chatId,
        reqBody.text,
        `tg://user?id=${reqBody.chatId}`
      );
      return res.status(200).json({ status: "rejected" });
    }

    // Web App Admin Approve Action -> Notifies BOTH Date Boy AND Admin Telegram Bot
    if (reqBody.internal_action === "web_admin_approve_boy") {
      const targetBoyId = String(reqBody.boyId || "");
      const boyCode = `WLDB-${targetBoyId.substring(0, 5).toUpperCase()}`;
      const boySnap = targetBoyId ? await getDoc(doc(db, "dateboys", targetBoyId)) : null;
      const boyData = boySnap?.exists() ? boySnap.data() : {};

      const boyName = reqBody.boyName || boyData.name || "Date Boy";
      const boyAge = reqBody.boyAge || boyData.age || "-";
      const boyHeight = reqBody.boyHeight || boyData.height || "-";
      const boyCockSize = reqBody.boyCockSize || boyData.cockSize || "N/A";
      const boyPhone = reqBody.boyPhone || boyData.phone || "-";
      const boyCity = reqBody.boyCity || boyData.city || "-";
      const boyTownship = reqBody.boyTownship || boyData.township || "-";
      const adminUsername = reqBody.adminUsername || "Web Admin";

      const targetChatId =
        reqBody.chatId ||
        boyData.telegramChatId ||
        (typeof boyData.telegramProfileLink === "string"
          ? boyData.telegramProfileLink.match(/id=(\d+)/)?.[1]
          : null);

      const tgProfileLink =
        reqBody.telegramProfileLink ||
        boyData.telegramProfileLink ||
        (targetChatId ? `tg://user?id=${targetChatId}` : "");

      let userNotified = false;
      if (targetChatId) {
        const approveMsg =
          reqBody.text ||
          `🎉 ကျေးဇူးတင်ပါတယ်။ သတ်မှတ်အရည်အချင်းများနှင့် ပြည့်စုံကိုက်ညီသောကြောင့် သင့်အား WE LINK ၏ Date Boy စာရင်းထဲသို့ ပေါင်းထည့်ပေးလိုက်ပါပြီ။\n\n📌 သင့်၏ Date Boy ID မှာ: <code>${boyCode}</code> ဖြစ်ပါသည်။ Privacy အရ သင်၏ အမည်အရင်းကို ဧည့်သည်အားပြသမည်မဟုတ်သောကြောင့် ယခု ID အား သေချာစွာမှတ်သားထားပေးပါ။\n\nမန္တလေးမြို့တွင်းဆိုရင် ချက်ချင်း(သို့မဟုတ်) (၁)ရက် (၂) ရက်အတွင်းရရှိနိုင်ပြီး အခြားမြို့များကဆိုရင် အနည်းဆုံး (၁)ပတ်ကနေ ဧည့်သည်အခြေအနေပေါ်မူတည်ပြီး စောင့်ရနိုင်ပါသည်။\n\nအထူးသတိပြုရန်မှာ Date Boy စာရင်းသို့ပေါင်းထည့်လိုက်ပြီး ခေါ်ယူလိုသည့်ဧည့်သည်များကို ပြသသည့်စာရင်းထဲတွင် ပါဝင်ပြီးဖြစ်သော်လည်း အလုပ်ရရှိရန်အတွက် မိမိအား ခေါ်ယူမည့် ဧည့်သည်ကြိုက်ရန်လည်း လိုအပ်ပါသေးသည်။\n\nလုပ်ငန်းလိုအပ်ချက်အရ အပြင်လူတွေ့ အင်တာဗျူးရန် လိုအပ်ပါက နေရာနှင့် အချိန်အသေးစိတ်ကို Admin မှ ပြန်လည်ဆက်သွယ်ပေးသွားပါမည်။`;
        const uRes = await sendMessage(targetChatId, approveMsg, MAIN_MENU_KEYBOARD);
        userNotified = Boolean(uRes?.ok);
      }

      const adminChatId = await getAdminChatId();
      let adminNotified = false;
      if (adminChatId) {
        const tgLinkLine = tgProfileLink
          ? `🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${tgProfileLink}">💬 ${escapeHTML(boyName)} နှင့် တိုက်ရိုက်စကားပြောရန် (ဒီကိုနှိပ်ပါ)</a>\n\n`
          : "";
        const userStatusLine = userNotified
          ? `✅ Date Boy (${escapeHTML(boyName)}) ၏ Telegram သို့ အတည်ပြုကြောင်းနှင့် ID <code>${boyCode}</code> ပေးပို့ပြီးပါပြီ။`
          : `ℹ️ Web Admin မှ အတည်ပြုပြီးပါပြီ (Website မှ လျှောက်ထားသူ သို့မဟုတ် Telegram Chat ID မရှိပါ)။`;

        const adminMsg =
          `✅ <b>Date Boy အတည်ပြုပြီးပါပြီ (Web Admin Approved)</b>\n\n` +
          `🆔 <b>Code:</b> ${boyCode}\n` +
          `👤 <b>အမည်:</b> ${escapeHTML(boyName)}\n` +
          `🎂 <b>အသက်:</b> ${escapeHTML(boyAge)} နှစ် | 📏 <b>အရပ်:</b> ${escapeHTML(boyHeight)} | 🍆 <b>Size:</b> ${escapeHTML(boyCockSize)}\n` +
          `📞 <b>ဖုန်း:</b> ${escapeHTML(boyPhone)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(boyTownship)}, ${escapeHTML(boyCity)}\n` +
          `🛡️ <b>စစ်ဆေးသူ:</b> ${escapeHTML(adminUsername)}\n` +
          tgLinkLine +
          userStatusLine;

        const inlineRows = [];
        if (tgProfileLink) {
          inlineRows.push([
            {
              text: `💬 ${boyName} နှင့် တိုက်ရိုက်စကားပြောရန်`,
              url: tgProfileLink,
            },
          ]);
        }

        let admRes = await sendMessage(
          adminChatId,
          adminMsg,
          inlineRows.length > 0 ? { inline_keyboard: inlineRows } : null
        );
        if (!admRes?.ok && inlineRows.length > 0) {
          admRes = await sendMessage(adminChatId, adminMsg);
        }
        adminNotified = Boolean(admRes?.ok);
      }

      return res.status(200).json({
        status: "approved",
        boyCode,
        userNotified,
        adminNotified,
      });
    }

    // Web App Admin Reject / Delete Action -> Notifies BOTH Date Boy AND Admin Telegram Bot
    if (reqBody.internal_action === "web_admin_reject_boy") {
      const targetBoyId = String(reqBody.boyId || "");
      const boyCode = `WLDB-${targetBoyId.substring(0, 5).toUpperCase()}`;
      const boyName = reqBody.boyName || "Date Boy";
      const boyPhone = reqBody.boyPhone || "-";
      const boyCity = reqBody.boyCity || "-";
      const boyTownship = reqBody.boyTownship || "-";
      const wasPending = Boolean(reqBody.wasPending);
      const reasonLabel = reqBody.reasonLabel || "သတ်မှတ်ချက်များနှင့် မကိုက်ညီခြင်း";
      const reasonMsg =
        reqBody.text ||
        "❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို ပယ်ချလိုက်ပါသည်။";
      const adminUsername = reqBody.adminUsername || "Web Admin";

      const targetChatId =
        reqBody.chatId ||
        (typeof reqBody.telegramProfileLink === "string"
          ? reqBody.telegramProfileLink.match(/id=(\d+)/)?.[1]
          : null);

      const tgProfileLink =
        reqBody.telegramProfileLink || (targetChatId ? `tg://user?id=${targetChatId}` : "");

      let userNotified = false;
      if (wasPending && targetChatId) {
        await handleUserRejection(targetChatId, reasonMsg, tgProfileLink);
        userNotified = true;
      }

      const adminChatId = await getAdminChatId();
      let adminNotified = false;
      if (adminChatId) {
        const tgLinkLine = tgProfileLink
          ? `🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${tgProfileLink}">💬 ${escapeHTML(boyName)} နှင့် တိုက်ရိုက်စကားပြောရန် (ဒီကိုနှိပ်ပါ)</a>\n\n`
          : "";
        const actionHeader = wasPending
          ? `❌ <b>Date Boy လျှောက်လွှာ ပယ်ချပြီးပါပြီ (Web Admin Rejected)</b>`
          : `🗑️ <b>Date Boy စာရင်းမှ ပယ်ဖျက်ပြီးပါပြီ (Web Admin Removed)</b>`;
        const userStatusLine = userNotified
          ? `✅ Date Boy (${escapeHTML(boyName)}) ၏ Telegram သို့ ပယ်ချသည့် အကြောင်းရင်း ပေးပို့ပြီးပါပြီ။`
          : `ℹ️ စနစ်ထဲမှ ပယ်ဖျက်ပြီးပါပြီ။`;

        const adminMsg =
          `${actionHeader}\n\n` +
          `🆔 <b>Code:</b> ${boyCode}\n` +
          `👤 <b>အမည်:</b> ${escapeHTML(boyName)}\n` +
          `📞 <b>ဖုန်း:</b> ${escapeHTML(boyPhone)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(boyTownship)}, ${escapeHTML(boyCity)}\n` +
          `📋 <b>အကြောင်းရင်း:</b> ${escapeHTML(reasonLabel)}\n` +
          `🛡️ <b>စစ်ဆေးသူ:</b> ${escapeHTML(adminUsername)}\n` +
          tgLinkLine +
          userStatusLine;

        const inlineRows = [];
        if (tgProfileLink) {
          inlineRows.push([
            {
              text: `💬 ${boyName} နှင့် တိုက်ရိုက်စကားပြောရန်`,
              url: tgProfileLink,
            },
          ]);
        }

        let admRes = await sendMessage(
          adminChatId,
          adminMsg,
          inlineRows.length > 0 ? { inline_keyboard: inlineRows } : null
        );
        if (!admRes?.ok && inlineRows.length > 0) {
          admRes = await sendMessage(adminChatId, adminMsg);
        }
        adminNotified = Boolean(admRes?.ok);
      }

      return res.status(200).json({
        status: "rejected",
        boyCode,
        userNotified,
        adminNotified,
      });
    }

    // Website /register New Date Boy Application -> Notify Admin Telegram Bot immediately
    if (reqBody.internal_action === "web_new_registration") {
      const targetBoyId = String(reqBody.boyId || "");
      const boyCode = `WLDB-${targetBoyId.substring(0, 5).toUpperCase()}`;
      const adminChatId = await getAdminChatId();
      if (adminChatId && targetBoyId) {
        const boySnap = await getDoc(doc(db, "dateboys", targetBoyId));
        const boyData = boySnap.exists() ? boySnap.data() : reqBody;
        const publicLinks = processMediaLinks(boyData.publicPhotos || [], "Public ပုံ", {
          baseUrl,
          boyId: targetBoyId,
          mediaType: "public",
        });
        const privateLinks = processMediaLinks(boyData.privatePhotos || [], "Private ပုံ", {
          baseUrl,
          boyId: targetBoyId,
          mediaType: "private",
        });
        const adminMsg =
          `🚨 <b>New Date Boy Registration (Website) — ${boyCode}</b> 🚨\n\n` +
          `🆔 <b>Code:</b> ${boyCode}\n` +
          `👤 <b>အမည်:</b> ${escapeHTML(boyData.name)}\n` +
          `🎂 <b>အသက်:</b> ${escapeHTML(boyData.age)} နှစ်\n` +
          `📏 <b>အရပ်:</b> ${escapeHTML(boyData.height)} | 🍆 <b>Size:</b> ${escapeHTML(boyData.cockSize || "N/A")}\n` +
          `📞 <b>ဖုန်း:</b> ${escapeHTML(boyData.phone)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(boyData.township)}, ${escapeHTML(boyData.city)}\n` +
          `🏠 <b>လိပ်စာ အသေးစိတ်:</b> ${escapeHTML(boyData.address)}\n\n` +
          `📸 <b>Public:</b> ${publicLinks || "Web Admin တွင်ကြည့်ရန်"}\n` +
          `🔒 <b>Private:</b> ${privateLinks || "Web Admin တွင်ကြည့်ရန်"}\n\n` +
          `🌐 <i>Website (/register) မှ တိုက်ရိုက်လျှောက်ထားသူ ဖြစ်ပါသည်။</i>`;

        await sendMessage(adminChatId, adminMsg, {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `APP_D_0_${targetBoyId}` },
              { text: "❌ Reject", callback_data: `REJ_D_0_${targetBoyId}` },
            ],
          ],
        });
      }
      return res.status(200).json({ status: "notified_admin" });
    }

    // Website / Booking Reservation -> Notify Admin Telegram Bot immediately
    if (reqBody.internal_action === "web_new_booking") {
      const adminChatId = await getAdminChatId();
      if (adminChatId) {
        const msg =
          `🛎️ <b>New Web Concierge Reservation (${escapeHTML(reqBody.bookingRef || "WL-BOOKING")})</b>\n\n` +
          `👤 <b>Date Boy:</b> ${escapeHTML(reqBody.dateBoyName)} (${escapeHTML(reqBody.dateBoyCode)})\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(reqBody.dateBoyTownship)}, ${escapeHTML(reqBody.dateBoyCity)}\n` +
          `🧑‍💼 <b>Client အမည်:</b> ${escapeHTML(reqBody.clientName)}\n` +
          `📞 <b>ဆက်သွယ်ရန်:</b> ${escapeHTML(reqBody.clientContact)}\n` +
          `📅 <b>ရက်စွဲ/အချိန်:</b> ${escapeHTML(reqBody.preferredDate)} · ${escapeHTML(reqBody.preferredTime)}\n` +
          `🕒 <b>Package:</b> ${escapeHTML(reqBody.duration)}\n` +
          `📝 <b>မှတ်ချက်:</b> ${escapeHTML(reqBody.notes || "-")}`;
        await sendMessage(adminChatId, msg);
      }
      return res.status(200).json({ status: "notified_admin" });
    }

    if (reqBody.internal_action === "request_media_reupload") {
      const targetBoyId = String(reqBody.boyId || "");
      if (!targetBoyId) {
        return res.status(400).json({ error: "Missing boyId" });
      }

      const boySnap = await getDoc(doc(db, "dateboys", targetBoyId));
      const boyData = boySnap.exists() ? boySnap.data() : {};
      const boyCode = `WLDB-${targetBoyId.substring(0, 5).toUpperCase()}`;
      const boyName = reqBody.boyName || boyData.name || "Date Boy";
      const boyPhone = reqBody.boyPhone || boyData.phone || "-";
      const boyCity = reqBody.boyCity || boyData.city || "-";
      const boyTownship = reqBody.boyTownship || boyData.township || "-";

      const targetChatId =
        reqBody.chatId ||
        boyData.telegramChatId ||
        (typeof boyData.telegramProfileLink === "string"
          ? boyData.telegramProfileLink.match(/id=(\d+)/)?.[1]
          : null);

      const tgProfileLink =
        reqBody.telegramProfileLink ||
        boyData.telegramProfileLink ||
        (targetChatId ? `tg://user?id=${targetChatId}` : "");

      let userNotified = false;
      if (targetChatId) {
        const boyStateRef = doc(db, "telegram_states", String(targetChatId));
        await setDoc(
          boyStateRef,
          {
            step: "REUPLOAD_PUBLIC_PHOTOS",
            data: { targetBoyId, publicPhotos: [], publicFileIds: [] },
          },
          { merge: true }
        );
        const userMsgRes = await sendMessage(
          targetChatId,
          `📢 <b>WE LINK Admin အသိပေးချက်</b>\n\nသင်၏ Date Boy လျှောက်လွှာ (<b>${boyCode} — ${escapeHTML(boyName)}</b>) မှ ဓာတ်ပုံနှင့် Video များကို စနစ်အသစ်သို့ ပြောင်းလဲသိမ်းဆည်းရန် လိုအပ်ပါသဖြင့် ကျေးဇူးပြု၍ <b>မျက်နှာသေချာမြင်ရသည့် အလှဓာတ်ပုံ (၃) ပုံ</b> ကို ယခု Chat တွင် တစ်ပုံချင်း ပြန်လည်ပေးပို့ပေးပါ ခင်ဗျာ။\n\n(ကိုယ်ရေးအချက်အလက်များ ထပ်မံဖြည့်သွင်းရန် မလိုအပ်ပါ — ပထမဆုံး အလှဓာတ်ပုံ ၁ ပုံကို စတင်ပို့ပေးပါ):`
        );
        userNotified = Boolean(userMsgRes?.ok);
      }

      // Record timestamp in Firestore so Web Admin UI persists the sent indicator
      if (boySnap.exists()) {
        await updateDoc(doc(db, "dateboys", targetBoyId), {
          reuploadRequestedAt: serverTimestamp(),
        });
      }

      // Also notify the Admin's Telegram Bot chat with the Date Boy's direct Telegram Chat Profile Link
      const adminChatId = await getAdminChatId();
      let adminNotified = false;
      if (adminChatId) {
        const statusLine = userNotified
          ? `✅ <b>${escapeHTML(boyName)}</b> ၏ Telegram Chat သို့ ပုံနှင့် Video အသစ်ပြန်ပို့ပေးရန် အကြောင်းကြားစာ ပေးပို့ပြီးပါပြီ။\n(Date Boy မှ ပုံအသစ်ပြန်ပို့သည်နှင့် ဤ Bot သို့ အလိုအလျောက် ရောက်ရှိလာပါမည်)`
          : `⚠️ Date Boy ထံသို့ တိုက်ရိုက်စာပို့ရာတွင် အခက်အခဲရှိပါသည် (Bot အား ပိတ်ထားခြင်း သို့မဟုတ် Chat ID မရှိခြင်း ဖြစ်နိုင်ပါသည်)။ အောက်ပါ Link သို့မဟုတ် ခလုတ်မှတစ်ဆင့် ဆက်သွယ်/လဲလှယ်နိုင်ပါသည်။`;

        const tgLinkLine = tgProfileLink
          ? `🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${tgProfileLink}">💬 ${escapeHTML(boyName)} နှင့် တိုက်ရိုက်စကားပြောရန် (ဒီကိုနှိပ်ပါ)</a>\n\n`
          : "";

        const adminNotiText =
          `🔔 <b>ပုံနှင့် Video အသစ်ပြန်တောင်းဆိုမှု အသိပေးချက် (Web Admin)</b>\n\n` +
          `🆔 <b>Code:</b> ${boyCode}\n` +
          `👤 <b>အမည်:</b> ${escapeHTML(boyName)}\n` +
          `📞 <b>ဖုန်း:</b> ${escapeHTML(boyPhone)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(boyTownship)}, ${escapeHTML(boyCity)}\n` +
          tgLinkLine +
          statusLine;

        const inlineRows = [];
        if (tgProfileLink) {
          inlineRows.push([
            {
              text: `💬 ${boyName} နှင့် တိုက်ရိုက်စကားပြောရန်`,
              url: tgProfileLink,
            },
          ]);
        }
        inlineRows.push([
          {
            text: "🔄 Admin ကိုယ်တိုင် ပုံ/Video အသစ်လဲမည်",
            callback_data: `ADM_MEDIA_${targetBoyId}`,
          },
        ]);

        let admRes = await sendMessage(adminChatId, adminNotiText, {
          inline_keyboard: inlineRows,
        });
        // Fallback without URL button if Telegram privacy settings reject tg://user?id= in inline button
        if (!admRes?.ok && tgProfileLink) {
          admRes = await sendMessage(adminChatId, adminNotiText, {
            inline_keyboard: [
              [
                {
                  text: "🔄 Admin ကိုယ်တိုင် ပုံ/Video အသစ်လဲမည်",
                  callback_data: `ADM_MEDIA_${targetBoyId}`,
                },
              ],
            ],
          });
        }
        adminNotified = Boolean(admRes?.ok);
      }

      return res.status(200).json({
        status: "reupload_requested",
        boyCode,
        userNotified,
        adminNotified,
      });
    }

    // Simultaneous Bulk Message Broadcast from Web Admin Panel to Date Boys via Telegram Bot
    if (reqBody.internal_action === "bulk_message_dateboys") {
      const recipients = Array.isArray(reqBody.recipients) ? reqBody.recipients : [];
      const rawTemplate = String(reqBody.messageText || "").trim();
      const headerTitle = String(reqBody.messageHeader || "").trim();
      const includeMainMenu = Boolean(reqBody.includeMainMenu);
      const setReuploadStep = Boolean(reqBody.setReuploadStep);
      const adminUsername = String(reqBody.adminUsername || "Web Admin");
      const targetSummary = String(reqBody.targetSummary || "ရွေးချယ်ထားသော Date Boy များ");

      if (!rawTemplate || recipients.length === 0) {
        return res.status(400).json({
          error: "ပေးပို့မည့် စာသား သို့မဟုတ် လက်ခံမည့် Date Boy စာရင်း မပြည့်စုံပါ။",
        });
      }

      const results = [];
      let sentCount = 0;
      let failedCount = 0;

      // Process in parallel batches of 10 for fast simultaneous delivery without hitting Telegram rate limits
      const BATCH_SIZE = 10;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (rec) => {
          const targetChatId = String(rec.chatId || "").trim();
          const boyId = String(rec.id || "").trim();
          const boyCode =
            rec.boyCode || (boyId ? `WLDB-${boyId.substring(0, 5).toUpperCase()}` : "WLDB-XXXXX");
          const boyName = String(rec.name || "Date Boy").trim();
          const boyCity = String(rec.city || "-").trim();
          const boyTownship = String(rec.township || "-").trim();

          if (!targetChatId || targetChatId === "0") {
            return {
              id: boyId,
              boyCode,
              name: boyName,
              chatId: targetChatId,
              ok: false,
              error: "Missing Chat ID",
            };
          }

          // Substitute personalization placeholders safely
          const personalizedBody = escapeHTML(rawTemplate)
            .replace(/\{name\}/gi, escapeHTML(boyName))
            .replace(/\{code\}/gi, escapeHTML(boyCode))
            .replace(/\{city\}/gi, escapeHTML(boyCity))
            .replace(/\{township\}/gi, escapeHTML(boyTownship));

          const finalHtml = headerTitle
            ? `📢 <b>${escapeHTML(headerTitle)}</b>\n\n${personalizedBody}`
            : personalizedBody;

          if (setReuploadStep && boyId) {
            try {
              await setDoc(
                doc(db, "telegram_states", targetChatId),
                {
                  step: "REUPLOAD_PUBLIC_PHOTOS",
                  data: { targetBoyId: boyId, publicPhotos: [], publicFileIds: [] },
                },
                { merge: true }
              );
              await updateDoc(doc(db, "dateboys", boyId), {
                reuploadRequestedAt: serverTimestamp(),
              }).catch(() => {});
            } catch (e) {
              console.error("Failed to set reupload step in bulk message:", e);
            }
          }

          const sendRes = await sendMessage(
            targetChatId,
            finalHtml,
            includeMainMenu ? MAIN_MENU_KEYBOARD : null
          );

          return {
            id: boyId,
            boyCode,
            name: boyName,
            city: boyCity,
            township: boyTownship,
            chatId: targetChatId,
            ok: Boolean(sendRes?.ok),
            error: sendRes?.ok ? null : sendRes?.description || sendRes?.error || "Send failed",
          };
        });

        const settled = await Promise.all(batchPromises);
        for (const item of settled) {
          results.push(item);
          if (item.ok) sentCount++;
          else failedCount++;
        }
      }

      // Send Broadcast Delivery Summary Notification to Admin's Telegram Bot
      const adminChatId = await getAdminChatId();
      let adminNotified = false;
      if (adminChatId) {
        const previewSnippet =
          rawTemplate.length > 220 ? `${rawTemplate.slice(0, 220)}...` : rawTemplate;
        const sampleNames = results
          .slice(0, 8)
          .map((r) => `${r.ok ? "✅" : "⚠️"} ${escapeHTML(r.name)} (${r.boyCode})`)
          .join("\n");
        const moreText =
          results.length > 8 ? `\n<i>...နှင့် အခြား (${results.length - 8}) ဦး</i>` : "";

        const adminReportMsg =
          `📢 <b>Bulk Message ပေးပို့မှု အစီရင်ခံစာ (Web Admin Broadcast)</b>\n\n` +
          `🎯 <b>ပေးပို့သည့် အုပ်စု:</b> ${escapeHTML(targetSummary)}\n` +
          `🛡️ <b>ပေးပို့သူ:</b> ${escapeHTML(adminUsername)}\n` +
          `📊 <b>စုစုပေါင်း:</b> ${recipients.length} ဦး | ✅ <b>အောင်မြင်:</b> ${sentCount} ဦး | ⚠️ <b>ပို့မရသူ:</b> ${failedCount} ဦး\n\n` +
          `📝 <b>ပေးပို့ခဲ့သည့် စာသား:</b>\n<i>${escapeHTML(previewSnippet)}</i>\n\n` +
          `👥 <b>လက်ခံသူ စာရင်း:</b>\n${sampleNames}${moreText}`;

        const admRes = await sendMessage(adminChatId, adminReportMsg);
        adminNotified = Boolean(admRes?.ok);
      }

      return res.status(200).json({
        status: "bulk_completed",
        totalCount: recipients.length,
        sentCount,
        failedCount,
        adminNotified,
        results,
      });
    }

    const { message, callback_query } = reqBody;
    let chatId,
      text = "",
      photos = [],
      fileIdToForward = null,
      username = null;

    if (message) {
      chatId = message.chat.id;
      globalChatId = chatId;
      text = message.text ? message.text.trim() : "";
      username =
        message.from?.username && /^[a-zA-Z0-9_]{4,}$/.test(message.from.username)
          ? message.from.username
          : null;

      let targetFileId = null;
      let compactPhotoFileId = null;
      let isVideoMedia = false;
      if (message.photo && message.photo.length > 0) {
        targetFileId = message.photo[message.photo.length - 1].file_id;
        // Pick medium resolution (~320-800px, ~20-45KB) for fast Base64 Firestore preview
        const mediumIdx = Math.min(1, message.photo.length - 1);
        compactPhotoFileId = message.photo[mediumIdx].file_id;
      } else if (message.video) {
        targetFileId = message.video.file_id;
        isVideoMedia = true;
      } else if (message.document) {
        targetFileId = message.document.file_id;
        isVideoMedia = Boolean(
          message.document.mime_type && message.document.mime_type.startsWith("video/")
        );
      }

      if (targetFileId) {
        fileIdToForward = targetFileId;
        let storedUrl = null;
        if (compactPhotoFileId && !isVideoMedia) {
          storedUrl = await fetchTelegramPhotoDataUrl(compactPhotoFileId);
        }
        if (!storedUrl) {
          storedUrl = await getPermanentMediaUrl(targetFileId, baseUrl, isVideoMedia);
        }
        if (storedUrl) photos.push(storedUrl);
      }
    } else if (callback_query) {
      chatId = callback_query.message.chat.id;
      globalChatId = chatId;
      text = callback_query.data;
      username =
        callback_query.from?.username && /^[a-zA-Z0-9_]{4,}$/.test(callback_query.from.username)
          ? callback_query.from.username
          : null;
    }

    if (!chatId) return res.status(200).json({ status: "No chatId" });
    const stateRef = doc(db, "telegram_states", String(chatId));

    // 🚀 ၁။ Commands များနှင့် Menu ခလုတ်များကို အရင်ဆုံး စစ်ဆေးပါမည်
    if (text === "/ping") {
      await sendMessage(chatId, "✅ Webhook & Permanent Media Proxy is running!");
      return res.status(200).json({ status: "success" });
    }

    if (text === "/setadmin") {
      await setDoc(doc(db, "settings", "admin_config"), { chatId: chatId });
      await sendMessage(chatId, "✅ ဤအကောင့်ကို Admin အဖြစ် သတ်မှတ်ပြီးပါပြီ။");
      return res.status(200).json({ status: "success" });
    }

    if (text === "/start" || text === "RESET" || text.includes("အစသို့ ပြန်သွားမည်")) {
      await sendMessage(chatId, "ပင်မ စာမျက်နှာသို့ ပြန်သွားနေပါသည်...", MAIN_MENU_KEYBOARD);
      await startBotFlow(chatId, stateRef);
      return res.status(200).json({ status: "success" });
    }

    if (text.includes("Date Boy ထပ်ရှာမည်")) text = "ROLE_CLIENT";
    if (text.includes("Date Boy လျှောက်မည်")) text = "ROLE_APPLICANT";
    if (text.includes("Admin သို့ ဆက်သွယ်ရန်")) {
      const config = await getAppConfig();
      await sendMessage(
        chatId,
        `📞 <b>Admin သို့ ဆက်သွယ်ရန်</b>\n\nအကူအညီ လိုအပ်ပါက အောက်ပါသို့ ဆက်သွယ်မေးမြန်းနိုင်ပါသည်။\n\n📱 ဖုန်း: ${config.paymentInfo.match(/\d+/) ? config.paymentInfo.match(/\d+/)[0] : "N/A"}\n💬 Telegram: @AdminAccount`
      );
      return res.status(200).json({ status: "success" });
    }

    // 🚀 ၂။ Text Prefixes များကို စစ်ဆေးပါမည်
    const cleanText = text
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/[\u200B-\u200D\uFEFF]/g, "");
    const inputText = cleanText.toUpperCase().replace(/\s+/g, "");

    if (inputText.startsWith("WLC-")) {
      try {
        const clientDoc = await getDoc(doc(db, "client_ids", inputText));
        if (!clientDoc.exists()) {
          await sendMessage(
            chatId,
            `❌ သင့်၏ Client ID (${inputText}) မှာ မှားယွင်းနေပါသည် (ရှာမတွေ့ပါ)။ ကျေးဇူးပြု၍ ပြန်လည်စစ်ဆေးပါ။`
          );
        } else if (clientDoc.data().status !== "active") {
          await sendMessage(chatId, `❌ သင့်၏ Client ID (${inputText}) မှာ သက်တမ်းကုန်ဆုံးသွားပါပြီ။`);
        } else {
          const q = query(collection(db, "dateboys"), where("status", "==", "approved"));
          const snap = await getDocs(q);
          const cities = [
            ...new Set(snap.docs.map((d) => (d.data().city || "").trim()).filter(Boolean)),
          ];
          if (cities.length === 0) {
            await sendMessage(
              chatId,
              "⚠️ လောလောဆယ် ရရှိနိုင်သော Date Boy များ မရှိသေးပါ။",
              MAIN_MENU_KEYBOARD
            );
            await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
          } else {
            const keyboard = cities.map((c, index) => [
              { text: `🏙️ ${c}`, callback_data: `CITYIDX_${index}` },
            ]);
            await setDoc(
              stateRef,
              { step: "CLIENT_SELECT_CITY", data: { availableCities: cities } },
              { merge: true }
            );
            await sendMessage(
              chatId,
              "✅ Client ID အတည်ပြုပြီးပါပြီ。\n\n🔍 ကျေးဇူးပြု၍ ရှာဖွေလိုသော <b>မြို့</b> ကို အရင်ရွေးချယ်ပါ -",
              { inline_keyboard: keyboard }
            );
          }
        }
      } catch (err) {
        console.error("Client ID Error:", err);
        await sendMessage(
          chatId,
          `⚠️ Client ID စစ်ဆေးရာတွင် အခက်အခဲဖြစ်ပေါ်နေပါသည်။ (${err.message})`
        );
      }
      return res.status(200).json({ status: "success" });
    }

    const adminChatId = await getAdminChatId();

    // Admin Media Actions: SEND_MEDIA_, ADM_MEDIA_, REQ_REUP_, SKIP_ADM_VID_
    if (
      text.startsWith("SEND_MEDIA_") ||
      text.startsWith("ADM_MEDIA_") ||
      text.startsWith("REQ_REUP_") ||
      text.startsWith("SKIP_ADM_VID_")
    ) {
      if (!adminChatId || chatId.toString() !== adminChatId.toString()) {
        await sendMessage(chatId, "⚠️ ဤလုပ်ဆောင်ချက်ကို Admin သာ အသုံးပြုနိုင်ပါသည်။");
        return res.status(200).json({ status: "ok" });
      }

      if (text.startsWith("SEND_MEDIA_")) {
        const boyId = text.replace("SEND_MEDIA_", "");
        const boySnap = await getDoc(doc(db, "dateboys", boyId));
        if (!boySnap.exists()) {
          await sendMessage(chatId, "❌ ၎င်း Date Boy စာရင်းအား ရှာမတွေ့ပါ။");
          return res.status(200).json({ status: "ok" });
        }
        const boy = boySnap.data();
        const { sentCount } = await sendCompanionMediaToChat(chatId, boy, boyId, {
          includePublic: true,
          includePrivate: true,
          includeVideo: true,
        });
        if (sentCount === 0) {
          await sendMessage(
            chatId,
            "⚠️ ဤ Date Boy သည် စနစ်အဟောင်းဖြင့် တင်ထားသောကြောင့် Telegram ၏ (၁) နာရီသက်တမ်းကုန်ဆုံးသွားသည့် Link အဟောင်းများ ဖြစ်နေပါသည်။\n\nအောက်ပါ <b>🔄 Admin မှ ပုံ/Video အသစ်လဲမည်</b> သို့မဟုတ် <b>📩 Date Boy ထံ ပုံအသစ်ပြန်တောင်းမည်</b> ခလုတ်ကို နှိပ်၍ အသစ်ပြန်ထည့်နိုင်ပါသည်။"
          );
        }
        return res.status(200).json({ status: "ok" });
      }

      if (text.startsWith("ADM_MEDIA_")) {
        const boyId = text.replace("ADM_MEDIA_", "");
        const boySnap = await getDoc(doc(db, "dateboys", boyId));
        if (!boySnap.exists()) {
          await sendMessage(chatId, "❌ ၎င်း Date Boy စာရင်းအား ရှာမတွေ့ပါ။");
          return res.status(200).json({ status: "ok" });
        }
        const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
        await setDoc(
          stateRef,
          {
            step: "ADMIN_REPLACE_PUBLIC_PHOTOS",
            data: { targetBoyId: boyId, publicPhotos: [], publicFileIds: [] },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          `🔄 <b>${boyCode} (${escapeHTML(boySnap.data().name)})</b> အတွက် ပုံနှင့် Video အသစ်လဲလှယ်ခြင်း စတင်ပါပြီ။\n\n📸 ကျေးဇူးပြု၍ <b>Public အလှဓာတ်ပုံ (၃) ပုံ</b> ကို တစ်ပုံချင်းစီ ပို့ပေးပါ (1/3) -`
        );
        return res.status(200).json({ status: "ok" });
      }

      if (text.startsWith("SKIP_ADM_VID_")) {
        const boyId = text.replace("SKIP_ADM_VID_", "");
        const stateSnapTemp = await getDoc(stateRef);
        const stData = stateSnapTemp.exists() ? stateSnapTemp.data().data || {} : {};
        if (stData.publicPhotos && stData.privatePhotos) {
          await updateDoc(doc(db, "dateboys", boyId), {
            publicPhotos: stData.publicPhotos,
            publicPhoto: stData.publicPhotos[0] || "",
            publicFileIds: stData.publicFileIds || [],
            privatePhotos: stData.privatePhotos,
            privateFileIds: stData.privateFileIds || [],
          });
        }
        await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
        const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
        await sendMessage(
          chatId,
          `✅ <b>${boyCode}</b> ၏ Public နှင့် Private ဓာတ်ပုံများကို အောင်မြင်စွာ အသစ်လဲလှယ်ပြီးပါပြီ! (ယခု Link များသည် သက်တမ်းကုန်ဆုံးမည် မဟုတ်တော့ပါ)`,
          MAIN_MENU_KEYBOARD
        );
        return res.status(200).json({ status: "ok" });
      }

      if (text.startsWith("REQ_REUP_")) {
        const boyId = text.replace("REQ_REUP_", "");
        const boySnap = await getDoc(doc(db, "dateboys", boyId));
        if (!boySnap.exists()) {
          await sendMessage(chatId, "❌ ၎င်း Date Boy စာရင်းအား ရှာမတွေ့ပါ။");
          return res.status(200).json({ status: "ok" });
        }
        const boy = boySnap.data();
        const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
        if (!boy.telegramChatId) {
          await sendMessage(
            chatId,
            "⚠️ ဤ Date Boy သည် Website မှ လျှောက်ထားသူဖြစ်သဖြင့် Telegram Chat ID မရှိပါ။ Admin ကိုယ်တိုင် ပုံအသစ်လဲလှယ်ပေးပါ။"
          );
          return res.status(200).json({ status: "ok" });
        }

        const boyStateRef = doc(db, "telegram_states", String(boy.telegramChatId));
        await setDoc(
          boyStateRef,
          {
            step: "REUPLOAD_PUBLIC_PHOTOS",
            data: { targetBoyId: boyId, publicPhotos: [], publicFileIds: [] },
          },
          { merge: true }
        );

        const tgLink = boy.telegramProfileLink || `tg://user?id=${boy.telegramChatId}`;
        await sendMessage(
          boy.telegramChatId,
          `📢 <b>WE LINK Admin အသိပေးချက်</b>\n\nသင်၏ Date Boy လျှောက်လွှာ (<b>${boyCode}</b>) မှ ဓာတ်ပုံနှင့် Video များကို စနစ်အသစ်သို့ ပြောင်းလဲသိမ်းဆည်းရန် လိုအပ်ပါသဖြင့် ကျေးဇူးပြု၍ <b>မျက်နှာသေချာမြင်ရသည့် အလှဓာတ်ပုံ (၃) ပုံ</b> ကို ယခု Chat တွင် တစ်ပုံချင်း ပြန်လည်ပေးပို့ပေးပါ ခင်ဗျာ။\n\n(ကိုယ်ရေးအချက်အလက်များ ထပ်မံဖြည့်သွင်းရန် မလိုအပ်ပါ — ပထမဆုံး အလှဓာတ်ပုံ ၁ ပုံကို စတင်ပို့ပေးပါ):`
        );
        await sendMessage(
          chatId,
          `📩 <b>${escapeHTML(boy.name)} (${boyCode})</b> ထံသို့ ဓာတ်ပုံနှင့် Video အသစ်ပြန်လည်ပေးပို့ပေးရန် အကြောင်းကြားစာ ပို့ပေးလိုက်ပါပြီ။\n\n🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${tgLink}">💬 ${escapeHTML(boy.name)} နှင့် တိုက်ရိုက်စကားပြောရန် (ဒီကိုနှိပ်ပါ)</a>`
        );
        return res.status(200).json({ status: "ok" });
      }
    }

    if (inputText.startsWith("WLDB-")) {
      if (!adminChatId || chatId.toString() !== adminChatId.toString()) {
        await sendMessage(chatId, "⚠️ ဤလုပ်ဆောင်ချက်ကို Admin သာ အသုံးပြုနိုင်ပါသည်။");
        return res.status(200).json({ status: "ok" });
      }

      const searchCode = inputText;
      const snap = await getDocs(collection(db, "dateboys"));
      let foundBoy = null;
      let foundBoyId = null;

      snap.forEach((d) => {
        const code = `WLDB-${d.id.substring(0, 5).toUpperCase()}`;
        if (code === searchCode) {
          foundBoy = d.data();
          foundBoyId = d.id;
        }
      });

      if (foundBoy) {
        const publicLinks = processMediaLinks(foundBoy.publicPhotos, "Public ပုံ", {
          baseUrl,
          boyId: foundBoyId,
          mediaType: "public",
          fileIds: foundBoy.publicFileIds,
        });
        const privateLinks = processMediaLinks(foundBoy.privatePhotos, "Private ပုံ", {
          baseUrl,
          boyId: foundBoyId,
          mediaType: "private",
          fileIds: foundBoy.privateFileIds,
        });
        const videoLink = buildVideoLinkHtml(foundBoy, foundBoyId, baseUrl);
        const tgLink = foundBoy.telegramProfileLink || `tg://user?id=${foundBoy.telegramChatId}`;
        const isLegacyExpiredProne = hasLegacyRawTelegramUrls(foundBoy);

        let legacyWarning = "";
        if (isLegacyExpiredProne) {
          legacyWarning =
            `\n\n⚠️ <b>သတိပြုရန်:</b> ဤ Date Boy သည် စနစ်အဟောင်းဖြင့် တင်ထားသောကြောင့် Telegram ၏ (၁) နာရီသက်တမ်းကုန် Link အဟောင်း ဖြစ်နေနိုင်ပါသည်။ အောက်ပါခလုတ်များဖြင့် ပုံအသစ် ချက်ချင်းလဲလှယ်နိုင်ပါသည်။`;
        }

        const adminMsg =
          `🔍 <b>Date Boy အချက်အလက် (Admin View)</b>\n\n` +
          `🆔 <b>Code:</b> ${searchCode}\n` +
          `👤 <b>အမည်:</b> ${escapeHTML(foundBoy.name)}\n` +
          `🎂 <b>အသက်:</b> ${escapeHTML(foundBoy.age)} နှစ်\n` +
          `📏 <b>အရပ်:</b> ${escapeHTML(foundBoy.height)} | 🍆 <b>Size:</b> ${escapeHTML(foundBoy.cockSize || "N/A")}\n` +
          `📞 <b>ဖုန်း:</b> ${escapeHTML(foundBoy.phone)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(foundBoy.township)}, ${escapeHTML(foundBoy.city)}\n` +
          `🏠 <b>လိပ်စာ အသေးစိတ်:</b> ${escapeHTML(foundBoy.address)}\n\n` +
          `📸 <b>Public:</b> ${publicLinks || "မရှိပါ"}\n` +
          `🔒 <b>Private:</b> ${privateLinks || "မရှိပါ"}\n` +
          `🎬 <b>Video:</b> ${videoLink}\n\n` +
          `🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${tgLink}">ဒီကိုနှိပ်ပါ</a>\n` +
          `📊 <b>Status:</b> ${
            foundBoy.status === "approved"
              ? "✅ Approved"
              : foundBoy.status === "hidden"
                ? "👁️‍🗨️ Hidden"
                : "⏳ Pending"
          }${legacyWarning}`;

        const inlineRows = [];
        if (foundBoy.status === "pending") {
          inlineRows.push([
            {
              text: "✅ Approve",
              callback_data: `APP_D_${foundBoy.telegramChatId || chatId}_${foundBoyId}`,
            },
            {
              text: "❌ Reject",
              callback_data: `REJ_D_${foundBoy.telegramChatId || chatId}_${foundBoyId}`,
            },
          ]);
        }
        inlineRows.push([
          {
            text: "📸 ပုံ/Video များ Chat ထဲသို့ပို့ရန်",
            callback_data: `SEND_MEDIA_${foundBoyId}`,
          },
        ]);
        inlineRows.push([
          {
            text: "🔄 Admin မှ ပုံ/Video အသစ်လဲမည်",
            callback_data: `ADM_MEDIA_${foundBoyId}`,
          },
          ...(foundBoy.telegramChatId
            ? [
                {
                  text: "📩 Date Boy ထံ ပုံပြန်တောင်းမည်",
                  callback_data: `REQ_REUP_${foundBoyId}`,
                },
              ]
            : []),
        ]);

        await sendMessage(chatId, adminMsg, { inline_keyboard: inlineRows });

        // Automatically send native photo/video album if permanent file_ids exist
        await sendCompanionMediaToChat(chatId, foundBoy, foundBoyId, {
          includePublic: true,
          includePrivate: true,
          includeVideo: true,
        });
      } else {
        await sendMessage(chatId, `❌ <b>${searchCode}</b> အား စနစ်အတွင်း ရှာမတွေ့ပါ။`);
      }
      return res.status(200).json({ status: "ok" });
    }

    if (text.startsWith("R_R")) {
      const parts = text.split("_");
      const reasonCode = parts[1]; // R1, R2, R3, R4, R5(Custom)
      const clientChatId = parts[2];
      const boyId = parts[3];

      const boySnap = await getDoc(doc(db, "dateboys", boyId));
      const boyName = boySnap.exists() ? boySnap.data().name : "Applicant";
      const tgLink = boySnap.exists()
        ? boySnap.data().telegramProfileLink
        : `tg://user?id=${clientChatId}`;

      if (reasonCode === "R5") {
        await setDoc(
          stateRef,
          { step: "WAIT_CUSTOM_REASON", data: { clientChatId, boyId, boyName, tgLink } },
          { merge: true }
        );
        await sendMessage(
          chatId,
          `✍️ <b>${escapeHTML(boyName)}</b> အား ပယ်ချရသည့် အကြောင်းရင်း အတိအကျကို ယခု Chat တွင် ရိုက်ထည့်ပေးပါ -`
        );
        return res.status(200).json({ status: "ok" });
      }

      let reasonMsg =
        "❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို အောက်ပါအကြောင်းရင်းကြောင့် ပယ်ချလိုက်ပါသည် -\n\n";
      if (reasonCode === "R1") reasonMsg += "👉 <b>သတ်မှတ်အရည်အချင်းများနှင့် မကိုက်ညီခြင်း</b>";
      else if (reasonCode === "R2")
        reasonMsg +=
          "👉 <b>ပေးပို့ထားသောပုံများ နှင့် Video အဆင်မပြေခြင်း</b>\n(ကျေးဇူးပြု၍ ပုံများနှင့် Video ကို အသစ်ပြန်လည်စီစဉ်ပြီး အစကနေ ပြန်တင်ပေးပါ ခင်ဗျာ)";
      else if (reasonCode === "R3")
        reasonMsg +=
          "👉 <b>ရုပ်ရည်နှင့် ခန္ဓာကိုယ်အချိုးအစား လုပ်ငန်းလိုအပ်ချက်နှင့် အဆင်မပြေခြင်း</b>";
      else if (reasonCode === "R4")
        reasonMsg = "❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို ပယ်ချလိုက်ပါသည်။";

      await deleteDoc(doc(db, "dateboys", boyId));
      if (clientChatId && clientChatId !== "0") {
        await handleUserRejection(clientChatId, reasonMsg, tgLink);
      }
      await sendMessage(
        chatId,
        `❌ <b>${escapeHTML(boyName)}</b> ၏ လျှောက်လွှာကို ပယ်ချပြီး အကြောင်းရင်းကို User ထံ ပို့ပေးလိုက်ပါပြီ။`
      );
      return res.status(200).json({ status: "ok" });
    }

    if (text.startsWith("APP_") || text.startsWith("REJ_")) {
      const parts = text.split("_");
      const action = parts[0] + "_" + parts[1];
      const clientChatId = parts[2];
      const boyId = parts[3];

      if (action === "APP_C") {
        const newClientId = `WLC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await setDoc(doc(db, "client_ids", newClientId), {
          clientId: newClientId,
          telegramChatId: clientChatId,
          status: "active",
          createdAt: serverTimestamp(),
        });
        await sendMessage(
          clientChatId,
          `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။\n\nသင့်၏ လျှို့ဝှက် Client ID မှာ <code>${newClientId}</code> ဖြစ်ပါသည်။ (Copy ကူးယူပါ)\n\nDate Boy ရှာဖွေရာတွင် ဤ ID အား အသုံးပြုနိုင်ပါသည်။`,
          { inline_keyboard: [[{ text: "🔍 ယခု Date Boy ရှာမည်", callback_data: "ROLE_CLIENT" }]] }
        );
        await sendMessage(
          chatId,
          `✅ Client ID: <b>${newClientId}</b> အား ဖန်တီး၍ Client ထံ ပို့ပေးလိုက်ပါပြီ။`
        );
        return res.status(200).json({ status: "ok" });
      } else if (action === "REJ_C") {
        await sendMessage(
          clientChatId,
          `❌ Client ID ဝယ်ယူရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`
        );
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
        return res.status(200).json({ status: "ok" });
      }

      const boySnap = await getDoc(doc(db, "dateboys", boyId));
      if (!boySnap.exists()) return res.status(200).json({ status: "not found" });
      const boy = boySnap.data();
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;

      if (action === "APP_P") {
        const prPhotos = Array.isArray(boy.privatePhotos)
          ? boy.privatePhotos
          : boy.privatePhotos
            ? [boy.privatePhotos]
            : [];

        // Send native private photos & video directly into Client's Telegram chat
        await sendCompanionMediaToChat(clientChatId, boy, boyId, {
          includePublic: false,
          includePrivate: true,
          includeVideo: true,
        });

        const privateLinksText = processMediaLinks(prPhotos, "Private ပုံ", {
          baseUrl,
          boyId,
          mediaType: "private",
          fileIds: boy.privateFileIds,
        });
        const videoLinkText = buildVideoLinkHtml(boy, boyId, baseUrl);

        const displayLinks = privateLinksText
          ? `\n\n🔒 <b>Private ဓာတ်ပုံများ:</b> ${privateLinksText}`
          : "";
        const displayVideo =
          boy.privateVideo || boy.privateVideoFileId ? `\n🎬 <b>Video:</b> ${videoLinkText}` : "";
        const nextActionKeyboard = {
          inline_keyboard: [
            [{ text: "❤️ ခေါ်ယူမည် (Hire)", callback_data: `REQ_H_${boyId}` }],
            [{ text: "🔄 နောက်တစ်ယောက် ထပ်ရှာမည်", callback_data: "ROLE_CLIENT" }],
          ],
        };

        await sendMessage(
          clientChatId,
          `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။ ဤသည်မှာ <b>${boyCode}</b> ၏ Private အချက်အလက်များဖြစ်ပါသည်-${displayLinks}${displayVideo}\n\nယခု Date Boy အား ခေါ်ယူလိုပါက အောက်ပါခလုတ်ကို နှိပ်ပါ။`,
          nextActionKeyboard
        );
        await sendMessage(
          chatId,
          `✅ <b>${boyCode}</b> ၏ Private အချက်အလက်များကို Client ထံ ပို့ပေးလိုက်ပါပြီ။`
        );
      } else if (action === "REJ_P") {
        await sendMessage(
          clientChatId,
          `❌ <b>${boyCode}</b> ၏ Private ပုံကြည့်ရှုရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`
        );
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
      } else if (action === "APP_H") {
        await sendMessage(
          clientChatId,
          `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။ <b>${boyCode}</b> နှင့် Dating ပြုလုပ်ရန် အတည်ပြုပြီးပါပြီ! 🎉\n\nAdmin မှ အသေးစိတ် ဆက်သွယ်ပေးပါမည်။`,
          MAIN_MENU_KEYBOARD
        );
        await sendMessage(
          chatId,
          `✅ <b>${boyCode}</b> နှင့် Dating Request ကို အတည်ပြုပေးလိုက်ပါပြီ။ Client ထံ ဆက်သွယ်ပေးပါ။`
        );
      } else if (action === "REJ_H") {
        await sendMessage(
          clientChatId,
          `❌ <b>${boyCode}</b> အား ခေါ်ယူရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`
        );
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
      } else if (action === "APP_D") {
        await updateDoc(doc(db, "dateboys", boyId), {
          status: "approved",
          approvedAt: serverTimestamp(),
        });
        const approveMsg = `🎉 ကျေးဇူးတင်ပါတယ်။ သတ်မှတ်အရည်အချင်းများနှင့် ပြည့်စုံကိုက်ညီသောကြောင့် သင့်အား WE LINK ၏ Date Boy စာရင်းထဲသို့ ပေါင်းထည့်ပေးလိုက်ပါပြီ။\n\n📌 သင့်၏ Date Boy ID မှာ: <code>${boyCode}</code> ဖြစ်ပါသည်။ Privacy အရ သင်၏ အမည်အရင်းကို ဧည့်သည်အားပြသမည်မဟုတ်သောကြောင့် ယခု ID အား သေချာစွာမှတ်သားထားပေးပါ။\n\nမန္တလေးမြို့တွင်းဆိုရင် ချက်ချင်း(သို့မဟုတ်) (၁)ရက် (၂) ရက်အတွင်းရရှိနိုင်ပြီး အခြားမြို့များကဆိုရင် အနည်းဆုံး (၁)ပတ်ကနေ ဧည့်သည်အခြေအနေပေါ်မူတည်ပြီး စောင့်ရနိုင်ပါသည်။\n\nအထူးသတိပြုရန်မှာ Date Boy စာရင်းသို့ပေါင်းထည့်လိုက်ပြီး ခေါ်ယူလိုသည့်ဧည့်သည်များကို ပြသသည့်စာရင်းထဲတွင် ပါဝင်ပြီးဖြစ်သော်လည်း အလုပ်ရရှိရန်အတွက် မိမိအား ခေါ်ယူမည့် ဧည့်သည်ကြိုက်ရန်လည်း လိုအပ်ပါသေးသည်။\n\nလုပ်ငန်းလိုအပ်ချက်အရ အပြင်လူတွေ့ အင်တာဗျူးရန် လိုအပ်ပါက နေရာနှင့် အချိန်အသေးစိတ်ကို Admin မှ ပြန်လည်ဆက်သွယ်ပေးသွားပါမည်။`;
        if (clientChatId && clientChatId !== "0") {
          await sendMessage(clientChatId, approveMsg, MAIN_MENU_KEYBOARD);
        }
        const tgLink =
          boy.telegramProfileLink ||
          (clientChatId && clientChatId !== "0" ? `tg://user?id=${clientChatId}` : "");
        const tgLinkLine = tgLink
          ? `\n🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${tgLink}">💬 ${escapeHTML(boy.name)} နှင့် တိုက်ရိုက်စကားပြောရန်</a>`
          : "";
        await sendMessage(
          chatId,
          `✅ <b>${escapeHTML(boy.name)} (${boyCode})</b> ကို Date Boy အဖြစ် အတည်ပြုလိုက်ပါပြီ။${tgLinkLine}`
        );
      } else if (action === "REJ_D") {
        const reasonKeyboard = {
          inline_keyboard: [
            [
              {
                text: "⚠️ အရည်အချင်း မကိုက်ညီခြင်း",
                callback_data: `R_R1_${clientChatId}_${boyId}`,
              },
            ],
            [
              {
                text: "📸 ပုံ/Video အဆင်မပြေခြင်း",
                callback_data: `R_R2_${clientChatId}_${boyId}`,
              },
            ],
            [
              {
                text: "👤 ရုပ်ရည်/ခန္ဓာကိုယ် အဆင်မပြေခြင်း",
                callback_data: `R_R3_${clientChatId}_${boyId}`,
              },
            ],
            [{ text: "❌ ရိုးရိုးပယ်ချမည်", callback_data: `R_R4_${clientChatId}_${boyId}` }],
            [
              {
                text: "✍️ အခြား (Custom) စာရိုက်မည်",
                callback_data: `R_R5_${clientChatId}_${boyId}`,
              },
            ],
          ],
        };
        await sendMessage(
          chatId,
          `ကျေးဇူးပြု၍ <b>${escapeHTML(boy.name)}</b> အား ပယ်ချရသည့် အကြောင်းရင်းကို ရွေးချယ်ပေးပါ -`,
          reasonKeyboard
        );
      }
      return res.status(200).json({ status: "ok" });
    }

    // 🚀 ၃။ State အခြေခံ Logic များကို စစ်ဆေးပါမည်
    const stateSnap = await getDoc(stateRef);
    const currentState = stateSnap.exists() ? stateSnap.data() : { step: "IDLE", data: {} };

    // Admin replacing Public/Private Photos & Video for an existing Date Boy
    if (currentState.step === "ADMIN_REPLACE_PUBLIC_PHOTOS") {
      const targetBoyId = currentState.data.targetBoyId;
      const currentPublic = currentState.data.publicPhotos || [];
      const currentPublicIds = currentState.data.publicFileIds || [];
      if (photos.length > 0 && fileIdToForward) {
        currentPublic.push(...photos);
        currentPublicIds.push(fileIdToForward);
        await setDoc(
          stateRef,
          {
            step: "ADMIN_REPLACE_PUBLIC_PHOTOS",
            data: {
              ...currentState.data,
              publicPhotos: currentPublic,
              publicFileIds: currentPublicIds,
            },
          },
          { merge: true }
        );
      }
      if (currentPublic.length < 3) {
        await sendMessage(
          chatId,
          `📸 Public အလှဓာတ်ပုံ ${currentPublic.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါဦး။`
        );
      } else {
        await setDoc(
          stateRef,
          {
            step: "ADMIN_REPLACE_PRIVATE_PHOTOS",
            data: {
              ...currentState.data,
              publicPhotos: currentPublic,
              publicFileIds: currentPublicIds,
              privatePhotos: [],
              privateFileIds: [],
            },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          "✅ Public အလှဓာတ်ပုံ ၃ ပုံ ရရှိပါပြီ။\n\n🔒 ယခု <b>Private ပုံ (၃) ပုံ</b> ကို တစ်ပုံချင်းစီ ဆက်လက်ပို့ပေးပါ (1/3) -"
        );
      }
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "ADMIN_REPLACE_PRIVATE_PHOTOS") {
      const targetBoyId = currentState.data.targetBoyId;
      const currentPrivate = currentState.data.privatePhotos || [];
      const currentPrivateIds = currentState.data.privateFileIds || [];
      if (photos.length > 0 && fileIdToForward) {
        currentPrivate.push(...photos);
        currentPrivateIds.push(fileIdToForward);
        await setDoc(
          stateRef,
          {
            step: "ADMIN_REPLACE_PRIVATE_PHOTOS",
            data: {
              ...currentState.data,
              privatePhotos: currentPrivate,
              privateFileIds: currentPrivateIds,
            },
          },
          { merge: true }
        );
      }
      if (currentPrivate.length < 3) {
        await sendMessage(
          chatId,
          `🔒 Private ပုံ ${currentPrivate.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါဦး။`
        );
      } else {
        await setDoc(
          stateRef,
          {
            step: "ADMIN_REPLACE_VIDEO",
            data: {
              ...currentState.data,
              privatePhotos: currentPrivate,
              privateFileIds: currentPrivateIds,
            },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          "✅ Private ပုံ (၃) ပုံ ရရှိပါပြီ။\n\n🎬 ယခု <b>Private Video</b> ဖိုင်ကို ပို့ပေးပါ (သို့မဟုတ် Video မပြောင်းလိုပါက အောက်ပါခလုတ်ကို နှိပ်ပါ) -",
          {
            inline_keyboard: [
              [
                {
                  text: "⏭️ Video မပြောင်းပါ (ပုံများကိုသာ သိမ်းမည်)",
                  callback_data: `SKIP_ADM_VID_${targetBoyId}`,
                },
              ],
            ],
          }
        );
      }
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "ADMIN_REPLACE_VIDEO") {
      const targetBoyId = currentState.data.targetBoyId;
      const isVideo = message && (message.video || message.document);
      if (!isVideo || photos.length === 0) {
        await sendMessage(
          chatId,
          "⚠️ ကျေးဇူးပြု၍ 20MB အောက် Video ဖိုင်ကို ပို့ပေးပါ (သို့မဟုတ် အပေါ်မှ ကျော်မည် ခလုတ်ကို နှိပ်ပါ)။"
        );
        return res.status(200).json({ status: "success" });
      }
      const stData = currentState.data;
      await updateDoc(doc(db, "dateboys", targetBoyId), {
        publicPhotos: stData.publicPhotos,
        publicPhoto: stData.publicPhotos[0] || "",
        publicFileIds: stData.publicFileIds || [],
        privatePhotos: stData.privatePhotos,
        privateFileIds: stData.privateFileIds || [],
        privateVideo: photos[0],
        privateVideoFileId: fileIdToForward,
      });
      await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
      const boyCode = `WLDB-${targetBoyId.substring(0, 5).toUpperCase()}`;
      await sendMessage(
        chatId,
        `🎉 <b>${boyCode}</b> ၏ Public ပုံ (၃) ပုံ၊ Private ပုံ (၃) ပုံ နှင့် Video ကို အောင်မြင်စွာ အသစ်လဲလှယ်ပြီးပါပြီ!\n\nယခု Link များသည် သက်တမ်းကုန်ဆုံးမည် မဟုတ်တော့ပါ။`,
        MAIN_MENU_KEYBOARD
      );
      return res.status(200).json({ status: "success" });
    }

    // Applicant Re-Uploading Media for an existing Date Boy record
    if (currentState.step === "REUPLOAD_PUBLIC_PHOTOS") {
      const currentPublic = currentState.data.publicPhotos || [];
      const currentPublicIds = currentState.data.publicFileIds || [];
      if (photos.length > 0 && fileIdToForward) {
        currentPublic.push(...photos);
        currentPublicIds.push(fileIdToForward);
        await setDoc(
          stateRef,
          {
            step: "REUPLOAD_PUBLIC_PHOTOS",
            data: {
              ...currentState.data,
              publicPhotos: currentPublic,
              publicFileIds: currentPublicIds,
            },
          },
          { merge: true }
        );
      }
      if (currentPublic.length < 3) {
        await sendMessage(
          chatId,
          `📸 အလှဓာတ်ပုံ ${currentPublic.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါဦး။`
        );
      } else {
        await setDoc(
          stateRef,
          {
            step: "REUPLOAD_PRIVATE_PHOTOS",
            data: {
              ...currentState.data,
              publicPhotos: currentPublic,
              publicFileIds: currentPublicIds,
              privatePhotos: [],
              privateFileIds: [],
            },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          "✅ အလှဓာတ်ပုံ ၃ ပုံ ရရှိပါပြီ။\n\n🔒 ယခု အရွယ်အစား အမှန်အကန်ကို သေချာမြင်ရသော <b>ပစ္စည်းပုံ (Cock Photo) ၃ ပုံ</b> ကို တစ်ပုံချင်းစီ ပို့ပေးပါ (1/3) -"
        );
      }
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "REUPLOAD_PRIVATE_PHOTOS") {
      const currentPrivate = currentState.data.privatePhotos || [];
      const currentPrivateIds = currentState.data.privateFileIds || [];
      if (photos.length > 0 && fileIdToForward) {
        currentPrivate.push(...photos);
        currentPrivateIds.push(fileIdToForward);
        await setDoc(
          stateRef,
          {
            step: "REUPLOAD_PRIVATE_PHOTOS",
            data: {
              ...currentState.data,
              privatePhotos: currentPrivate,
              privateFileIds: currentPrivateIds,
            },
          },
          { merge: true }
        );
      }
      if (currentPrivate.length < 3) {
        await sendMessage(
          chatId,
          `🔒 ပစ္စည်းပုံ ${currentPrivate.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါဦး။`
        );
      } else {
        await setDoc(
          stateRef,
          {
            step: "REUPLOAD_PRIVATE_VIDEO",
            data: {
              ...currentState.data,
              privatePhotos: currentPrivate,
              privateFileIds: currentPrivateIds,
            },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          "✅ ပစ္စည်းပုံ (၃) ပုံ ရရှိပါပြီ။\n\n🎬 ယခု စက္ကန့် ၆၀ အောက် <b>Video အတိုလေး</b> ပို့ပေးပါ ခင်ဗျာ -"
        );
      }
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "REUPLOAD_PRIVATE_VIDEO") {
      const isVideo = message && (message.video || message.document);
      if (!isVideo || photos.length === 0) {
        await sendMessage(
          chatId,
          "⚠️ ကျေးဇူးပြု၍ ၁ မိနစ်အောက် (20MB အောက်) Video ဖိုင်ကိုသာ ပို့ပေးပါ ခင်ဗျာ။"
        );
        return res.status(200).json({ status: "success" });
      }
      const stData = currentState.data;
      const targetBoyId = stData.targetBoyId;
      await updateDoc(doc(db, "dateboys", targetBoyId), {
        publicPhotos: stData.publicPhotos,
        publicPhoto: stData.publicPhotos[0] || "",
        publicFileIds: stData.publicFileIds || [],
        privatePhotos: stData.privatePhotos,
        privateFileIds: stData.privateFileIds || [],
        privateVideo: photos[0],
        privateVideoFileId: fileIdToForward,
      });
      await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
      await sendMessage(
        chatId,
        "🎉 ဓာတ်ပုံနှင့် Video များ အသစ်ပြန်လည်ပေးပို့မှု အောင်မြင်ပါသည်။ ကျေးဇူးတင်ပါသည် ခင်ဗျာ! 🙏",
        MAIN_MENU_KEYBOARD
      );

      if (adminChatId) {
        const boySnap = await getDoc(doc(db, "dateboys", targetBoyId));
        if (boySnap.exists()) {
          const updatedBoy = boySnap.data();
          const boyCode = `WLDB-${targetBoyId.substring(0, 5).toUpperCase()}`;
          const tgLink =
            updatedBoy.telegramProfileLink || `tg://user?id=${updatedBoy.telegramChatId || chatId}`;
          await sendMessage(
            adminChatId,
            `✅ <b>${escapeHTML(updatedBoy.name)} (${boyCode})</b> မှ ဓာတ်ပုံနှင့် Video များကို အသစ်ပြန်လည်ပေးပို့ပြီးပါပြီ!\n\n🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${tgLink}">💬 ${escapeHTML(updatedBoy.name)} နှင့် တိုက်ရိုက်စကားပြောရန် (ဒီကိုနှိပ်ပါ)</a>`
          );
          await sendCompanionMediaToChat(adminChatId, updatedBoy, targetBoyId, {
            includePublic: true,
            includePrivate: true,
            includeVideo: true,
          });
        }
      }
      return res.status(200).json({ status: "success" });
    }

    // Custom အကြောင်းရင်း တောင်းခံသည့်အဆင့်
    if (currentState.step === "WAIT_CUSTOM_REASON" && text && !text.startsWith("/")) {
      const { clientChatId, boyId, boyName, tgLink } = currentState.data;
      const reasonMsg = `❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို အောက်ပါအကြောင်းရင်းကြောင့် ပယ်ချလိုက်ပါသည် -\n\n👉 <b>${escapeHTML(text)}</b>`;

      await deleteDoc(doc(db, "dateboys", boyId));
      await handleUserRejection(clientChatId, reasonMsg, tgLink);
      await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
      await sendMessage(
        chatId,
        `✅ <b>${escapeHTML(boyName)}</b> အား Custom အကြောင်းရင်းဖြင့် ပယ်ချလိုက်ပါပြီ။`
      );
      return res.status(200).json({ status: "success" });
    }

    if (
      currentState.step === "CHOOSING_ROLE" ||
      text === "ROLE_CLIENT" ||
      text === "ROLE_APPLICANT"
    ) {
      if (text === "ROLE_CLIENT") {
        await setDoc(stateRef, { step: "ASK_CLIENT_ID", data: {} }, { merge: true });
        await sendMessage(
          chatId,
          "🔐 <b>Date Boy ရှာဖွေရန် Client ID လိုအပ်ပါသည်။</b>\n\nကျေးဇူးပြု၍ သင့်၏ လျှို့ဝှက် Client ID အား ရိုက်ထည့်ပါ (ဥပမာ - WLC-ABC12) -\n\n(Client ID မရှိသေးပါက အောက်ပါခလုတ်ကို နှိပ်၍ တောင်းဆိုနိုင်ပါသည်။)",
          {
            inline_keyboard: [
              [{ text: "💳 Admin အား Client ID တောင်းရန်", callback_data: "REQ_CLIENT_ID" }],
            ],
          }
        );
      } else if (text === "ROLE_APPLICANT") {
        if (currentState.banned === true) {
          await sendMessage(
            chatId,
            "🚨 <b>အသိပေးချက်:</b> သင့်အား စနစ်မှ (၃) ကြိမ်တိတိ ပယ်ချထားပြီးဖြစ်သောကြောင့် Date Boy အဖြစ် ထပ်မံလျှောက်ထားခွင့် မရှိတော့ပါ။",
            MAIN_MENU_KEYBOARD
          );
          return res.status(200).json({ status: "success" });
        }

        const config = await getAppConfig();
        await setDoc(stateRef, { step: "APPLICANT_REQUIREMENTS", data: {} }, { merge: true });
        await sendMessage(
          chatId,
          `📋 <b>Date Boy အဖြစ် လျှောက်ထားရန် လိုအပ်သည့်အချက်များ</b>\n\n${escapeHTML(config.reqText)}\n\nအထက်ပါ လိုအပ်ချက်များနှင့် ကိုက်ညီပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -`,
          {
            inline_keyboard: [
              [{ text: "✅ လိုအပ်သည့်အချက်များနှင့် ကိုက်ညီပါသည်", callback_data: "AGREE_REQ" }],
            ],
          }
        );
      }
      return res.status(200).json({ status: "success" });
    }

    if (text === "REQ_CLIENT_ID") {
      const config = await getAppConfig();
      await setDoc(stateRef, { step: "WAIT_CLIENT_ID_SS", data: {} }, { merge: true });
      await sendMessage(
        chatId,
        `💳 Client ID ရယူရန်အတွက် ကျသင့်ငွေမှာ <b>${config.clientIdFee} ကျပ်</b> ဖြစ်ပါသည်။\n\nအောက်ပါအကောင့်သို့ ငွေလွှဲပေးပါ -\n<code>${escapeHTML(config.paymentInfo)}</code>\n\n📸 ပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "WAIT_CLIENT_ID_SS" && photos.length > 0) {
      await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
      await sendMessage(
        chatId,
        "⏳ ငွေလွှဲပြေစာ ရရှိပါပြီ။ Admin မှ စစ်ဆေးပြီးပါက သင့်အတွက် လျှို့ဝှက် Client ID ကို ဤနေရာသို့ ပို့ပေးပါမည်။"
      );
      if (adminChatId) {
        const clientProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;
        const adminMsg = `🚨 <b>New Client ID Request</b> 🚨\n\nClient: <a href="${clientProfileLink}">Profile</a>\n\nClient မှ ID ဝယ်ယူရန် ငွေလွှဲပြေစာ ပို့ထားပါသည်။ အတည်ပြုပါက ID အလိုအလျောက် ထုတ်ပေးပါမည်။`;
        const keyboard = {
          inline_keyboard: [
            [
              { text: "✅ Approve & Generate ID", callback_data: `APP_C_${chatId}_X` },
              { text: "❌ Reject", callback_data: `REJ_C_${chatId}_X` },
            ],
          ],
        };
        await fetch(`${TELEGRAM_API}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminChatId,
            photo: fileIdToForward,
            caption: adminMsg,
            parse_mode: "HTML",
            reply_markup: keyboard,
          }),
        });
      }
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "ASK_CLIENT_ID" && text && !text.startsWith("/")) {
      await sendMessage(
        chatId,
        "⚠️ ကျေးဇူးပြု၍ မှန်ကန်သော Client ID (ဥပမာ- WLC-ABCDE) ကိုသာ ရိုက်ထည့်ပါ။ သို့မဟုတ် အောက်ပါခလုတ်ကိုနှိပ်၍ အသစ်ဝယ်ယူပါ။",
        {
          inline_keyboard: [
            [{ text: "💳 Admin အား Client ID တောင်းရန်", callback_data: "REQ_CLIENT_ID" }],
          ],
        }
      );
      return res.status(200).json({ status: "success" });
    }

    // ==========================================
    // 2️⃣ Applicant Info Entry Flow
    // ==========================================
    if (currentState.step === "APPLICANT_REQUIREMENTS" && text === "AGREE_REQ") {
      const config = await getAppConfig();
      await setDoc(stateRef, { step: "APPLICANT_RULES", data: {} }, { merge: true });
      await sendMessage(
        chatId,
        `⚖️ <b>Date Boy လျှောက်ထားခြင်းအတွက် စည်းမျဉ်းစည်းကမ်းများ</b>\n\n${escapeHTML(config.ruleText)}\n\nသဘောတူညီပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -`,
        {
          inline_keyboard: [
            [{ text: "✅ သဘောတူပါသည် (စတင်မည်)", callback_data: "AGREE_RULES" }],
          ],
        }
      );
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "APPLICANT_RULES" && text === "AGREE_RULES") {
      await setDoc(stateRef, { step: "GET_NAME", data: {} }, { merge: true });
      await sendMessage(chatId, "✍️ ကျေးဇူးပြု၍ သင့်ရဲ့ <b>အမည်</b> ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_NAME" && text) {
      await setDoc(
        stateRef,
        { step: "GET_AGE", data: { ...currentState.data, name: text } },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "🎂 ကျေးဇူးပြု၍ သင့်ရဲ့ <b>အသက်</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - ၂၅):"
      );
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_AGE" && text) {
      await setDoc(
        stateRef,
        { step: "GET_HEIGHT", data: { ...currentState.data, age: text } },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "📏 ကျေးဇူးပြု၍ သင့်ရဲ့ <b>အရပ်အမြင့်</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - 5' 9\"):"
      );
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_HEIGHT" && text) {
      await setDoc(
        stateRef,
        { step: "GET_COCK_SIZE", data: { ...currentState.data, height: text } },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "🍆 ကျေးဇူးပြု၍ သင့်ရဲ့ <b>အရွယ်အစား (Cock Size)</b> ကို လက်မဖြင့် ရိုက်ထည့်ပေးပါ (ဥပမာ - 6\"):"
      );
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_COCK_SIZE" && text) {
      await setDoc(
        stateRef,
        { step: "GET_PHONE", data: { ...currentState.data, cockSize: text } },
        { merge: true }
      );
      await sendMessage(chatId, "📞 ကျေးဇူးပြု၍ ဆက်သွယ်ရန် <b>ဖုန်းနံပါတ်</b> ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_PHONE" && text) {
      await setDoc(
        stateRef,
        { step: "GET_CITY", data: { ...currentState.data, phone: text } },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "🏙️ ကျေးဇူးပြု၍ လက်ရှိနေထိုင်ရာ <b>မြို့</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - မန္တလေး):"
      );
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_CITY" && text) {
      await setDoc(
        stateRef,
        { step: "GET_TOWNSHIP", data: { ...currentState.data, city: text } },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "📍 ကျေးဇူးပြု၍ နေထိုင်ရာ <b>မြို့နယ်</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - ချမ်းအေးသာစံ):"
      );
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_TOWNSHIP" && text) {
      await setDoc(
        stateRef,
        { step: "GET_ADDRESS", data: { ...currentState.data, township: text } },
        { merge: true }
      );
      await sendMessage(chatId, "🏠 ကျေးဇူးပြု၍ <b>နေရပ်လိပ်စာ အသေးစိတ်</b> ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_ADDRESS" && text) {
      await setDoc(
        stateRef,
        {
          step: "GET_PUBLIC_PHOTOS",
          data: {
            ...currentState.data,
            address: text,
            publicPhotos: [],
            publicFileIds: [],
          },
        },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "📸 ကျေးဇူးပြု၍ မျက်နှာသေချာမြင်ရသည့် <b>အလှဓာတ်ပုံ (၃) ပုံ</b> ကို တစ်ပုံချင်းစီ ပို့ပေးပါ\n\n(အခု ပထမဆုံးတစ်ပုံအရင်ပို့ပါ):"
      );
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_PUBLIC_PHOTOS") {
      const currentPublic = currentState.data.publicPhotos || [];
      const currentPublicIds = currentState.data.publicFileIds || [];
      if (photos.length > 0 && fileIdToForward) {
        currentPublic.push(...photos);
        currentPublicIds.push(fileIdToForward);
        await setDoc(
          stateRef,
          {
            step: "GET_PUBLIC_PHOTOS",
            data: {
              ...currentState.data,
              publicPhotos: currentPublic,
              publicFileIds: currentPublicIds,
            },
          },
          { merge: true }
        );
      }
      if (currentPublic.length < 3) {
        await sendMessage(
          chatId,
          `📸 အလှဓာတ်ပုံ ${currentPublic.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါဦး။`
        );
      } else {
        await setDoc(
          stateRef,
          {
            step: "GET_PRIVATE_PHOTOS",
            data: {
              ...currentState.data,
              publicPhotos: currentPublic,
              publicFileIds: currentPublicIds,
              privatePhotos: [],
              privateFileIds: [],
            },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          "✅ အလှဓာတ်ပုံ ၃ ပုံ ရရှိပါပြီ။\n\n🔒 ယခု အရွယ်အစား အမှန်အကန်ကို သေချာမြင်ရသော <b>ပစ္စည်းပုံ (Cock Photo) ၃ ပုံ</b> ကို တစ်ပုံချင်းစီ ပို့ပေးပါ။\n\n🔒(အခု ပထမဆုံးတစ်ပုံအရင်ပို့ပါ):"
        );
      }
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_PRIVATE_PHOTOS") {
      const currentPrivate = currentState.data.privatePhotos || [];
      const currentPrivateIds = currentState.data.privateFileIds || [];
      if (photos.length > 0 && fileIdToForward) {
        currentPrivate.push(...photos);
        currentPrivateIds.push(fileIdToForward);
        await setDoc(
          stateRef,
          {
            step: "GET_PRIVATE_PHOTOS",
            data: {
              ...currentState.data,
              privatePhotos: currentPrivate,
              privateFileIds: currentPrivateIds,
            },
          },
          { merge: true }
        );
      }
      if (currentPrivate.length < 3) {
        await sendMessage(
          chatId,
          `🔒 ပစ္စည်းပုံ ${currentPrivate.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါဦး။`
        );
      } else {
        await setDoc(
          stateRef,
          {
            step: "GET_PRIVATE_VIDEO",
            data: {
              ...currentState.data,
              privatePhotos: currentPrivate,
              privateFileIds: currentPrivateIds,
            },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          "✅ ပစ္စည်းပုံ (၃) ပုံ ရရှိပါပြီ။\n\n🎬 ယခု ထောင်မတ်နေသော ဆိုဒ်သေချာစွာခန့်မှန်းနိုင်မည့် ပစ္စည်းကို လက်နှင့်ကိုင်၍ စက္ကန့် ၆၀ စာ Video အတိုလေး ပို့ပေးပါ ခင်ဗျာ\n\n(မှတ်ချက် - ၁ မိနစ်ထက်ပိုသော Video ပို့လို့မရပါ):"
        );
      }
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "GET_PRIVATE_VIDEO") {
      const isVideo = message && (message.video || message.document);
      if (!isVideo) {
        await sendMessage(
          chatId,
          "⚠️ ကျေးဇူးပြု၍ Video ဖိုင် ကိုသာ ပို့ပေးပါ ခင်ဗျာ。\n\n(မှတ်ချက် - ၁ မိနစ်ထက်ပိုသော Video ပို့လို့မရပါ)"
        );
        return res.status(200).json({ status: "success" });
      }
      const videoData = message.video || message.document;
      if (videoData.duration && videoData.duration > 60) {
        await sendMessage(
          chatId,
          "⚠️ သင့် Video မှာ ၁ မိနစ်ထက် ကျော်လွန်နေပါသည်။\n\nကျေးဇူးပြု၍ စက္ကန့် ၆၀ အောက် Video အတိုလေးသာ ပြန်လည်ပေးပို့ပါ ခင်ဗျာ။"
        );
        return res.status(200).json({ status: "success" });
      }
      if (photos.length === 0) {
        await sendMessage(
          chatId,
          "⚠️ သင့် Video ဖိုင်အရွယ်အစားမှာ ကြီးမားလွန်းနေပါသည်။ (Telegram ကန့်သတ်ချက်အရ 20MB အောက်သာ ပို့နိုင်ပါသည်)\n\nကျေးဇူးပြု၍ File Size သေးငယ်သော (သို့) ၁ မိနစ်အောက် Video ကိုသာ ပြန်လည်ပေးပို့ပါ ခင်ဗျာ။"
        );
        return res.status(200).json({ status: "success" });
      }

      const applicantData = currentState.data;
      const privateVideoUrl = photos[0];
      const telegramProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;
      const locQuery = query(
        collection(db, "locations"),
        where("city", "==", applicantData.city),
        where("township", "==", applicantData.township)
      );
      const locSnap = await getDocs(locQuery);
      if (locSnap.empty) {
        await addDoc(collection(db, "locations"), {
          city: applicantData.city,
          township: applicantData.township,
          status: "pending",
        });
      }

      const finalData = {
        name: applicantData.name,
        age: applicantData.age,
        height: applicantData.height,
        cockSize: applicantData.cockSize,
        phone: applicantData.phone,
        city: applicantData.city,
        township: applicantData.township,
        address: applicantData.address,
        publicPhotos: applicantData.publicPhotos,
        publicPhoto: applicantData.publicPhotos?.[0] || "",
        publicFileIds: applicantData.publicFileIds || [],
        privatePhotos: applicantData.privatePhotos,
        privateFileIds: applicantData.privateFileIds || [],
        privateVideo: privateVideoUrl,
        privateVideoFileId: fileIdToForward,
        telegramChatId: chatId,
        telegramProfileLink: telegramProfileLink,
        status: "pending",
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "dateboys"), finalData);
      const boyCode = `WLDB-${docRef.id.substring(0, 5).toUpperCase()}`;

      if (adminChatId) {
        const publicLinks = processMediaLinks(applicantData.publicPhotos, "Public ပုံ", {
          baseUrl,
          boyId: docRef.id,
          mediaType: "public",
          fileIds: finalData.publicFileIds,
        });
        const privateLinks = processMediaLinks(applicantData.privatePhotos, "Private ပုံ", {
          baseUrl,
          boyId: docRef.id,
          mediaType: "private",
          fileIds: finalData.privateFileIds,
        });
        const videoLink = buildVideoLinkHtml(finalData, docRef.id, baseUrl);

        const adminMsg =
          `🚨 <b>New Date Boy Registration (${boyCode})</b> 🚨\n\n` +
          `🆔 <b>Code:</b> ${boyCode}\n` +
          `👤 <b>အမည်:</b> ${escapeHTML(finalData.name)}\n` +
          `🎂 <b>အသက်:</b> ${escapeHTML(finalData.age)} နှစ်\n` +
          `📏 <b>အရပ်:</b> ${escapeHTML(finalData.height)} | 🍆 <b>Size:</b> ${escapeHTML(finalData.cockSize)}\n` +
          `📞 <b>ဖုန်း:</b> ${escapeHTML(finalData.phone)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(finalData.township)}, ${escapeHTML(finalData.city)}\n` +
          `🏠 <b>လိပ်စာ အသေးစိတ်:</b> ${escapeHTML(finalData.address)}\n\n` +
          `📸 <b>Public:</b> ${publicLinks}\n` +
          `🔒 <b>Private:</b> ${privateLinks}\n` +
          `🎬 <b>Video:</b> ${videoLink}\n\n` +
          `🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${telegramProfileLink}">ဒီကိုနှိပ်ပါ</a>`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `APP_D_${chatId}_${docRef.id}` },
              { text: "❌ Reject", callback_data: `REJ_D_${chatId}_${docRef.id}` },
            ],
            [
              {
                text: "📸 ပုံ/Video များ Chat ထဲသို့ပို့ရန်",
                callback_data: `SEND_MEDIA_${docRef.id}`,
              },
            ],
          ],
        };
        await sendMessage(adminChatId, adminMsg, keyboard);

        // Also deliver native photos & video directly into Admin's Telegram chat
        await sendCompanionMediaToChat(adminChatId, finalData, docRef.id, {
          includePublic: true,
          includePrivate: true,
          includeVideo: true,
        });
      }
      await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
      await sendMessage(
        chatId,
        "🎉 အချက်အလက်ပေးပို့မှု အောင်မြင်စွာ ပြီးဆုံးပါပြီ။\n\nAdmin မှ ဆက်သွယ်လာတာကို စောင့်ဆိုင်းပေးပါ ခင်ဗျာ။ 🙏",
        MAIN_MENU_KEYBOARD
      );
      return res.status(200).json({ status: "success" });
    }

    // ==========================================
    // 3️⃣ Client Flow
    // ==========================================
    if (currentState.step === "CLIENT_SELECT_CITY" && text.startsWith("CITYIDX_")) {
      const cityIndex = parseInt(text.replace("CITYIDX_", ""));
      const selectedCity = currentState.data.availableCities[cityIndex];

      const q = query(
        collection(db, "dateboys"),
        where("status", "==", "approved"),
        where("city", "==", selectedCity)
      );
      const snap = await getDocs(q);
      const townships = [...new Set(snap.docs.map((d) => d.data().township))];

      const keyboard = townships.map((t, idx) => [
        { text: `📍 ${t}`, callback_data: `TSPIDX_${idx}` },
      ]);
      keyboard.unshift([{ text: "🌐 မြို့နယ်အားလုံးပြရန်", callback_data: `TSPIDX_ALL` }]);

      await setDoc(
        stateRef,
        {
          step: "CLIENT_SELECT_TOWNSHIP",
          data: { selectedCity: selectedCity, availableTownships: townships },
        },
        { merge: true }
      );
      await sendMessage(
        chatId,
        `🔍 ${escapeHTML(selectedCity)} တွင် ရှာဖွေလိုသော <b>မြို့နယ်</b> ကို ရွေးချယ်ပါ -`,
        { inline_keyboard: keyboard }
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "CLIENT_SELECT_TOWNSHIP" && text.startsWith("TSPIDX_")) {
      let q,
        titleMsg = "";
      const selectedCity = currentState.data.selectedCity;

      if (text === "TSPIDX_ALL") {
        q = query(
          collection(db, "dateboys"),
          where("status", "==", "approved"),
          where("city", "==", selectedCity)
        );
        titleMsg = `${selectedCity} (တစ်မြို့လုံး)`;
      } else {
        const tspIndex = parseInt(text.replace("TSPIDX_", ""));
        const selectedTownship = currentState.data.availableTownships[tspIndex];
        q = query(
          collection(db, "dateboys"),
          where("status", "==", "approved"),
          where("township", "==", selectedTownship)
        );
        titleMsg = selectedTownship;
      }

      const snap = await getDocs(q);
      if (snap.empty) {
        await sendMessage(
          chatId,
          `⚠️ ဤနေရာတွင် Date Boy မရှိသေးပါ။ /start ဖြင့် အခြားနေရာ ပြောင်းရှာပါ။`,
          MAIN_MENU_KEYBOARD
        );
      } else {
        await sendMessage(
          chatId,
          `✨ <b>${escapeHTML(titleMsg)}</b> တွင် ရရှိနိုင်သော Date Boy (${snap.size} ယောက်):`
        );
        for (const dDoc of snap.docs) {
          await sendDateBoyCard(chatId, dDoc.data(), dDoc.id, baseUrl);
        }
        await sendMessage(
          chatId,
          "🔄 ထပ်မံရှာဖွေလိုပါက အောက်ပါ Menu ကို အသုံးပြုပါ။",
          MAIN_MENU_KEYBOARD
        );
      }
      await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
      return res.status(200).json({ status: "success" });
    }

    if (text.startsWith("REQ_P_")) {
      const boyId = text.replace("REQ_P_", "");
      const config = await getAppConfig();
      await setDoc(stateRef, { step: "WAIT_PRIV_SS", data: { boyId } }, { merge: true });
      await sendMessage(
        chatId,
        `🔒 Private ပုံများ ကြည့်ရှုခွင့်အတွက် ကျသင့်ငွေမှာ <b>${config.privFee} ကျပ်</b> ဖြစ်ပါသည်။\n\n💳 အောက်ပါအကောင့်သို့ ငွေလွှဲပေးပါ -\n<code>${escapeHTML(config.paymentInfo)}</code>\n\n📸 ပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "WAIT_PRIV_SS" && photos.length > 0) {
      const boyId = currentState.data.boyId;
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
      await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
      await sendMessage(
        chatId,
        "⏳ ငွေလွှဲပြေစာ ရရှိပါပြီ။ Admin မှ စစ်ဆေးပြီးပါက Private ပုံများကို ဤနေရာသို့ ပို့ပေးပါမည်။"
      );
      if (adminChatId) {
        const clientProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;
        const adminMsg = `🚨 <b>Private Photo Request</b> 🚨\n\nCode: <b>${boyCode}</b>\nClient: <a href="${clientProfileLink}">Profile</a>\n\nClient မှ ငွေလွှဲပြေစာ ပို့ထားပါသည်။`;
        const keyboard = {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `APP_P_${chatId}_${boyId}` },
              { text: "❌ Reject", callback_data: `REJ_P_${chatId}_${boyId}` },
            ],
          ],
        };
        await fetch(`${TELEGRAM_API}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminChatId,
            photo: fileIdToForward,
            caption: adminMsg,
            parse_mode: "HTML",
            reply_markup: keyboard,
          }),
        });
      }
      return res.status(200).json({ status: "success" });
    }

    if (text.startsWith("REQ_H_")) {
      const boyId = text.replace("REQ_H_", "");
      const config = await getAppConfig();
      await setDoc(stateRef, { step: "WAIT_HIRE_SS", data: { boyId } }, { merge: true });
      await sendMessage(
        chatId,
        `❤️ Date Boy ခေါ်ယူခြင်းအတွက် ဈေးနှုန်းများမှာ အောက်ပါအတိုင်းဖြစ်ပါသည် -\n\n🕒 Section: ${config.feeSec} ကျပ်\n☀️ Day: ${config.feeDay} ကျပ်\n🌙 Night: ${config.feeNight} ကျပ်\n\n💳 Booking တင်ရန်အတွက် စရံငွေ (၅၀%) ကို အောက်ပါအကောင့်သို့ လွှဲပေးပါ -\n<code>${escapeHTML(config.paymentInfo)}</code>\n\n📸 ပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "WAIT_HIRE_SS" && photos.length > 0) {
      const boyId = currentState.data.boyId;
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
      await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
      await sendMessage(
        chatId,
        "⏳ Booking စရံ ငွေလွှဲပြေစာ ရရှိပါပြီ။ Admin မှ အတည်ပြုပြီးပါက အကြောင်းပြန်ပေးပါမည်။"
      );
      if (adminChatId) {
        const clientProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;
        const adminMsg = `🚨 <b>Dating Request (Booking)</b> 🚨\n\nDate Boy: <b>${boyCode}</b>\nClient: <a href="${clientProfileLink}">Profile</a>\n\nClient မှ Booking စရံပြေစာ ပို့ထားပါသည်။`;
        const keyboard = {
          inline_keyboard: [
            [
              { text: "✅ Approve Hire", callback_data: `APP_H_${chatId}_${boyId}` },
              { text: "❌ Reject", callback_data: `REJ_H_${chatId}_${boyId}` },
            ],
          ],
        };
        await fetch(`${TELEGRAM_API}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminChatId,
            photo: fileIdToForward,
            caption: adminMsg,
            parse_mode: "HTML",
            reply_markup: keyboard,
          }),
        });
      }
      return res.status(200).json({ status: "success" });
    }

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook Error Details:", error);
    if (globalChatId) {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: globalChatId,
          text: `⚠️ စနစ်ချို့ယွင်းမှုဖြစ်ပေါ်နေပါသည်။ ခဏစောင့်ပြီး ပြန်လည်ကြိုးစားကြည့်ပါ။\n\n[Error Info: ${error.message}]`,
        }),
      });
    }
    return res.status(200).json({ error: error.message });
  }
}
