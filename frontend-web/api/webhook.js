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
import {
  buildUnifiedLocationCatalog,
  getCitiesFromCatalog,
  getTownshipsForCity,
  addUniqueLocationToCatalog,
  locationExistsInCatalog,
  paginateLocationItems,
} from "../src/utils/myanmarLocations.js";
import {
  CLIENT_PREFERENCE_OPTIONS,
  GIRL_ONLY_REMINDER_MESSAGE,
  normalizeClientPreference,
  formatClientPreferenceLabel,
  formatClientPreferenceShortBadge,
} from "../src/utils/catalogLogic.js";

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

const DEFAULT_BOT_PACKAGES = [
  {
    id: "sec",
    icon: "🕒",
    title: "Section",
    nameMm: "Section (အချိန်ပိုင်း)",
    duration: "၂ နာရီ ~ ၃ နာရီ (1 Session)",
    price: 70000,
    description: "အချိန်တို သီးသန့်တွေ့ဆုံမှု (၁) ကြိမ် / Private Session",
    badge: "လူကြိုက်များသည်",
    enabled: true,
  },
  {
    id: "day",
    icon: "☀️",
    title: "Day",
    nameMm: "Day (နေ့ပိုင်း အချိန်ပြည့်)",
    duration: "နေ့ပိုင်း ၈ နာရီ (9:00 AM – 5:00 PM)",
    price: 300000,
    description: "နေ့ခင်းပိုင်း အပြင်သွား၊ စားသောက်၊ အပန်းဖြေ အဖော်လိုက်ပေးခြင်း",
    badge: "",
    enabled: true,
  },
  {
    id: "night",
    icon: "🌙",
    title: "Night",
    nameMm: "Night (ညပိုင်း / Overnight)",
    duration: "ညပိုင်း ၁၂ နာရီ / Overnight (8:00 PM – 8:00 AM)",
    price: 300000,
    description: "ညပိုင်း အချိန်ပြည့် သီးသန့် အဖော်လိုက်ပေးခြင်း (Overnight)",
    badge: "Best Value",
    enabled: true,
  },
];

function formatBotKyats(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) return "0";
  return Math.round(num).toLocaleString("en-US");
}

function normalizeBotAppConfig(raw = {}) {
  const safe = raw && typeof raw === "object" ? raw : {};
  const clientIdFee = Number.isFinite(Number(safe.clientIdFee))
    ? Math.max(0, Number(safe.clientIdFee))
    : 10000;
  const privFee = Number.isFinite(Number(safe.privFee))
    ? Math.max(0, Number(safe.privFee))
    : 10000;
  const feeSec = Number.isFinite(Number(safe.feeSec))
    ? Math.max(0, Number(safe.feeSec))
    : 70000;
  const feeDay = Number.isFinite(Number(safe.feeDay))
    ? Math.max(0, Number(safe.feeDay))
    : 300000;
  const feeNight = Number.isFinite(Number(safe.feeNight))
    ? Math.max(0, Number(safe.feeNight))
    : 300000;
  const pctRaw = Number(safe.depositPercent);
  const depositPercent =
    Number.isFinite(pctRaw) && pctRaw >= 0 && pctRaw <= 100 ? Math.round(pctRaw) : 50;

  let datingPackages = [];
  if (Array.isArray(safe.datingPackages) && safe.datingPackages.length > 0) {
    datingPackages = safe.datingPackages
      .filter((p) => p && typeof p === "object")
      .map((pkg, idx) => {
        const id = String(pkg.id || `pkg_${idx + 1}`).trim();
        const def = DEFAULT_BOT_PACKAGES.find((d) => d.id === id);
        const fallbackPrice =
          id === "sec"
            ? feeSec
            : id === "day"
              ? feeDay
              : id === "night"
                ? feeNight
                : def?.price || 100000;
        const priceNum = Number(pkg.price);
        return {
          id,
          icon: String(pkg.icon || def?.icon || "💎").trim(),
          title: String(pkg.title || def?.title || `Package ${idx + 1}`).trim(),
          nameMm: String(pkg.nameMm || pkg.title || def?.nameMm || `Package ${idx + 1}`).trim(),
          duration: String(pkg.duration || def?.duration || "သတ်မှတ်ချိန်အတိုင်း").trim(),
          price: Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum) : fallbackPrice,
          description: String(
            pkg.description !== undefined ? pkg.description : def?.description || ""
          ).trim(),
          badge: String(pkg.badge !== undefined ? pkg.badge : def?.badge || "").trim(),
          enabled: pkg.enabled !== false,
        };
      });
  } else {
    datingPackages = DEFAULT_BOT_PACKAGES.map((pkg) => ({
      ...pkg,
      price:
        pkg.id === "sec"
          ? feeSec
          : pkg.id === "day"
            ? feeDay
            : pkg.id === "night"
              ? feeNight
              : pkg.price,
    }));
  }

  const activePackages = datingPackages.filter((p) => p.enabled !== false);
  const paymentAccounts = Array.isArray(safe.paymentAccounts)
    ? safe.paymentAccounts.filter(
        (a) => a && a.enabled !== false && String(a.accountNumber || "").trim()
      )
    : [];

  return {
    ...safe,
    paymentInfo: String(safe.paymentInfo || "Admin ကိုဆက်သွယ်ပါ").trim(),
    clientIdFee,
    privFee,
    feeSec,
    feeDay,
    feeNight,
    depositPercent,
    datingPackages,
    activePackages: activePackages.length > 0 ? activePackages : datingPackages,
    paymentAccounts,
    reqText: safe.reqText || "၁။ အသက် ၂၁ နှစ်ပြည့်ပြီးသူ ဖြစ်ရပါမည်။",
    ruleText: safe.ruleText || "၁။ အမှန်တကယ် လုပ်ကိုင်လိုသူ ဖြစ်ရပါမည်။",
  };
}

function formatTelegramPaymentAccountsHtml(config) {
  if (Array.isArray(config?.paymentAccounts) && config.paymentAccounts.length > 0) {
    return config.paymentAccounts
      .map((acc) => {
        const method = escapeHTML(String(acc.method || "KPay").trim());
        const num = escapeHTML(String(acc.accountNumber || "").trim());
        const holder = String(acc.accountName || "").trim();
        return `• <b>${method}:</b> <code>${num}</code>${holder ? ` (${escapeHTML(holder)})` : ""}`;
      })
      .join("\n");
  }
  return `<code>${escapeHTML(config?.paymentInfo || "Admin ကိုဆက်သွယ်ပါ")}</code>`;
}

async function getAppConfig() {
  const cDoc = await getDoc(doc(db, "settings", "app_config"));
  return normalizeBotAppConfig(cDoc.exists() ? cDoc.data() : {});
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

async function editOrSendMessage(chatId, messageId, text, replyMarkup = null) {
  if (messageId) {
    try {
      const body = {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      };
      if (replyMarkup) body.reply_markup = replyMarkup;
      const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.ok) return data;
    } catch (err) {
      console.error("editMessageText fallback to sendMessage:", err);
    }
  }
  return await sendMessage(chatId, text, replyMarkup);
}

async function answerCallbackQuerySafe(callbackQueryId, text = "") {
  if (!callbackQueryId) return;
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
      }),
    });
  } catch (err) {
    console.error("answerCallbackQuery error:", err);
  }
}

/**
 * Loads the unified, unique Myanmar Cities & Townships master catalog from Firestore
 * (`settings/myanmar_locations` + approved `locations` docs, falling back to full 330-township master list).
 */
async function getActiveLocationCatalog() {
  try {
    const [masterSnap, approvedSnap] = await Promise.all([
      getDoc(doc(db, "settings", "myanmar_locations")),
      getDocs(query(collection(db, "locations"), where("status", "==", "approved"))),
    ]);
    const storedRegions = masterSnap.exists() ? masterSnap.data().regions : null;
    const approvedDocs = approvedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return buildUnifiedLocationCatalog(storedRegions, approvedDocs);
  } catch (err) {
    console.error("getActiveLocationCatalog fallback error:", err);
    return buildUnifiedLocationCatalog(null, []);
  }
}

function buildCityDropdownKeyboard(cities, page = 0) {
  const pageData = paginateLocationItems(cities, page, 10);
  const inline_keyboard = [];

  for (let i = 0; i < pageData.items.length; i += 2) {
    const row = [
      {
        text: `🏙️ ${pageData.items[i].label}`,
        callback_data: `REGCITY_S_${pageData.items[i].index}`,
      },
    ];
    if (pageData.items[i + 1]) {
      row.push({
        text: `🏙️ ${pageData.items[i + 1].label}`,
        callback_data: `REGCITY_S_${pageData.items[i + 1].index}`,
      });
    }
    inline_keyboard.push(row);
  }

  if (pageData.totalPages > 1) {
    const navRow = [];
    if (pageData.hasPrev) {
      navRow.push({
        text: `⬅️ ရှေ့စာမျက်နှာ`,
        callback_data: `REGCITY_P_${pageData.page - 1}`,
      });
    }
    navRow.push({
      text: `📄 ${pageData.page + 1}/${pageData.totalPages}`,
      callback_data: `REGCITY_P_${pageData.page}`,
    });
    if (pageData.hasNext) {
      navRow.push({
        text: `နောက်စာမျက်နှာ ➡️`,
        callback_data: `REGCITY_P_${pageData.page + 1}`,
      });
    }
    inline_keyboard.push(navRow);
  }

  inline_keyboard.push([
    {
      text: "➕ အခြားမြို့ (List ထဲမရှိပါက Request လုပ်မည်)",
      callback_data: "REGCITY_OTHER",
    },
  ]);

  return { inline_keyboard, pageData };
}

function buildTownshipDropdownKeyboard(townships, page = 0) {
  const pageData = paginateLocationItems(townships, page, 12);
  const inline_keyboard = [];

  for (let i = 0; i < pageData.items.length; i += 2) {
    const row = [
      {
        text: `📍 ${pageData.items[i].label}`,
        callback_data: `REGTWN_S_${pageData.items[i].index}`,
      },
    ];
    if (pageData.items[i + 1]) {
      row.push({
        text: `📍 ${pageData.items[i + 1].label}`,
        callback_data: `REGTWN_S_${pageData.items[i + 1].index}`,
      });
    }
    inline_keyboard.push(row);
  }

  if (pageData.totalPages > 1) {
    const navRow = [];
    if (pageData.hasPrev) {
      navRow.push({
        text: `⬅️ ရှေ့စာမျက်နှာ`,
        callback_data: `REGTWN_P_${pageData.page - 1}`,
      });
    }
    navRow.push({
      text: `📄 ${pageData.page + 1}/${pageData.totalPages}`,
      callback_data: `REGTWN_P_${pageData.page}`,
    });
    if (pageData.hasNext) {
      navRow.push({
        text: `နောက်စာမျက်နှာ ➡️`,
        callback_data: `REGTWN_P_${pageData.page + 1}`,
      });
    }
    inline_keyboard.push(navRow);
  }

  inline_keyboard.push([
    {
      text: "➕ အခြားမြို့နယ် (List ထဲမရှိပါက Request လုပ်မည်)",
      callback_data: "REGTWN_OTHER",
    },
  ]);
  inline_keyboard.push([
    {
      text: "⬅️ မြို့ပြန်ရွေးမည်",
      callback_data: "REGTWN_BACK_CITY",
    },
  ]);

  return { inline_keyboard, pageData };
}

function buildClientPreferenceKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "🌟 နှစ်ခုလုံး (Girl & LGBT နှစ်မျိုးလုံး အဆင်ပြေသည်)",
          callback_data: "REGPREF_BOTH",
        },
      ],
      [
        {
          text: "🏳️‍🌈 LGBT Only (LGBT သီးသန့်သာ လိုက်မည်)",
          callback_data: "REGPREF_LGBT",
        },
      ],
      [
        {
          text: "👩 Girl Only (အမျိုးသမီး သီးသန့်သာ လိုက်မည်)",
          callback_data: "REGPREF_GIRL",
        },
      ],
    ],
  };
}

function normalizeBookingClientType(rawType) {
  if (!rawType || typeof rawType !== "string") return "";
  const clean = rawType.trim().toLowerCase();
  if (
    clean === "girl" ||
    clean === "g" ||
    clean === "female" ||
    clean.includes("girl") ||
    clean.includes("အမျိုးသမီး")
  ) {
    return "girl";
  }
  if (clean === "lgbt" || clean === "l" || clean.includes("lgbt") || clean.includes("gay")) {
    return "lgbt";
  }
  return "";
}

function formatBookingClientTypeLabel(rawType) {
  const norm = normalizeBookingClientType(rawType);
  if (norm === "girl") return "👩 Girl (အမျိုးသမီး ဧည့်သည်)";
  if (norm === "lgbt") return "🏳️‍🌈 LGBT (LGBT ဧည့်သည်)";
  return "မဖော်ပြထားပါ (Unspecified)";
}

function formatBookingClientTypeShortBadge(rawType) {
  const norm = normalizeBookingClientType(rawType);
  if (norm === "girl") return "👩 Girl ဧည့်သည်";
  if (norm === "lgbt") return "🏳️‍🌈 LGBT ဧည့်သည်";
  return "ဧည့်သည်";
}

function isClientTypeCompatibleWithBoy(clientType, boyClientPreference) {
  const normClient = normalizeBookingClientType(clientType);
  const normBoyPref = normalizeClientPreference(boyClientPreference);
  if (!normClient) return true;
  if (normClient === "lgbt" && normBoyPref === "girl_only") return false;
  if (normClient === "girl" && normBoyPref === "lgbt_only") return false;
  return true;
}

const BURMESE_WEEKDAYS = [
  "တနင်္ဂနွေနေ့",
  "တနင်္လာနေ့",
  "အင်္ဂါနေ့",
  "ဗုဒ္ဓဟူးနေ့",
  "ကြာသပတေးနေ့",
  "သောကြာနေ့",
  "စနေနေ့",
];

const BURMESE_MONTHS = [
  "January (ဇန်နဝါရီ)",
  "February (ဖေဖော်ဝါရီ)",
  "March (မတ်)",
  "April (ဧပြီ)",
  "May (မေ)",
  "June (ဇွန်)",
  "July (ဇူလိုင်)",
  "August (ဩဂုတ်)",
  "September (စက်တင်ဘာ)",
  "October (အောက်တိုဘာ)",
  "November (နိုဝင်ဘာ)",
  "December (ဒီဇင်ဘာ)",
];

function getMyanmarTodayParts(nowMs = Date.now()) {
  const MMT_OFFSET_MS = (6 * 60 + 30) * 60 * 1000;
  const mmtNow = new Date(nowMs + MMT_OFFSET_MS);
  const year = mmtNow.getUTCFullYear();
  const month = mmtNow.getUTCMonth() + 1;
  const day = mmtNow.getUTCDate();

  const toIsoKey = (y, m, d) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  return {
    year,
    month,
    day,
    yearMonth: `${year}-${String(month).padStart(2, "0")}`,
    todayKey: toIsoKey(year, month, day),
    tomorrowKey: toIsoKey(year, month, day + 1),
    dayAfterTomorrowKey: toIsoKey(year, month, day + 2),
  };
}

function formatBurmeseBookingDateLabel(rawDate = "", nowMs = Date.now()) {
  const trimmed = String(rawDate || "").trim();
  if (!trimmed) return "";

  let year = 0;
  let month = 0;
  let day = 0;
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (dmyMatch) {
    day = Number(dmyMatch[1]);
    month = Number(dmyMatch[2]);
    year = Number(dmyMatch[3]);
  }

  if (year >= 2024 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
      dt.getUTCFullYear() === year &&
      dt.getUTCMonth() === month - 1 &&
      dt.getUTCDate() === day
    ) {
      const isoKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const weekdayMm = BURMESE_WEEKDAYS[dt.getUTCDay()] || "";
      const { todayKey, tomorrowKey, dayAfterTomorrowKey } = getMyanmarTodayParts(nowMs);
      let relativeSuffix = "";
      if (isoKey === todayKey) relativeSuffix = " · ယနေ့ (Today)";
      else if (isoKey === tomorrowKey) relativeSuffix = " · မနက်ဖြန် (Tomorrow)";
      else if (isoKey === dayAfterTomorrowKey) relativeSuffix = " · သန်ဘက်ခါ";
      return `${isoKey} (${weekdayMm}${relativeSuffix})`;
    }
  }

  return trimmed;
}

function formatBurmeseBookingTimeLabel(rawTime = "") {
  const trimmed = String(rawTime || "").trim();
  if (!trimmed) return "";
  if (/ASAP|အမြန်ဆုံး|ချက်ချင်း/i.test(trimmed)) {
    return "⚡ အမြန်ဆုံး / ချက်ချင်း (ASAP)";
  }

  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    const hr12 = Number(amPmMatch[1]);
    const min = amPmMatch[2];
    const period = amPmMatch[3].toUpperCase();
    const hr24 = period === "PM" ? (hr12 === 12 ? 12 : hr12 + 12) : hr12 === 12 ? 0 : hr12;
    const padded12 = `${String(hr12).padStart(2, "0")}:${min} ${period}`;

    let periodMm = "ညပိုင်း";
    if (hr24 >= 5 && hr24 < 12) periodMm = "နံနက်ပိုင်း";
    else if (hr24 >= 12 && hr24 < 16) periodMm = "နေ့လယ်ပိုင်း";
    else if (hr24 >= 16 && hr24 < 19) periodMm = "ညနေပိုင်း";

    return `${padded12} (${periodMm})`;
  }

  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hr24 = Number(h24Match[1]);
    const min = h24Match[2];
    if (hr24 >= 0 && hr24 <= 23) {
      const period = hr24 >= 12 ? "PM" : "AM";
      const hr12 = hr24 % 12 || 12;
      return formatBurmeseBookingTimeLabel(`${String(hr12).padStart(2, "0")}:${min} ${period}`);
    }
  }

  return trimmed;
}

function buildTelegramDatePickerKeyboard(
  targetYearMonth = "",
  nowMs = Date.now(),
  backCallbackData = ""
) {
  const { year: curYear, month: curMonth, todayKey, tomorrowKey, dayAfterTomorrowKey } =
    getMyanmarTodayParts(nowMs);

  let viewYear = curYear;
  let viewMonth = curMonth;
  const ymMatch = String(targetYearMonth || "").match(/^(\d{4})-(\d{1,2})$/);
  if (ymMatch) {
    const y = Number(ymMatch[1]);
    const m = Number(ymMatch[2]);
    if (y >= 2024 && y <= 2035 && m >= 1 && m <= 12) {
      viewYear = y;
      viewMonth = m;
    }
  }

  const prevDate = new Date(Date.UTC(viewYear, viewMonth - 2, 1));
  const nextDate = new Date(Date.UTC(viewYear, viewMonth, 1));
  const prevYm = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const nextYm = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const canGoPrev =
    viewYear > curYear || (viewYear === curYear && viewMonth > curMonth);

  const monthTitle = `${BURMESE_MONTHS[viewMonth - 1]} ${viewYear}`;
  const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

  const rows = [];

  rows.push([
    {
      text: `📌 ယနေ့ (${todayKey})`,
      callback_data: `HDATE_S_${todayKey}`,
    },
    {
      text: `🌤️ မနက်ဖြန် (${tomorrowKey})`,
      callback_data: `HDATE_S_${tomorrowKey}`,
    },
  ]);
  rows.push([
    {
      text: `📅 သန်ဘက်ခါ (${dayAfterTomorrowKey})`,
      callback_data: `HDATE_S_${dayAfterTomorrowKey}`,
    },
  ]);

  rows.push([
    {
      text: canGoPrev ? "◀️ ယခင်လ" : "·",
      callback_data: canGoPrev ? `HDATE_M_${prevYm}` : "HDATE_NOP",
    },
    {
      text: `🗓️ ${monthTitle}`,
      callback_data: "HDATE_NOP",
    },
    {
      text: "နောက်လ ▶️",
      callback_data: `HDATE_M_${nextYm}`,
    },
  ]);

  rows.push(
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((wd) => ({
      text: wd,
      callback_data: "HDATE_NOP",
    }))
  );

  let currentWeek = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ text: " ", callback_data: "HDATE_NOP" });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isoDate = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (isoDate < todayKey) {
      currentWeek.push({
        text: "·",
        callback_data: "HDATE_PAST",
      });
    } else if (isoDate === todayKey) {
      currentWeek.push({
        text: `[${d}]`,
        callback_data: `HDATE_S_${isoDate}`,
      });
    } else {
      currentWeek.push({
        text: String(d),
        callback_data: `HDATE_S_${isoDate}`,
      });
    }

    if (currentWeek.length === 7) {
      rows.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ text: " ", callback_data: "HDATE_NOP" });
    }
    rows.push(currentWeek);
  }

  rows.push([
    {
      text: "✍️ အခြားရက်စွဲ ကိုယ်တိုင်ရိုက်ထည့်မည်",
      callback_data: "HDATE_CUSTOM",
    },
  ]);

  if (backCallbackData) {
    rows.push([
      {
        text: "⬅️ Package Menu Card ပြန်ရွေးမည်",
        callback_data: backCallbackData,
      },
    ]);
  }

  return {
    year: viewYear,
    month: viewMonth,
    monthTitle,
    todayKey,
    tomorrowKey,
    inline_keyboard: rows,
  };
}

function buildTelegramTimePickerKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🌅 09:00 AM", callback_data: "HTIME_S_09:00 AM" },
        { text: "🌅 10:00 AM", callback_data: "HTIME_S_10:00 AM" },
        { text: "🌅 11:00 AM", callback_data: "HTIME_S_11:00 AM" },
      ],
      [
        { text: "☀️ 12:00 PM", callback_data: "HTIME_S_12:00 PM" },
        { text: "☀️ 01:00 PM", callback_data: "HTIME_S_01:00 PM" },
        { text: "☀️ 02:00 PM", callback_data: "HTIME_S_02:00 PM" },
      ],
      [
        { text: "🌤️ 03:00 PM", callback_data: "HTIME_S_03:00 PM" },
        { text: "🌤️ 04:00 PM", callback_data: "HTIME_S_04:00 PM" },
        { text: "🌤️ 05:00 PM", callback_data: "HTIME_S_05:00 PM" },
      ],
      [
        { text: "🌆 06:00 PM", callback_data: "HTIME_S_06:00 PM" },
        { text: "🌆 07:00 PM", callback_data: "HTIME_S_07:00 PM" },
        { text: "🌙 08:00 PM", callback_data: "HTIME_S_08:00 PM" },
      ],
      [
        { text: "🌙 09:00 PM", callback_data: "HTIME_S_09:00 PM" },
        { text: "🌙 10:00 PM", callback_data: "HTIME_S_10:00 PM" },
        { text: "🌙 11:00 PM", callback_data: "HTIME_S_11:00 PM" },
      ],
      [
        {
          text: "⚡ အမြန်ဆုံး / ချက်ချင်း (ASAP)",
          callback_data: "HTIME_S_ASAP",
        },
      ],
      [
        {
          text: "✍️ အခြားအချိန် စာရိုက်ထည့်မည် (ဥပမာ - 7:30 PM)",
          callback_data: "HTIME_CUSTOM",
        },
      ],
      [
        {
          text: "⬅️ ခေါ်ယူမည့် နေ့ရက် (Date) ပြန်ရွေးမည်",
          callback_data: "HDATE_OPEN",
        },
      ],
    ],
  };
}

/**
 * Handles approving or rejecting a Dating Request (Booking) from either Telegram Bot or Web Admin Panel,
 * notifying:
 *  1) The Date Boy (with the Client's Type: Girl or LGBT, Booking Ref, Schedule, Package, Notes)
 *  2) The Client (if Telegram Chat ID is available)
 *  3) The Admin Telegram Bot (confirmation + direct chat links)
 */
async function approveOrRejectDatingBooking({
  bookingId = "",
  clientChatId = "",
  boyId = "",
  clientType = "",
  isApprove = true,
  adminActor = "Admin",
  notifyAdminChatId = null,
}) {
  let bookingData = {};
  if (bookingId) {
    try {
      const bkSnap = await getDoc(doc(db, "bookings", String(bookingId)));
      if (bkSnap.exists()) {
        bookingData = bkSnap.data() || {};
      }
    } catch (e) {
      console.error("Error reading booking doc:", e);
    }
  }

  const resolvedBoyId = String(boyId || bookingData.dateBoyId || "").trim();
  const resolvedClientChatId = String(clientChatId || bookingData.clientChatId || "").trim();
  const resolvedClientType = normalizeBookingClientType(
    clientType || bookingData.clientType || ""
  );
  const clientTypeLabel = formatBookingClientTypeLabel(resolvedClientType);
  const clientTypeShort = formatBookingClientTypeShortBadge(resolvedClientType);

  let boyData = {};
  if (resolvedBoyId) {
    try {
      const boySnap = await getDoc(doc(db, "dateboys", resolvedBoyId));
      if (boySnap.exists()) {
        boyData = boySnap.data() || {};
      }
    } catch (e) {
      console.error("Error reading boy doc for booking:", e);
    }
  }

  const boyCode =
    bookingData.dateBoyCode ||
    (resolvedBoyId ? `WLDB-${resolvedBoyId.substring(0, 5).toUpperCase()}` : "WLDB-XXXXX");
  const boyName = boyData.name || bookingData.dateBoyName || "Date Boy";
  const boyCity = boyData.city || bookingData.dateBoyCity || "-";
  const boyTownship = boyData.township || bookingData.dateBoyTownship || "-";
  const boyPhone = boyData.phone || "-";
  const boyPrefLabel = formatClientPreferenceLabel(
    boyData.clientPreference || bookingData.dateBoyPreference
  );

  const boyChatId =
    boyData.telegramChatId ||
    bookingData.dateBoyChatId ||
    (typeof boyData.telegramProfileLink === "string"
      ? boyData.telegramProfileLink.match(/id=(\d+)/)?.[1]
      : null);
  const boyProfileLink =
    boyData.telegramProfileLink || (boyChatId ? `tg://user?id=${boyChatId}` : "");

  const bookingRef =
    bookingData.bookingRef ||
    `WL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const clientName = bookingData.clientName || "Telegram Client";
  const clientContact =
    bookingData.clientContact ||
    (resolvedClientChatId ? `tg://user?id=${resolvedClientChatId}` : "-");
  const clientProfileLink =
    bookingData.clientProfileLink ||
    (resolvedClientChatId && resolvedClientChatId !== "0"
      ? `tg://user?id=${resolvedClientChatId}`
      : "");
  const scheduleInfo =
    bookingData.preferredDate || bookingData.preferredTime
      ? `${bookingData.preferredDate || ""} ${bookingData.preferredTime ? "· " + bookingData.preferredTime : ""}`.trim()
      : "Admin မှ ဆက်သွယ်ညှိနှိုင်းပေးပါမည်";
  const packageTitleInfo = bookingData.packageName || bookingData.duration || "Standard Arrangement";
  const packageDurationInfo = bookingData.packageDuration || "";
  const packagePriceNum = Number(bookingData.packagePrice || 0);
  const depositAmountNum = Number(bookingData.depositAmount || 0);
  const priceLineHtml =
    packagePriceNum > 0
      ? `\n💰 <b>Package ဈေးနှုန်း:</b> <b>${formatBotKyats(packagePriceNum)} ကျပ်</b>${depositAmountNum > 0 ? ` (စရံ ${formatBotKyats(depositAmountNum)} ကျပ် ပေးသွင်းပြီး)` : ""}`
      : "";
  const durationLineHtml = packageDurationInfo
    ? `\n⏱️ <b>သတ်မှတ်ကြာချိန်:</b> <b>${escapeHTML(packageDurationInfo)}</b>`
    : "";
  const notesInfo = bookingData.notes || "-";

  if (bookingId) {
    try {
      await updateDoc(doc(db, "bookings", String(bookingId)), {
        status: isApprove ? "confirmed" : "rejected",
        ...(resolvedClientType ? { clientType: resolvedClientType } : {}),
        updatedAt: serverTimestamp(),
        processedBy: adminActor,
      });
    } catch (e) {
      console.error("Failed to update booking doc status:", e);
    }
  }

  let dateBoyNotified = false;
  let clientNotified = false;
  let adminNotified = false;

  if (isApprove) {
    // 1. Notify the Date Boy via Telegram Bot with the Client Type (Girl or LGBT) and selected Package Card!
    if (boyChatId && String(boyChatId) !== "0") {
      const boyNoticeMsg =
        `🎉 <b>Dating Request အသစ် ရရှိပါပြီ! (WE LINK Admin Approved)</b> 🎉\n\n` +
        `မင်္ဂလာပါ <b>${escapeHTML(boyName)} (${escapeHTML(boyCode)})</b> ခင်ဗျာ — သင့်အား ဧည့်သည်တစ်ဦးမှ ခေါ်ယူရန် Admin မှ အတည်ပြုပေးလိုက်ပါပြီ!\n\n` +
        `🔖 <b>Booking Ref:</b> <code>${escapeHTML(bookingRef)}</code>\n` +
        `👤 <b>ခေါ်ယူသူ ဧည့်သည်အမျိုးအစား (Client Type):</b> <b>${escapeHTML(clientTypeLabel)}</b>\n` +
        `📦 <b>ရွေးချယ်ထားသော Package:</b> <b>${escapeHTML(packageTitleInfo)}</b>` +
        durationLineHtml +
        priceLineHtml +
        `\n📍 <b>မြို့နယ်:</b> ${escapeHTML(boyTownship)}, ${escapeHTML(boyCity)}\n` +
        `📅 <b>ခေါ်ယူမည့် နေ့ရက် / အချိန်:</b> <b>${escapeHTML(scheduleInfo)}</b>\n` +
        `📝 <b>မှတ်ချက်:</b> ${escapeHTML(notesInfo)}\n\n` +
        `📞 <i>တွေ့ဆုံရမည့် နေရာနှင့် အချိန်အသေးစိတ်ကို WE LINK Admin မှ တိုက်ရိုက်ဆက်သွယ် ချိတ်ဆက်ပေးပါမည်။ အဆင်သင့်ပြင်ဆင်ထားပေးပါ ခင်ဗျာ။</i>`;

      const boySendRes = await sendMessage(boyChatId, boyNoticeMsg, MAIN_MENU_KEYBOARD);
      dateBoyNotified = Boolean(boySendRes?.ok);
    }

    // 2. Notify the Client via Telegram Bot (if clientChatId exists)
    if (resolvedClientChatId && resolvedClientChatId !== "0") {
      const clientApproveMsg =
        `✅ <b>ငွေပေးချေမှုနှင့် Dating Request အတည်ပြုပြီးပါပြီ! (${escapeHTML(bookingRef)})</b> 🎉\n\n` +
        `👤 <b>Date Boy:</b> <b>${escapeHTML(boyCode)}</b>\n` +
        `🧑‍💼 <b>သင်၏ ဧည့်သည်အမျိုးအစား:</b> <b>${escapeHTML(clientTypeLabel)}</b>\n` +
        `📦 <b>ရွေးချယ်ထားသော Package:</b> <b>${escapeHTML(packageTitleInfo)}</b>` +
        durationLineHtml +
        priceLineHtml +
        `\n📅 <b>ခေါ်ယူမည့် နေ့ရက် / အချိန်:</b> <b>${escapeHTML(scheduleInfo)}</b>` +
        `\n📍 <b>မြို့နယ်:</b> ${escapeHTML(boyTownship)}, ${escapeHTML(boyCity)}\n\n` +
        `✅ သက်ဆိုင်ရာ Date Boy (<b>${escapeHTML(boyCode)}</b>) ထံသို့ သင်၏ ဧည့်သည်အမျိုးအစား (<b>${escapeHTML(clientTypeShort)}</b>)၊ Package နှင့် ခေါ်ယူမည့် နေ့ရက်/အချိန် အချက်အလက်များကို အကြောင်းကြားပြီး ဖြစ်ပါသည်။ Admin မှ အသေးစိတ် ဆက်သွယ်ပေးပါမည်။`;
      const clientSendRes = await sendMessage(
        resolvedClientChatId,
        clientApproveMsg,
        MAIN_MENU_KEYBOARD
      );
      clientNotified = Boolean(clientSendRes?.ok);
    }

    // 3. Notify Admin Telegram Bot
    const targetAdminChat = notifyAdminChatId || (await getAdminChatId());
    if (targetAdminChat) {
      const boyNotiStatus = dateBoyNotified
        ? `✅ Date Boy (<b>${escapeHTML(boyName)}</b>) ၏ Telegram သို့ ဧည့်သည်အမျိုးအစား (<b>${escapeHTML(clientTypeShort)}</b>) နှင့်တကွ အကြောင်းကြားစာ ပေးပို့ပြီးပါပြီ။`
        : `⚠️ Date Boy (<b>${escapeHTML(boyName)}</b>) ထံသို့ Telegram Bot မှ တိုက်ရိုက်ပို့မရပါ (Website လျှောက်လွှာ သို့မဟုတ် Chat ID မရှိပါ — ဖုန်း <b>${escapeHTML(boyPhone)}</b> သို့ ဆက်သွယ်ပေးပါ)။`;

      const clientLinkHtml = clientProfileLink
        ? `\n🔗 <b>Client Telegram:</b> <a href="${clientProfileLink}">💬 Client နှင့် တိုက်ရိုက်စကားပြောရန်</a>`
        : "";
      const boyLinkHtml = boyProfileLink
        ? `\n🔗 <b>Date Boy Telegram:</b> <a href="${boyProfileLink}">💬 ${escapeHTML(boyName)} နှင့် တိုက်ရိုက်စကားပြောရန်</a>`
        : "";

      const adminConfirmMsg =
        `✅ <b>Dating Request အတည်ပြုပြီးပါပြီ (${escapeHTML(bookingRef)})</b>\n\n` +
        `🆔 <b>Date Boy:</b> ${escapeHTML(boyName)} (<b>${escapeHTML(boyCode)}</b>)\n` +
        `🎯 <b>Date Boy လက်ခံသော ဧည့်သည်:</b> ${escapeHTML(boyPrefLabel)}\n` +
        `📞 <b>Date Boy ဖုန်း:</b> ${escapeHTML(boyPhone)}\n` +
        `📍 <b>မြို့နယ်:</b> ${escapeHTML(boyTownship)}, ${escapeHTML(boyCity)}\n\n` +
        `👤 <b>ခေါ်ယူသူ ဧည့်သည်အမျိုးအစား (Client Type):</b> <b>${escapeHTML(clientTypeLabel)}</b>\n` +
        `🧑‍💼 <b>Client အမည်/ဆက်သွယ်ရန်:</b> ${escapeHTML(clientName)} (${escapeHTML(clientContact)})\n` +
        `📅 <b>ရက်စွဲ/အချိန်:</b> ${escapeHTML(scheduleInfo)}\n` +
        `📦 <b>Package:</b> ${escapeHTML(packageTitleInfo)}` +
        durationLineHtml +
        priceLineHtml +
        `\n🛡️ <b>အတည်ပြုသူ:</b> ${escapeHTML(adminActor)}` +
        clientLinkHtml +
        boyLinkHtml +
        `\n\n${boyNotiStatus}`;

      const admRes = await sendMessage(targetAdminChat, adminConfirmMsg);
      adminNotified = Boolean(admRes?.ok);
    }
  } else {
    // Reject flow
    if (resolvedClientChatId && resolvedClientChatId !== "0") {
      const rejectClientMsg = `❌ <b>${escapeHTML(boyCode)}</b> အား ခေါ်ယူရန် တောင်းဆိုချက် (${escapeHTML(bookingRef)}) ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ သို့မဟုတ် အချက်အလက် မမှန်ကန်ပါ။`;
      const cRes = await sendMessage(resolvedClientChatId, rejectClientMsg, MAIN_MENU_KEYBOARD);
      clientNotified = Boolean(cRes?.ok);
    }
    const targetAdminChat = notifyAdminChatId || (await getAdminChatId());
    if (targetAdminChat) {
      const admRes = await sendMessage(
        targetAdminChat,
        `❌ <b>${escapeHTML(boyCode)} (${escapeHTML(boyName)})</b> အတွက် Dating Request (<b>${escapeHTML(bookingRef)}</b> · ဧည့်သည်: <b>${escapeHTML(clientTypeShort)}</b>) ကို ပယ်ချလိုက်ပါပြီ။`
      );
      adminNotified = Boolean(admRes?.ok);
    }
  }

  return {
    bookingRef,
    boyCode,
    boyName,
    clientType: resolvedClientType,
    clientTypeLabel,
    dateBoyNotified,
    clientNotified,
    adminNotified,
  };
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
  const prefBadge = formatClientPreferenceShortBadge(boy.clientPreference);

  const caption = `👤 <b>Code:</b> ${boyCode}\n🎂 <b>အသက်:</b> ${escapeHTML(boy.age)} နှစ်\n📏 <b>အရပ်:</b> ${escapeHTML(boy.height)}\n🍆 <b>Size:</b> ${escapeHTML(boy.cockSize || "N/A")}\n🎯 <b>လက်ခံသော ဧည့်သည်:</b> ${escapeHTML(prefBadge)}\n📍 <b>နေရာ:</b> ${escapeHTML(boy.township)}, ${escapeHTML(boy.city)}${publicDisplay}`;
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
      const boyClientPref = formatClientPreferenceLabel(
        reqBody.boyClientPreference || boyData.clientPreference
      );
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
          `🎯 <b>လက်ခံသော ဧည့်သည်:</b> ${escapeHTML(boyClientPref)}\n` +
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
        const customLocNotice = reqBody.isCustomLocationRequest
          ? `\n\n📍 <b>မြို့/မြို့နယ်အသစ် Request ပါဝင်ပါသည်:</b> ${escapeHTML(boyData.township)}, ${escapeHTML(boyData.city)}\n<i>(Admin Panel -> Locations Tab တွင် သို့မဟုတ် အောက်ပါခလုတ်ဖြင့် အတည်ပြုနိုင်ပါသည်)</i>`
          : "";
        const prefLabel = formatClientPreferenceLabel(
          boyData.clientPreference || reqBody.clientPreference
        );

        const adminMsg =
          `🚨 <b>New Date Boy Registration (Website) — ${boyCode}</b> 🚨\n\n` +
          `🆔 <b>Code:</b> ${boyCode}\n` +
          `👤 <b>အမည်:</b> ${escapeHTML(boyData.name)}\n` +
          `🎂 <b>အသက်:</b> ${escapeHTML(boyData.age)} နှစ်\n` +
          `📏 <b>အရပ်:</b> ${escapeHTML(boyData.height)} | 🍆 <b>Size:</b> ${escapeHTML(boyData.cockSize || "N/A")}\n` +
          `🎯 <b>လက်ခံသော ဧည့်သည်:</b> ${escapeHTML(prefLabel)}\n` +
          `📞 <b>ဖုန်း:</b> ${escapeHTML(boyData.phone)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(boyData.township)}, ${escapeHTML(boyData.city)}\n` +
          `🏠 <b>လိပ်စာ အသေးစိတ်:</b> ${escapeHTML(boyData.address)}\n\n` +
          `📸 <b>Public:</b> ${publicLinks || "Web Admin တွင်ကြည့်ရန်"}\n` +
          `🔒 <b>Private:</b> ${privateLinks || "Web Admin တွင်ကြည့်ရန်"}\n\n` +
          `🌐 <i>Website (/register) မှ တိုက်ရိုက်လျှောက်ထားသူ ဖြစ်ပါသည်။</i>${customLocNotice}`;

        const inlineRows = [
          [
            { text: "✅ Approve", callback_data: `APP_D_0_${targetBoyId}` },
            { text: "❌ Reject", callback_data: `REJ_D_0_${targetBoyId}` },
          ],
        ];
        if (reqBody.locationRequestId) {
          inlineRows.push([
            {
              text: "📍 Approve Location (List ထဲထည့်မည်)",
              callback_data: `APPLOC_${reqBody.locationRequestId}`,
            },
            {
              text: "🗑️ Reject Location",
              callback_data: `REJLOC_${reqBody.locationRequestId}`,
            },
          ]);
        }

        await sendMessage(adminChatId, adminMsg, {
          inline_keyboard: inlineRows,
        });
      }
      return res.status(200).json({ status: "notified_admin" });
    }

    // Website / Booking Reservation -> Notify Admin Telegram Bot immediately with Client Type & Inline Approve/Reject
    if (reqBody.internal_action === "web_new_booking") {
      const adminChatId = await getAdminChatId();
      if (adminChatId) {
        const clientTypeLabel = formatBookingClientTypeLabel(reqBody.clientType);
        const boyPrefLabel = formatClientPreferenceLabel(reqBody.dateBoyPreference);
        const pkgName = reqBody.packageName || reqBody.duration || "-";
        const pkgDurationLine = reqBody.packageDuration
          ? `\n⏱️ <b>သတ်မှတ်ကြာချိန်:</b> ${escapeHTML(reqBody.packageDuration)}`
          : "";
        const pkgPriceNum = Number(reqBody.packagePrice || 0);
        const depNum = Number(reqBody.depositAmount || 0);
        const pkgPriceLine =
          pkgPriceNum > 0
            ? `\n💰 <b>ဈေးနှုန်း / စရံ:</b> <b>${formatBotKyats(pkgPriceNum)} Ks</b>${depNum > 0 ? ` (စရံ ${formatBotKyats(depNum)} Ks)` : ""}`
            : "";

        const msg =
          `🛎️ <b>New Web Concierge Reservation (${escapeHTML(reqBody.bookingRef || "WL-BOOKING")})</b>\n\n` +
          `👤 <b>Date Boy:</b> ${escapeHTML(reqBody.dateBoyName)} (<b>${escapeHTML(reqBody.dateBoyCode)}</b>)\n` +
          `🎯 <b>Date Boy လက်ခံသော ဧည့်သည်:</b> ${escapeHTML(boyPrefLabel)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(reqBody.dateBoyTownship)}, ${escapeHTML(reqBody.dateBoyCity)}\n\n` +
          `🧑‍💼 <b>ခေါ်ယူသူ ဧည့်သည်အမျိုးအစား (Client Type):</b> <b>${escapeHTML(clientTypeLabel)}</b>\n` +
          `👤 <b>Client အမည်:</b> ${escapeHTML(reqBody.clientName)}\n` +
          `📞 <b>ဆက်သွယ်ရန်:</b> ${escapeHTML(reqBody.clientContact)}\n` +
          `📅 <b>ရက်စွဲ/အချိန်:</b> ${escapeHTML(reqBody.preferredDate)} · ${escapeHTML(reqBody.preferredTime)}\n` +
          `📦 <b>Package:</b> <b>${escapeHTML(pkgName)}</b>` +
          pkgDurationLine +
          pkgPriceLine +
          `\n📝 <b>မှတ်ချက်:</b> ${escapeHTML(reqBody.notes || "-")}\n\n` +
          `<i>Approve နှိပ်လိုက်ပါက သက်ဆိုင်ရာ Date Boy ထံသို့ ဧည့်သည်အမျိုးအစား (${escapeHTML(formatBookingClientTypeShortBadge(reqBody.clientType))}) နှင့် Package အချက်အလက်များကို အလိုအလျောက် အကြောင်းကြားစာ ပေးပို့ပေးပါမည်။</i>`;

        const keyboard = reqBody.bookingId
          ? {
              inline_keyboard: [
                [
                  {
                    text: "✅ Approve & Date Boy ထံ ပို့မည်",
                    callback_data: `APP_HBK_${reqBody.bookingId}`,
                  },
                  {
                    text: "❌ Reject",
                    callback_data: `REJ_HBK_${reqBody.bookingId}`,
                  },
                ],
              ],
            }
          : null;

        await sendMessage(adminChatId, msg, keyboard);
      }
      return res.status(200).json({ status: "notified_admin" });
    }

    // Web Admin Panel Approve or Reject Dating Request (Booking) -> Notifies Date Boy (with Client Type), Client, and Admin Bot
    if (
      reqBody.internal_action === "web_admin_approve_booking" ||
      reqBody.internal_action === "web_admin_reject_booking"
    ) {
      const isApprove = reqBody.internal_action === "web_admin_approve_booking";
      const result = await approveOrRejectDatingBooking({
        bookingId: reqBody.bookingId || "",
        clientChatId: reqBody.clientChatId || "",
        boyId: reqBody.dateBoyId || reqBody.boyId || "",
        clientType: reqBody.clientType || "",
        isApprove,
        adminActor: reqBody.adminUsername || "Web Admin",
      });
      return res.status(200).json({
        status: isApprove ? "booking_approved" : "booking_rejected",
        ...result,
      });
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
      await answerCallbackQuerySafe(callback_query.id);
    }

    const callbackMessageId = callback_query?.message?.message_id || null;

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

    // Admin Location Request Approval / Rejection directly inside Telegram Bot
    if (text.startsWith("APPLOC_") || text.startsWith("REJLOC_")) {
      if (!adminChatId || chatId.toString() !== adminChatId.toString()) {
        await sendMessage(chatId, "⚠️ ဤလုပ်ဆောင်ချက်ကို Admin သာ အသုံးပြုနိုင်ပါသည်။");
        return res.status(200).json({ status: "ok" });
      }
      const isApprove = text.startsWith("APPLOC_");
      const locId = text.replace(/^APPLOC_|^REJLOC_/, "");
      const locSnap = await getDoc(doc(db, "locations", locId));
      if (!locSnap.exists()) {
        await sendMessage(chatId, "ℹ️ ဤမြို့/မြို့နယ် Request ကို စီမံပြီးသား (သို့မဟုတ်) ဖျက်ပြီးသား ဖြစ်ပါသည်။");
        return res.status(200).json({ status: "ok" });
      }
      const locData = locSnap.data();
      if (isApprove) {
        const currentCatalog = await getActiveLocationCatalog();
        const { catalog: updatedCatalog } = addUniqueLocationToCatalog(
          currentCatalog,
          locData.city,
          locData.township
        );
        await setDoc(
          doc(db, "settings", "myanmar_locations"),
          { regions: updatedCatalog, updatedAt: serverTimestamp() },
          { merge: true }
        );
        await updateDoc(doc(db, "locations", locId), {
          status: "approved",
          approvedAt: serverTimestamp(),
        });
        await sendMessage(
          chatId,
          `✅ <b>မြို့/မြို့နယ်အသစ် အတည်ပြုပြီးပါပြီ!</b>\n\n📍 <b>${escapeHTML(locData.township)}, ${escapeHTML(locData.city)}</b> ကို Master Dropdown စာရင်းထဲသို့ Unique အဖြစ် ထည့်သွင်းပြီးပါပြီ။`
        );
      } else {
        await deleteDoc(doc(db, "locations", locId));
        await sendMessage(
          chatId,
          `❌ <b>${escapeHTML(locData.township)}, ${escapeHTML(locData.city)}</b> Request ကို ပယ်ဖျက်လိုက်ပါပြီ။`
        );
      }
      return res.status(200).json({ status: "ok" });
    }

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
          `🎯 <b>လက်ခံသော ဧည့်သည်:</b> ${escapeHTML(formatClientPreferenceLabel(foundBoy.clientPreference))}\n` +
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

    if (text.startsWith("APP_HBK_") || text.startsWith("REJ_HBK_")) {
      const isApprove = text.startsWith("APP_HBK_");
      const bookingId = text.replace(/^APP_HBK_|^REJ_HBK_/, "");
      await approveOrRejectDatingBooking({
        bookingId,
        isApprove,
        adminActor: "Telegram Bot Admin",
        notifyAdminChatId: chatId,
      });
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
      } else if (action === "APP_H" || action === "REJ_H") {
        await approveOrRejectDatingBooking({
          bookingId: parts[5] || "",
          clientChatId,
          boyId,
          clientType: parts[4] || "",
          isApprove: action === "APP_H",
          adminActor: "Telegram Bot Admin",
          notifyAdminChatId: chatId,
        });
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
        `💳 <b>VIP Client ID ဝယ်ယူရန်</b>\n\n` +
          `💰 <b>ကျသင့်ငွေ:</b> <b>${formatBotKyats(config.clientIdFee)} ကျပ်</b>\n\n` +
          `🏦 <b>ငွေလွှဲရန် အကောင့်များ (နံပါတ်ကို နှိပ်၍ Copy ကူးနိုင်ပါသည်) -</b>\n` +
          `${formatTelegramPaymentAccountsHtml(config)}\n\n` +
          `📸 ငွေလွှဲပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`
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
        { step: "GET_CLIENT_PREFERENCE", data: { ...currentState.data, cockSize: text } },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "🎯 <b>လက်ခံလိုသော ဧည့်သည်အမျိုးအစား (Client Preference) ရွေးချယ်ရန်</b>\n\nGirl Only ပဲ လိုက်ချင်တာလား၊ LGBT Only ပဲ လိုက်ချင်တာလား၊ နှစ်ခုလုံး ဘာဖြစ်ဖြစ် အဆင်ပြေတာလားဆိုတာ အောက်ပါခလုတ်များထဲမှ တစ်ခုကို ရွေးချယ်ပေးပါ -\n\n<i>💡 မှတ်ချက် - <b>Girl Only</b> သီးသန့်ရွေးချယ်ပါက ဧည့်သည်ရရှိမှု နည်းပါးနိုင်ပါသည်။</i>",
        buildClientPreferenceKeyboard()
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "GET_CLIENT_PREFERENCE" && text) {
      if (text === "REGPREF_GIRL") {
        await setDoc(
          stateRef,
          {
            step: "CONFIRM_GIRL_ONLY_PREF",
            data: { ...currentState.data, clientPreference: "girl_only" },
          },
          { merge: true }
        );
        await editOrSendMessage(
          chatId,
          callbackMessageId,
          `⚠️ <b>အထူးသတိပေးချက် (Girl Only ရွေးချယ်ထားသူများအတွက်)</b>\n\n${escapeHTML(GIRL_ONLY_REMINDER_MESSAGE)}\n\nသိရှိနားလည်ပြီး Girl Only ဖြင့်သာ ဆက်လက်လျှောက်ထားလိုပါသလား (သို့မဟုတ်) နှစ်ခုလုံးသို့ ပြောင်းရွေးလိုပါသလား?`,
          {
            inline_keyboard: [
              [
                {
                  text: "🌟 နှစ်ခုလုံး (Girl & LGBT အဆင်ပြေသည်) သို့ ပြောင်းရွေးမည်",
                  callback_data: "REGPREF_BOTH",
                },
              ],
              [
                {
                  text: "✅ သိရှိပါသည် — Girl Only ဖြင့်သာ ဆက်လျှောက်မည်",
                  callback_data: "REGPREF_GIRL_CONFIRM",
                },
              ],
              [
                {
                  text: "🏳️‍🌈 LGBT Only သို့ ပြောင်းရွေးမည်",
                  callback_data: "REGPREF_LGBT",
                },
              ],
            ],
          }
        );
        return res.status(200).json({ status: "success" });
      }

      if (text === "REGPREF_BOTH" || text === "REGPREF_LGBT") {
        const chosenPref = text === "REGPREF_LGBT" ? "lgbt_only" : "both";
        const chosenLabel = formatClientPreferenceLabel(chosenPref);
        await setDoc(
          stateRef,
          {
            step: "GET_PHONE",
            data: { ...currentState.data, clientPreference: chosenPref },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          `✅ ရွေးချယ်ထားသော ဧည့်သည်အမျိုးအစား: <b>${escapeHTML(chosenLabel)}</b>\n\n📞 ကျေးဇူးပြု၍ ဆက်သွယ်ရန် <b>ဖုန်းနံပါတ်</b> ကို ရိုက်ထည့်ပေးပါ:`
        );
        return res.status(200).json({ status: "success" });
      }

      await sendMessage(
        chatId,
        "⚠️ ကျေးဇူးပြု၍ အောက်ပါ <b>ဧည့်သည်အမျိုးအစား ခလုတ် (၃) ခု</b> ထဲမှ တစ်ခုကို နှိပ်၍ ရွေးချယ်ပေးပါ -",
        buildClientPreferenceKeyboard()
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "CONFIRM_GIRL_ONLY_PREF" && text) {
      if (text === "REGPREF_GIRL_CONFIRM") {
        const chosenLabel = formatClientPreferenceLabel("girl_only");
        await setDoc(
          stateRef,
          {
            step: "GET_PHONE",
            data: { ...currentState.data, clientPreference: "girl_only" },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          `✅ ရွေးချယ်ထားသော ဧည့်သည်အမျိုးအစား: <b>${escapeHTML(chosenLabel)}</b>\n<i>(ဧည့်သည်ရရှိမှု နည်းပါးနိုင်ကြောင်း သတိပေးချက်ကို သိရှိအတည်ပြုပြီးဖြစ်ပါသည်)</i>\n\n📞 ကျေးဇူးပြု၍ ဆက်သွယ်ရန် <b>ဖုန်းနံပါတ်</b> ကို ရိုက်ထည့်ပေးပါ:`
        );
        return res.status(200).json({ status: "success" });
      }

      if (text === "REGPREF_BOTH" || text === "REGPREF_LGBT") {
        const chosenPref = text === "REGPREF_LGBT" ? "lgbt_only" : "both";
        const chosenLabel = formatClientPreferenceLabel(chosenPref);
        await setDoc(
          stateRef,
          {
            step: "GET_PHONE",
            data: { ...currentState.data, clientPreference: chosenPref },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          `✅ ရွေးချယ်ထားသော ဧည့်သည်အမျိုးအစား: <b>${escapeHTML(chosenLabel)}</b>\n\n📞 ကျေးဇူးပြု၍ ဆက်သွယ်ရန် <b>ဖုန်းနံပါတ်</b> ကို ရိုက်ထည့်ပေးပါ:`
        );
        return res.status(200).json({ status: "success" });
      }

      await sendMessage(
        chatId,
        "⚠️ ကျေးဇူးပြု၍ အထက်ပါ ခလုတ်များထဲမှ တစ်ခုကို နှိပ်၍ အတည်ပြုပေးပါ။"
      );
      return res.status(200).json({ status: "success" });
    }
    if (currentState.step === "GET_PHONE" && text) {
      const catalog = await getActiveLocationCatalog();
      const cities = getCitiesFromCatalog(catalog);
      const { inline_keyboard } = buildCityDropdownKeyboard(cities, 0);

      await setDoc(
        stateRef,
        {
          step: "GET_CITY",
          data: {
            ...currentState.data,
            phone: text,
            cityPage: 0,
            isCustomCity: false,
            isCustomLocationRequest: false,
          },
        },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "🏙️ ကျေးဇူးပြု၍ လက်ရှိနေထိုင်ရာ <b>မြို့ / တိုင်းဒေသကြီး</b> ကို အောက်ပါစာရင်းထဲမှ ရွေးချယ်ပေးပါ -\n\n<i>(စာရင်းထဲတွင် မပါဝင်မှသာ အောက်ဆုံးရှိ '➕ အခြားမြို့' ခလုတ်ကို နှိပ်၍ Request လုပ်ပါ)</i>",
        { inline_keyboard }
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "GET_CITY" && text) {
      const catalog = await getActiveLocationCatalog();
      const cities = getCitiesFromCatalog(catalog);

      if (text.startsWith("REGCITY_P_")) {
        const nextPage = parseInt(text.replace("REGCITY_P_", ""), 10) || 0;
        const { inline_keyboard } = buildCityDropdownKeyboard(cities, nextPage);
        await setDoc(
          stateRef,
          { step: "GET_CITY", data: { ...currentState.data, cityPage: nextPage } },
          { merge: true }
        );
        await editOrSendMessage(
          chatId,
          callbackMessageId,
          "🏙️ ကျေးဇူးပြု၍ လက်ရှိနေထိုင်ရာ <b>မြို့ / တိုင်းဒေသကြီး</b> ကို အောက်ပါစာရင်းထဲမှ ရွေးချယ်ပေးပါ -\n\n<i>(စာရင်းထဲတွင် မပါဝင်မှသာ အောက်ဆုံးရှိ '➕ အခြားမြို့' ခလုတ်ကို နှိပ်၍ Request လုပ်ပါ)</i>",
          { inline_keyboard }
        );
        return res.status(200).json({ status: "success" });
      }

      if (text === "REGCITY_OTHER") {
        await setDoc(
          stateRef,
          {
            step: "GET_CUSTOM_CITY",
            data: { ...currentState.data, isCustomCity: true, isCustomLocationRequest: true },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          "✍️ စာရင်းထဲတွင် မပါဝင်သော <b>မြို့အမည်</b> ကို ရိုက်ထည့်ပေးပါ -\n\n<i>(Admin ထံသို့ မြို့အသစ်အဖြစ် Request ပေးပို့ပေးပါမည်)</i>"
        );
        return res.status(200).json({ status: "success" });
      }

      if (text.startsWith("REGCITY_S_")) {
        const cityIdx = parseInt(text.replace("REGCITY_S_", ""), 10);
        const selectedCity = cities[cityIdx];
        if (!selectedCity) {
          const { inline_keyboard } = buildCityDropdownKeyboard(cities, 0);
          await sendMessage(chatId, "⚠️ ကျေးဇူးပြု၍ မြို့ကို ပြန်လည်ရွေးချယ်ပေးပါ -", {
            inline_keyboard,
          });
          return res.status(200).json({ status: "success" });
        }

        const townships = getTownshipsForCity(catalog, selectedCity);
        if (townships.length === 0) {
          await setDoc(
            stateRef,
            {
              step: "GET_CUSTOM_TOWNSHIP",
              data: {
                ...currentState.data,
                city: selectedCity,
                isCustomCity: false,
                isCustomLocationRequest: true,
              },
            },
            { merge: true }
          );
          await sendMessage(
            chatId,
            `✍️ <b>${escapeHTML(selectedCity)}</b> ၏ <b>မြို့နယ်အမည်</b> ကို ရိုက်ထည့်ပေးပါ (Admin ထံသို့ Request ပေးပို့ပေးပါမည်):`
          );
          return res.status(200).json({ status: "success" });
        }

        const { inline_keyboard } = buildTownshipDropdownKeyboard(townships, 0);
        await setDoc(
          stateRef,
          {
            step: "GET_TOWNSHIP",
            data: {
              ...currentState.data,
              city: selectedCity,
              isCustomCity: false,
              tspPage: 0,
            },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          `✅ ရွေးချယ်ထားသော မြို့: <b>${escapeHTML(selectedCity)}</b>\n\n📍 ကျေးဇူးပြု၍ နေထိုင်ရာ <b>မြို့နယ်</b> ကို အောက်ပါစာရင်းထဲမှ ရွေးချယ်ပေးပါ -\n\n<i>(စာရင်းထဲတွင် မပါဝင်မှသာ '➕ အခြားမြို့နယ်' ခလုတ်ကို နှိပ်၍ Request လုပ်ပါ)</i>`,
          { inline_keyboard }
        );
        return res.status(200).json({ status: "success" });
      }

      // User typed free text instead of picking from dropdown buttons -> gently guide them
      const { inline_keyboard } = buildCityDropdownKeyboard(cities, currentState.data.cityPage || 0);
      await sendMessage(
        chatId,
        "⚠️ ကျေးဇူးပြု၍ မြို့အမည်ကို စာရိုက်မထည့်ဘဲ အောက်ပါ <b>မြို့စာရင်းခလုတ်များ</b> ထဲမှ ရွေးချယ်ပေးပါ။\n\n<i>(စာရင်းထဲတွင် မပါဝင်မှသာ '➕ အခြားမြို့' ခလုတ်ကို နှိပ်၍ ရိုက်ထည့်နိုင်ပါသည်)</i>",
        { inline_keyboard }
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "GET_CUSTOM_CITY" && text) {
      const customCity = text.trim();
      await setDoc(
        stateRef,
        {
          step: "GET_CUSTOM_TOWNSHIP",
          data: {
            ...currentState.data,
            city: customCity,
            isCustomCity: true,
            isCustomLocationRequest: true,
          },
        },
        { merge: true }
      );
      await sendMessage(
        chatId,
        `✍️ <b>${escapeHTML(customCity)}</b> ရှိ နေထိုင်ရာ <b>မြို့နယ်အမည်</b> ကို ရိုက်ထည့်ပေးပါ -\n\n<i>(Admin ထံသို့ မြို့/မြို့နယ်အသစ် Request အဖြစ် ပေးပို့ပေးပါမည်)</i>`
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "GET_TOWNSHIP" && text) {
      const catalog = await getActiveLocationCatalog();
      const selectedCity = currentState.data.city || "";
      const townships = getTownshipsForCity(catalog, selectedCity);

      if (text === "REGTWN_BACK_CITY") {
        const cities = getCitiesFromCatalog(catalog);
        const { inline_keyboard } = buildCityDropdownKeyboard(cities, currentState.data.cityPage || 0);
        await setDoc(
          stateRef,
          { step: "GET_CITY", data: { ...currentState.data, city: "" } },
          { merge: true }
        );
        await editOrSendMessage(
          chatId,
          callbackMessageId,
          "🏙️ ကျေးဇူးပြု၍ လက်ရှိနေထိုင်ရာ <b>မြို့ / တိုင်းဒေသကြီး</b> ကို ပြန်လည်ရွေးချယ်ပေးပါ -",
          { inline_keyboard }
        );
        return res.status(200).json({ status: "success" });
      }

      if (text.startsWith("REGTWN_P_")) {
        const nextPage = parseInt(text.replace("REGTWN_P_", ""), 10) || 0;
        const { inline_keyboard } = buildTownshipDropdownKeyboard(townships, nextPage);
        await setDoc(
          stateRef,
          { step: "GET_TOWNSHIP", data: { ...currentState.data, tspPage: nextPage } },
          { merge: true }
        );
        await editOrSendMessage(
          chatId,
          callbackMessageId,
          `✅ ရွေးချယ်ထားသော မြို့: <b>${escapeHTML(selectedCity)}</b>\n\n📍 ကျေးဇူးပြု၍ နေထိုင်ရာ <b>မြို့နယ်</b> ကို အောက်ပါစာရင်းထဲမှ ရွေးချယ်ပေးပါ -`,
          { inline_keyboard }
        );
        return res.status(200).json({ status: "success" });
      }

      if (text === "REGTWN_OTHER") {
        await setDoc(
          stateRef,
          {
            step: "GET_CUSTOM_TOWNSHIP",
            data: { ...currentState.data, isCustomLocationRequest: true },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          `✍️ <b>${escapeHTML(selectedCity)}</b> တွင် စာရင်းထဲမပါဝင်သော <b>မြို့နယ်အမည်</b> ကို ရိုက်ထည့်ပေးပါ -\n\n<i>(Admin ထံသို့ မြို့နယ်အသစ် Request အဖြစ် ပေးပို့ပေးပါမည်)</i>`
        );
        return res.status(200).json({ status: "success" });
      }

      if (text.startsWith("REGTWN_S_")) {
        const tspIdx = parseInt(text.replace("REGTWN_S_", ""), 10);
        const selectedTownship = townships[tspIdx];
        if (!selectedTownship) {
          const { inline_keyboard } = buildTownshipDropdownKeyboard(townships, 0);
          await sendMessage(chatId, "⚠️ ကျေးဇူးပြု၍ မြို့နယ်ကို ပြန်လည်ရွေးချယ်ပေးပါ -", {
            inline_keyboard,
          });
          return res.status(200).json({ status: "success" });
        }

        await setDoc(
          stateRef,
          {
            step: "GET_ADDRESS",
            data: {
              ...currentState.data,
              township: selectedTownship,
              isCustomLocationRequest: false,
            },
          },
          { merge: true }
        );
        await sendMessage(
          chatId,
          `✅ ရွေးချယ်ထားသော နေရာ: <b>${escapeHTML(selectedTownship)}, ${escapeHTML(selectedCity)}</b>\n\n🏠 ကျေးဇူးပြု၍ <b>နေရပ်လိပ်စာ အသေးစိတ်</b> ကို ရိုက်ထည့်ပေးပါ:`
        );
        return res.status(200).json({ status: "success" });
      }

      // User typed free text instead of picking a township button
      const { inline_keyboard } = buildTownshipDropdownKeyboard(
        townships,
        currentState.data.tspPage || 0
      );
      await sendMessage(
        chatId,
        `⚠️ ကျေးဇူးပြု၍ မြို့နယ်ကို စာရိုက်မထည့်ဘဲ အောက်ပါ <b>${escapeHTML(selectedCity)} မြို့နယ်စာရင်းခလုတ်များ</b> ထဲမှ ရွေးချယ်ပေးပါ။\n\n<i>(စာရင်းထဲတွင် မပါဝင်မှသာ '➕ အခြားမြို့နယ်' ခလုတ်ကို နှိပ်၍ Request လုပ်နိုင်ပါသည်)</i>`,
        { inline_keyboard }
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "GET_CUSTOM_TOWNSHIP" && text) {
      const customTownship = text.trim();
      const targetCity = (currentState.data.city || "").trim();
      const catalog = await getActiveLocationCatalog();

      let createdLocId = null;
      if (targetCity && customTownship && !locationExistsInCatalog(catalog, targetCity, customTownship)) {
        const existingLocSnap = await getDocs(
          query(
            collection(db, "locations"),
            where("city", "==", targetCity),
            where("township", "==", customTownship)
          )
        );
        if (existingLocSnap.empty) {
          const locRef = await addDoc(collection(db, "locations"), {
            city: targetCity,
            township: customTownship,
            status: "pending",
            requestedBy: currentState.data.name || "Telegram Applicant",
            requestedPhone: currentState.data.phone || "",
            requestedVia: "telegram_bot",
            requesterChatId: chatId,
            createdAt: serverTimestamp(),
          });
          createdLocId = locRef.id;
        }
      }

      if (adminChatId && createdLocId) {
        const locReqMsg =
          `📍 <b>မြို့/မြို့နယ်အသစ် Request အသစ် (Telegram Bot)</b>\n\n` +
          `🏙️ <b>မြို့:</b> ${escapeHTML(targetCity)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(customTownship)}\n` +
          `👤 <b>တောင်းဆိုသူ:</b> ${escapeHTML(currentState.data.name || "Applicant")} (${escapeHTML(currentState.data.phone || "-")})\n\n` +
          `<i>Approve နှိပ်လိုက်ပါက Dropdown Master စာရင်းထဲသို့ Unique အဖြစ် အလိုအလျောက် ထည့်သွင်းပေးပါမည်။</i>`;

        await sendMessage(adminChatId, locReqMsg, {
          inline_keyboard: [
            [
              { text: "✅ Approve & List ထဲထည့်မည်", callback_data: `APPLOC_${createdLocId}` },
              { text: "❌ Reject", callback_data: `REJLOC_${createdLocId}` },
            ],
          ],
        });
      }

      await setDoc(
        stateRef,
        {
          step: "GET_ADDRESS",
          data: {
            ...currentState.data,
            township: customTownship,
            isCustomLocationRequest: true,
          },
        },
        { merge: true }
      );
      await sendMessage(
        chatId,
        `📩 <b>${escapeHTML(customTownship)}, ${escapeHTML(targetCity)}</b> ကို Admin ထံသို့ မြို့/မြို့နယ်အသစ် Request ပေးပို့ထားပြီးပါပြီ။\n\n🏠 ယခု <b>နေရပ်လိပ်စာ အသေးစိတ်</b> ကို ဆက်လက်ရိုက်ထည့်ပေးပါ:`
      );
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
      const activeCatalog = await getActiveLocationCatalog();
      if (!locationExistsInCatalog(activeCatalog, applicantData.city, applicantData.township)) {
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
            requestedBy: applicantData.name || "Telegram Applicant",
            requestedPhone: applicantData.phone || "",
            requestedVia: "telegram_bot",
            requesterChatId: chatId,
            createdAt: serverTimestamp(),
          });
        }
      }

      const finalClientPreference = normalizeClientPreference(applicantData.clientPreference);
      const finalData = {
        name: applicantData.name,
        age: applicantData.age,
        height: applicantData.height,
        cockSize: applicantData.cockSize,
        clientPreference: finalClientPreference,
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
        const prefLabel = formatClientPreferenceLabel(finalClientPreference);

        const adminMsg =
          `🚨 <b>New Date Boy Registration (${boyCode})</b> 🚨\n\n` +
          `🆔 <b>Code:</b> ${boyCode}\n` +
          `👤 <b>အမည်:</b> ${escapeHTML(finalData.name)}\n` +
          `🎂 <b>အသက်:</b> ${escapeHTML(finalData.age)} နှစ်\n` +
          `📏 <b>အရပ်:</b> ${escapeHTML(finalData.height)} | 🍆 <b>Size:</b> ${escapeHTML(finalData.cockSize)}\n` +
          `🎯 <b>လက်ခံသော ဧည့်သည်:</b> ${escapeHTML(prefLabel)}\n` +
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
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
      const config = await getAppConfig();
      await setDoc(stateRef, { step: "WAIT_PRIV_SS", data: { boyId } }, { merge: true });
      await sendMessage(
        chatId,
        `🔒 <b>${boyCode} ၏ Private ပုံနှင့် Video များ ကြည့်ရှုခွင့်</b>\n\n` +
          `💰 <b>ကျသင့်ငွေ:</b> <b>${formatBotKyats(config.privFee)} ကျပ်</b>\n\n` +
          `🏦 <b>ငွေလွှဲရန် အကောင့်များ (နံပါတ်ကို နှိပ်၍ Copy ကူးနိုင်ပါသည်) -</b>\n` +
          `${formatTelegramPaymentAccountsHtml(config)}\n\n` +
          `📸 ငွေလွှဲပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`
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
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
      const boySnap = await getDoc(doc(db, "dateboys", boyId));
      const boyData = boySnap.exists() ? boySnap.data() : {};
      const boyPrefLabel = formatClientPreferenceLabel(boyData.clientPreference);

      await setDoc(
        stateRef,
        {
          step: "HIRE_SELECT_CLIENT_TYPE",
          data: { ...(currentState.data || {}), boyId },
        },
        { merge: true }
      );
      await sendMessage(
        chatId,
        `❤️ <b>Date Boy (${boyCode}) အား ခေါ်ယူရန် (Dating Request)</b>\n` +
          `🎯 <b>ဤ Date Boy လက်ခံသော ဧည့်သည်:</b> ${escapeHTML(boyPrefLabel)}\n\n` +
          `👤 <b>အဆင့် (၁) - သင်သည် မည်သည့် ဧည့်သည်အမျိုးအစား (Girl သို့မဟုတ် LGBT) ဖြစ်ပါသလဲ?</b>\n` +
          `<i>(Request တင်ချိန်တွင် Admin ဖက်၌လည်းကောင်း၊ Admin မှ Approve ပေးလိုက်သည့်အခါ Date Boy ဆီသို့လည်းကောင်း သင်၏ ဧည့်သည်အမျိုးအစားကို တစ်ခါတည်း အသိပေးပြသသွားမည်ဖြစ်ပါသဖြင့် အရင်ဆုံး ရွေးချယ်ပေးပါ)</i>`,
        {
          inline_keyboard: [
            [
              {
                text: "👩 Girl (အမျိုးသမီး ဧည့်သည် ဖြစ်ပါသည်)",
                callback_data: `HIRTYPE_G_${boyId}`,
              },
            ],
            [
              {
                text: "🏳️‍🌈 LGBT (LGBT ဧည့်သည် ဖြစ်ပါသည်)",
                callback_data: `HIRTYPE_L_${boyId}`,
              },
            ],
          ],
        }
      );
      return res.status(200).json({ status: "success" });
    }

    if (text.startsWith("HIRTYPE_") || text.startsWith("HIRFORCE_")) {
      const isForce = text.startsWith("HIRFORCE_");
      const rawPayload = text.replace(/^HIRTYPE_|^HIRFORCE_/, ""); // e.g. G_<boyId> or L_<boyId>
      const typeCode = rawPayload.substring(0, 1); // 'G' or 'L'
      const boyId = rawPayload.substring(2);
      const chosenClientType = typeCode === "G" ? "girl" : "lgbt";
      const clientTypeLabel = formatBookingClientTypeLabel(chosenClientType);
      const clientTypeShort = formatBookingClientTypeShortBadge(chosenClientType);

      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
      const boySnap = await getDoc(doc(db, "dateboys", boyId));
      const boyData = boySnap.exists() ? boySnap.data() : {};
      const boyPrefLabel = formatClientPreferenceLabel(boyData.clientPreference);

      if (!isForce && !isClientTypeCompatibleWithBoy(chosenClientType, boyData.clientPreference)) {
        await sendMessage(
          chatId,
          `⚠️ <b>ဧည့်သည်အမျိုးအစား သတိပေးချက် (${boyCode})</b>\n\n` +
            `ဤ Date Boy (<b>${boyCode}</b>) သည် <b>${escapeHTML(boyPrefLabel)}</b> သာ လက်ခံမည်ဟု သတ်မှတ်ထားသူ ဖြစ်ပါသည်။\n\n` +
            `သင်ရွေးချယ်ထားသော ဧည့်သည်အမျိုးအစားမှာ <b>${escapeHTML(clientTypeLabel)}</b> ဖြစ်နေပါသဖြင့် အခြားကိုက်ညီသော Date Boy ကို ပြောင်းလဲရှာဖွေနိုင်ပါသည် (သို့မဟုတ် Admin မှတစ်ဆင့် ညှိနှိုင်းတောင်းဆိုလိုပါက အောက်ပါခလုတ်ကို နှိပ်ပါ) -`,
          {
            inline_keyboard: [
              [{ text: "🔄 အခြား Date Boy ပြန်ရှာမည်", callback_data: "ROLE_CLIENT" }],
              [
                {
                  text: `➡️ သိရှိပါသည် — ${clientTypeShort} အဖြစ် ဆက်လက်ခေါ်ယူမည်`,
                  callback_data: `HIRFORCE_${typeCode}_${boyId}`,
                },
              ],
            ],
          }
        );
        return res.status(200).json({ status: "success" });
      }

      const config = await getAppConfig();
      await setDoc(
        stateRef,
        {
          step: "HIRE_SELECT_PACKAGE",
          data: {
            ...(currentState.data || {}),
            boyId,
            clientType: chosenClientType,
            typeCode,
          },
        },
        { merge: true }
      );

      // Header message introducing individual Package Menu Cards
      await sendMessage(
        chatId,
        `✅ <b>သင်၏ ဧည့်သည်အမျိုးအစား အတည်ပြုပြီးပါပြီ:</b> <b>${escapeHTML(clientTypeLabel)}</b>\n\n` +
          `📋 <b>${boyCode} အတွက် ရရှိနိုင်သော Dating Package Menu Card (${config.activePackages.length} ခု)</b> ကို အောက်တွင် တစ်ခုချင်းစီ <b>ဈေးနှုန်း</b>၊ <b>သတ်မှတ်ကြာချိန်</b> နှင့် <b>စရံငွေ (${config.depositPercent}%)</b> အသေးစိတ်ဖြင့် ပြသထားပါသည်။\n\n` +
          `👇 <i>မိမိခေါ်ယူလိုသော Menu Card အောက်ရှိ <b>ရွေးချယ်မည်</b> ခလုတ်ကို နှိပ်ပါ -</i>`
      );

      // Send each active package as an individual, self-contained Menu Card with its own selection button
      for (let idx = 0; idx < config.activePackages.length; idx++) {
        const pkg = config.activePackages[idx];
        const priceNum = Math.max(0, Math.round(Number(pkg.price) || 0));
        const depositAmount = Math.round((priceNum * config.depositPercent) / 100);
        const badgeHtml = pkg.badge ? `  ★ <i>${escapeHTML(pkg.badge)}</i>` : "";
        const descHtml = pkg.description
          ? `\n📝 <b>ဝန်ဆောင်မှု:</b> ${escapeHTML(pkg.description)}`
          : "";

        const cardText =
          `╭──────────────────────────╮\n` +
          `${pkg.icon} <b>MENU CARD 0${idx + 1} · ${escapeHTML(pkg.title.toUpperCase())}</b>${badgeHtml}\n` +
          `╰──────────────────────────╯\n` +
          `💎 <b>Package:</b> <b>${escapeHTML(pkg.nameMm || pkg.title)}</b>\n` +
          `⏱️ <b>သတ်မှတ်ကြာချိန်:</b> <b>${escapeHTML(pkg.duration)}</b>\n` +
          `💰 <b>သတ်မှတ်ဈေးနှုန်း:</b> <b>${formatBotKyats(priceNum)} ကျပ်</b>\n` +
          `💳 <b>ပေးသွင်းရမည့် စရံငွေ (${config.depositPercent}%):</b> <b>${formatBotKyats(depositAmount)} ကျပ်</b>` +
          descHtml;

        await sendMessage(chatId, cardText, {
          inline_keyboard: [
            [
              {
                text: `✅ ${pkg.title} ရွေးချယ်မည် (${formatBotKyats(priceNum)} Ks · စရံ ${formatBotKyats(depositAmount)} Ks)`,
                callback_data: `HPKG_${idx}_${typeCode}_${boyId}`,
              },
            ],
          ],
        });
      }

      return res.status(200).json({ status: "success" });
    }

    if (text.startsWith("HPKG_")) {
      // Format: HPKG_<idxOrId>_<typeCode>_<boyId>
      const rest = text.replace(/^HPKG_/, "");
      const firstUnderscore = rest.indexOf("_");
      const secondUnderscore = rest.indexOf("_", firstUnderscore + 1);
      if (firstUnderscore > 0 && secondUnderscore > firstUnderscore) {
        const pkgIdxOrId = rest.slice(0, firstUnderscore);
        const typeCode = rest.slice(firstUnderscore + 1, secondUnderscore);
        const boyId = rest.slice(secondUnderscore + 1);
        const chosenClientType = typeCode === "G" ? "girl" : "lgbt";
        const clientTypeLabel = formatBookingClientTypeLabel(chosenClientType);
        const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;

        const config = await getAppConfig();
        const idxNum = Number(pkgIdxOrId);
        const chosenPkg =
          (Number.isInteger(idxNum) && config.activePackages[idxNum]) ||
          config.activePackages.find((p) => p.id === pkgIdxOrId) ||
          config.activePackages[0];

        const priceNum = Math.max(0, Math.round(Number(chosenPkg?.price) || 0));
        const depositAmount = Math.round((priceNum * config.depositPercent) / 100);
        const remainingAmount = Math.max(0, priceNum - depositAmount);
        const packageNameFull = `${chosenPkg.icon} ${chosenPkg.nameMm || chosenPkg.title}`;

        await setDoc(
          stateRef,
          {
            step: "HIRE_SELECT_DATE",
            data: {
              ...(currentState.data || {}),
              boyId,
              clientType: chosenClientType,
              typeCode,
              packageId: chosenPkg.id,
              packageTitle: chosenPkg.title,
              packageName: packageNameFull,
              packageDuration: chosenPkg.duration,
              packagePrice: priceNum,
              depositPercent: config.depositPercent,
              depositAmount,
              remainingAmount,
            },
          },
          { merge: true }
        );

        const datePicker = buildTelegramDatePickerKeyboard(
          "",
          Date.now(),
          `HIRFORCE_${typeCode}_${boyId}`
        );

        await sendMessage(
          chatId,
          `✅ <b>ရွေးချယ်ထားသော Package Menu Card အတည်ပြုပြီးပါပြီ</b>\n\n` +
            `👤 <b>Date Boy:</b> <b>${boyCode}</b>\n` +
            `🧑‍💼 <b>ဧည့်သည်အမျိုးအစား:</b> <b>${escapeHTML(clientTypeLabel)}</b>\n` +
            `📦 <b>Package:</b> <b>${escapeHTML(packageNameFull)}</b>\n` +
            `⏱️ <b>သတ်မှတ်ကြာချိန်:</b> <b>${escapeHTML(chosenPkg.duration)}</b>\n` +
            `💰 <b>ဈေးနှုန်း:</b> <b>${formatBotKyats(priceNum)} ကျပ်</b> (စရံ ${config.depositPercent}%: <b>${formatBotKyats(depositAmount)} ကျပ်</b>)\n\n` +
            `📅 <b>အဆင့် (၃) — ခေါ်ယူလိုသည့် နေ့ရက် (Preferred Date) ကို ရွေးချယ်ပေးပါ -</b>\n` +
            `<i>(အောက်ပါ Calendar Date Picker မှ ယနေ့၊ မနက်ဖြန် သို့မဟုတ် မိမိခေါ်ယူလိုသော ရက်စွဲခလုတ်ကို နှိပ်၍ ရွေးချယ်ပါ)</i>`,
          { inline_keyboard: datePicker.inline_keyboard }
        );
        return res.status(200).json({ status: "success" });
      }
    }

    // ==========================================
    // 📅 Interactive Telegram Date Picker & Time Picker Handlers
    // ==========================================
    if (text === "HDATE_NOP") {
      return res.status(200).json({ status: "success" });
    }

    if (text === "HDATE_PAST") {
      await sendMessage(
        chatId,
        "⚠️ ပြီးခဲ့သော ရက်စွဲများကို ရွေးချယ်၍ မရပါ။ ကျေးဇူးပြု၍ <b>ယနေ့</b> သို့မဟုတ် <b>လာမည့်ရက်စွဲတစ်ခု</b>ကို Calendar ပေါ်မှ နှိပ်၍ ရွေးချယ်ပေးပါ။"
      );
      return res.status(200).json({ status: "success" });
    }

    if (text === "HDATE_OPEN" || text.startsWith("HDATE_M_")) {
      const targetYm = text.startsWith("HDATE_M_") ? text.replace("HDATE_M_", "") : "";
      const stData = currentState.data || {};
      const boyId = stData.boyId || "";
      const typeCode = stData.typeCode || (stData.clientType === "girl" ? "G" : "L");
      const boyCode = boyId ? `WLDB-${boyId.substring(0, 5).toUpperCase()}` : "WLDB";
      const packageNameFull = stData.packageName || "🕒 Section (အချိန်ပိုင်း)";
      const packageDuration = stData.packageDuration || "";

      await setDoc(
        stateRef,
        {
          step: "HIRE_SELECT_DATE",
          data: { ...stData, calendarYm: targetYm },
        },
        { merge: true }
      );

      const datePicker = buildTelegramDatePickerKeyboard(
        targetYm,
        Date.now(),
        boyId ? `HIRFORCE_${typeCode}_${boyId}` : ""
      );

      await editOrSendMessage(
        chatId,
        callbackMessageId,
        `📅 <b>ခေါ်ယူလိုသည့် နေ့ရက် (Preferred Date) ရွေးချယ်ရန် — ${boyCode}</b>\n` +
          `📦 <b>Package:</b> <b>${escapeHTML(packageNameFull)}</b>${packageDuration ? ` (${escapeHTML(packageDuration)})` : ""}\n\n` +
          `👇 <i>အောက်ပါ Calendar Date Picker (${escapeHTML(datePicker.monthTitle)}) မှ မိမိခေါ်ယူလိုသော နေ့ရက်ကို နှိပ်၍ ရွေးချယ်ပါ -</i>`,
        { inline_keyboard: datePicker.inline_keyboard }
      );
      return res.status(200).json({ status: "success" });
    }

    if (text === "HDATE_CUSTOM") {
      await setDoc(
        stateRef,
        {
          step: "HIRE_SELECT_CUSTOM_DATE",
          data: { ...(currentState.data || {}) },
        },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "✍️ ကျေးဇူးပြု၍ <b>ခေါ်ယူလိုသည့် နေ့ရက်</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - <code>2026-12-05</code> သို့မဟုတ် <code>5/12/2026</code>) -",
        {
          inline_keyboard: [
            [{ text: "🗓️ Calendar Date Picker ဖြင့် ပြန်ရွေးမည်", callback_data: "HDATE_OPEN" }],
          ],
        }
      );
      return res.status(200).json({ status: "success" });
    }

    if (
      text.startsWith("HDATE_S_") ||
      ((currentState.step === "HIRE_SELECT_DATE" ||
        currentState.step === "HIRE_SELECT_CUSTOM_DATE") &&
        text &&
        !text.startsWith("/") &&
        !text.startsWith("HTIME_") &&
        !text.startsWith("HIR"))
    ) {
      const rawChosenDate = text.startsWith("HDATE_S_")
        ? text.replace("HDATE_S_", "").trim()
        : text.trim();
      const formattedDate = formatBurmeseBookingDateLabel(rawChosenDate, Date.now());
      const stData = currentState.data || {};
      const boyId = stData.boyId || "";
      const boyCode = boyId ? `WLDB-${boyId.substring(0, 5).toUpperCase()}` : "WLDB";
      const packageNameFull = stData.packageName || "🕒 Section (အချိန်ပိုင်း)";
      const packageDuration = stData.packageDuration || "";

      await setDoc(
        stateRef,
        {
          step: "HIRE_SELECT_TIME",
          data: {
            ...stData,
            preferredDateRaw: rawChosenDate,
            preferredDate: formattedDate,
          },
        },
        { merge: true }
      );

      const timePicker = buildTelegramTimePickerKeyboard();
      const timePromptText =
        `✅ <b>ခေါ်ယူလိုသည့် နေ့ရက် အတည်ပြုပြီးပါပြီ:</b> <b>${escapeHTML(formattedDate)}</b>\n` +
        `👤 <b>Date Boy:</b> <b>${boyCode}</b> | 📦 <b>${escapeHTML(packageNameFull)}</b>${packageDuration ? ` (${escapeHTML(packageDuration)})` : ""}\n\n` +
        `⏰ <b>အဆင့် (၄) — ခေါ်ယူလိုသည့် အချိန် (Preferred Time) ကို ရွေးချယ်ပေးပါ -</b>\n` +
        `<i>(အောက်ပါ Time Picker မှ နံနက်ပိုင်း၊ နေ့လယ်ပိုင်း၊ ညနေ/ညပိုင်း အချိန်ခလုတ်တစ်ခုကို နှိပ်၍ ရွေးချယ်ပါ)</i>`;

      if (text.startsWith("HDATE_S_") && callbackMessageId) {
        await editOrSendMessage(chatId, callbackMessageId, timePromptText, timePicker);
      } else {
        await sendMessage(chatId, timePromptText, timePicker);
      }
      return res.status(200).json({ status: "success" });
    }

    if (text === "HTIME_OPEN") {
      const stData = currentState.data || {};
      const formattedDate = stData.preferredDate || "ရွေးချယ်ထားသော နေ့ရက်";
      await setDoc(
        stateRef,
        {
          step: "HIRE_SELECT_TIME",
          data: stData,
        },
        { merge: true }
      );
      await editOrSendMessage(
        chatId,
        callbackMessageId,
        `📅 <b>ခေါ်ယူမည့် နေ့ရက်:</b> <b>${escapeHTML(formattedDate)}</b>\n\n` +
          `⏰ <b>ခေါ်ယူလိုသည့် အချိန် (Preferred Time) ကို ရွေးချယ်ပေးပါ -</b>`,
        buildTelegramTimePickerKeyboard()
      );
      return res.status(200).json({ status: "success" });
    }

    if (text === "HTIME_CUSTOM") {
      await setDoc(
        stateRef,
        {
          step: "HIRE_SELECT_CUSTOM_TIME",
          data: { ...(currentState.data || {}) },
        },
        { merge: true }
      );
      await sendMessage(
        chatId,
        "✍️ ကျေးဇူးပြု၍ <b>ခေါ်ယူလိုသည့် အချိန်</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - <code>7:30 PM</code> သို့မဟုတ် <code>ည ၈ နာရီခွဲ</code>) -",
        {
          inline_keyboard: [
            [{ text: "⏰ Time Picker ဖြင့် ပြန်ရွေးမည်", callback_data: "HTIME_OPEN" }],
          ],
        }
      );
      return res.status(200).json({ status: "success" });
    }

    if (
      text.startsWith("HTIME_S_") ||
      ((currentState.step === "HIRE_SELECT_TIME" ||
        currentState.step === "HIRE_SELECT_CUSTOM_TIME") &&
        text &&
        !text.startsWith("/") &&
        !text.startsWith("HDATE_") &&
        !text.startsWith("HIR"))
    ) {
      const rawChosenTime = text.startsWith("HTIME_S_")
        ? text.replace("HTIME_S_", "").trim()
        : text.trim();
      const formattedTime = formatBurmeseBookingTimeLabel(rawChosenTime);
      const stData = currentState.data || {};
      const boyId = String(stData.boyId || "");
      const boyCode = boyId ? `WLDB-${boyId.substring(0, 5).toUpperCase()}` : "WLDB";
      const typeCode = stData.typeCode || (stData.clientType === "girl" ? "G" : "L");
      const chosenClientType = stData.clientType || (typeCode === "G" ? "girl" : "lgbt");
      const clientTypeLabel = formatBookingClientTypeLabel(chosenClientType);

      const config = await getAppConfig();
      const packageNameFull = stData.packageName || "🕒 Section (အချိန်ပိုင်း)";
      const packageDuration = stData.packageDuration || "သတ်မှတ်ချိန်အတိုင်း";
      const priceNum = Number(stData.packagePrice || config.feeSec || 70000);
      const depositPercent = Number(stData.depositPercent || config.depositPercent || 50);
      const depositAmount = Number(
        stData.depositAmount || Math.round((priceNum * depositPercent) / 100)
      );
      const remainingAmount = Math.max(0, priceNum - depositAmount);
      const preferredDate = stData.preferredDate || formatBurmeseBookingDateLabel(getMyanmarTodayParts().todayKey);

      await setDoc(
        stateRef,
        {
          step: "WAIT_HIRE_SS",
          data: {
            ...stData,
            preferredDate,
            preferredTimeRaw: rawChosenTime,
            preferredTime: formattedTime,
          },
        },
        { merge: true }
      );

      const invoiceText =
        `🧾 <b>Booking အချက်အလက် အတည်ပြုချက် (Booking Summary & Invoice)</b>\n\n` +
        `👤 <b>Date Boy:</b> <b>${boyCode}</b>\n` +
        `🧑‍💼 <b>သင်၏ ဧည့်သည်အမျိုးအစား:</b> <b>${escapeHTML(clientTypeLabel)}</b>\n` +
        `📦 <b>ရွေးချယ်ထားသော Package:</b> <b>${escapeHTML(packageNameFull)}</b>\n` +
        `⏱️ <b>သတ်မှတ်ကြာချိန်:</b> <b>${escapeHTML(packageDuration)}</b>\n` +
        `📅 <b>ခေါ်ယူလိုသည့် နေ့ရက်:</b> <b>${escapeHTML(preferredDate)}</b>\n` +
        `⏰ <b>ခေါ်ယူလိုသည့် အချိန်:</b> <b>${escapeHTML(formattedTime)}</b>\n` +
        `──────────────────────\n` +
        `💰 <b>စုစုပေါင်း ကျသင့်ငွေ:</b> <b>${formatBotKyats(priceNum)} ကျပ်</b>\n` +
        `💳 <b>ယခုလွှဲရမည့် စရံငွေ (${depositPercent}%):</b> <b>${formatBotKyats(depositAmount)} ကျပ်</b>\n` +
        `💵 <b>တွေ့ဆုံချိန် ကျန်ငွေ:</b> <b>${formatBotKyats(remainingAmount)} ကျပ်</b>\n\n` +
        `🏦 <b>စရံငွေ လွှဲပေးရမည့် အကောင့်များ (နံပါတ်ကို နှိပ်၍ Copy ကူးနိုင်ပါသည်) -</b>\n` +
        `${formatTelegramPaymentAccountsHtml(config)}\n\n` +
        `📸 ငွေလွှဲပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပေးပါ။`;

      const invoiceKeyboard = {
        inline_keyboard: [
          [
            { text: "📅 နေ့ရက် ပြန်ပြင်မည်", callback_data: "HDATE_OPEN" },
            { text: "⏰ အချိန် ပြန်ပြင်မည်", callback_data: "HTIME_OPEN" },
          ],
          [
            {
              text: "🔄 အခြား Package Menu Card ပြန်ရွေးမည်",
              callback_data: `HIRFORCE_${typeCode}_${boyId}`,
            },
          ],
        ],
      };

      await sendMessage(chatId, invoiceText, invoiceKeyboard);
      return res.status(200).json({ status: "success" });
    }

    if (
      (currentState.step === "HIRE_SELECT_DATE" ||
        currentState.step === "HIRE_SELECT_CUSTOM_DATE") &&
      photos.length > 0
    ) {
      await sendMessage(
        chatId,
        "⚠️ ကျေးဇူးပြု၍ ငွေလွှဲပြေစာ မပို့မီ <b>ခေါ်ယူလိုသည့် နေ့ရက် (Preferred Date)</b> နှင့် <b>အချိန် (Preferred Time)</b> ကို အရင်ဆုံး ရွေးချယ်ပေးပါ -",
        {
          inline_keyboard: [
            [{ text: "🗓️ ခေါ်ယူလိုသည့် နေ့ရက် (Date Picker) ရွေးမည်", callback_data: "HDATE_OPEN" }],
          ],
        }
      );
      return res.status(200).json({ status: "success" });
    }

    if (
      (currentState.step === "HIRE_SELECT_TIME" ||
        currentState.step === "HIRE_SELECT_CUSTOM_TIME") &&
      photos.length > 0
    ) {
      await sendMessage(
        chatId,
        "⚠️ ကျေးဇူးပြု၍ ငွေလွှဲပြေစာ မပို့မီ <b>ခေါ်ယူလိုသည့် အချိန် (Preferred Time)</b> ကို အရင်ဆုံး ရွေးချယ်ပေးပါ -",
        buildTelegramTimePickerKeyboard()
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "HIRE_SELECT_PACKAGE" && (text || photos.length > 0) && !text.startsWith("/")) {
      const boyId = currentState.data?.boyId || "";
      const typeCode = currentState.data?.typeCode || (currentState.data?.clientType === "girl" ? "G" : "L");
      await sendMessage(
        chatId,
        "⚠️ ကျေးဇူးပြု၍ ငွေလွှဲပြေစာ မပို့မီ အပေါ်တွင် ပြသထားသော <b>Package Menu Card များထဲမှ မိမိခေါ်ယူလိုသော Card အောက်ရှိ [ ✅ ရွေးချယ်မည် ]</b> ခလုတ်ကို အရင်ဆုံး နှိပ်ပေးပါ (သို့မဟုတ် Menu Card များ ပြန်ကြည့်ရန် အောက်ပါခလုတ်ကို နှိပ်ပါ) -",
        {
          inline_keyboard: [
            [
              {
                text: "📋 Package Menu Card များ ပြန်ကြည့်မည်",
                callback_data: `HIRFORCE_${typeCode}_${boyId}`,
              },
            ],
          ],
        }
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "HIRE_SELECT_CLIENT_TYPE" && text && !text.startsWith("/")) {
      const boyId = currentState.data?.boyId || "";
      await sendMessage(
        chatId,
        "⚠️ ကျေးဇူးပြု၍ သင်သည် <b>Girl (အမျိုးသမီး ဧည့်သည်)</b> သို့မဟုတ် <b>LGBT ဧည့်သည်</b> ဖြစ်ကြောင်း အောက်ပါခလုတ် (၂) ခုထဲမှ တစ်ခုကို နှိပ်၍ အရင်ဆုံး ရွေးချယ်ပေးပါ -",
        {
          inline_keyboard: [
            [
              {
                text: "👩 Girl (အမျိုးသမီး ဧည့်သည် ဖြစ်ပါသည်)",
                callback_data: `HIRTYPE_G_${boyId}`,
              },
            ],
            [
              {
                text: "🏳️‍🌈 LGBT (LGBT ဧည့်သည် ဖြစ်ပါသည်)",
                callback_data: `HIRTYPE_L_${boyId}`,
              },
            ],
          ],
        }
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "WAIT_HIRE_SS" && photos.length === 0 && text && !text.startsWith("/")) {
      const stData = currentState.data || {};
      const boyId = stData.boyId || "";
      const typeCode = stData.typeCode || (stData.clientType === "girl" ? "G" : "L");
      await sendMessage(
        chatId,
        "📸 ကျေးဇူးပြု၍ စရံငွေလွှဲပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot ဓာတ်ပုံ)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပေးပါ။\n\n<i>(နေ့ရက်၊ အချိန် သို့မဟုတ် Package ပြန်ပြင်လိုပါက အောက်ပါခလုတ်များကို နှိပ်ပါ)</i>",
        {
          inline_keyboard: [
            [
              { text: "📅 နေ့ရက် ပြန်ပြင်မည်", callback_data: "HDATE_OPEN" },
              { text: "⏰ အချိန် ပြန်ပြင်မည်", callback_data: "HTIME_OPEN" },
            ],
            [
              {
                text: "🔄 အခြား Package Menu Card ပြန်ရွေးမည်",
                callback_data: `HIRFORCE_${typeCode}_${boyId}`,
              },
            ],
          ],
        }
      );
      return res.status(200).json({ status: "success" });
    }

    if (currentState.step === "WAIT_HIRE_SS" && photos.length > 0) {
      const boyId = String(currentState.data.boyId || "");
      const clientType = normalizeBookingClientType(currentState.data.clientType || "");
      const clientTypeLabel = formatBookingClientTypeLabel(clientType);
      const clientTypeShort = formatBookingClientTypeShortBadge(clientType);
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;

      const packageId = String(currentState.data.packageId || "sec");
      const packageName = String(currentState.data.packageName || "🕒 Section (အချိန်ပိုင်း)");
      const packageDuration = String(currentState.data.packageDuration || "");
      const packagePrice = Number(currentState.data.packagePrice || 0);
      const depositPercent = Number(currentState.data.depositPercent || 50);
      const depositAmount = Number(currentState.data.depositAmount || 0);
      const preferredDate = String(
        currentState.data.preferredDate || "Telegram Bot မှ ညှိနှိုင်းမည်"
      );
      const preferredTime = String(
        currentState.data.preferredTime || "Telegram Bot မှ ညှိနှိုင်းမည်"
      );
      const formattedDurationSummary =
        packagePrice > 0
          ? `${packageName}${packageDuration ? ` · ${packageDuration}` : ""} — ${formatBotKyats(packagePrice)} Ks (စရံ ${formatBotKyats(depositAmount)} Ks)`
          : `${packageName} (${depositPercent}% Deposit Paid)`;

      const boySnap = boyId ? await getDoc(doc(db, "dateboys", boyId)) : null;
      const boyData = boySnap?.exists() ? boySnap.data() : {};
      const boyName = boyData.name || boyCode;
      const boyCity = boyData.city || "-";
      const boyTownship = boyData.township || "-";
      const boyPrefLabel = formatClientPreferenceLabel(boyData.clientPreference);
      const boyChatId =
        boyData.telegramChatId ||
        (typeof boyData.telegramProfileLink === "string"
          ? boyData.telegramProfileLink.match(/id=(\d+)/)?.[1]
          : null);
      const boyTgLink =
        boyData.telegramProfileLink || (boyChatId ? `tg://user?id=${boyChatId}` : "");

      const clientProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;
      const clientDisplayName = message?.from?.first_name
        ? `${message.from.first_name}${message.from.last_name ? " " + message.from.last_name : ""}`
        : username
          ? `@${username}`
          : `Telegram Client (${chatId})`;
      const bookingRef = `WL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      let bookingDocId = "";
      try {
        const bkDocRef = await addDoc(collection(db, "bookings"), {
          bookingRef,
          source: "telegram_bot",
          dateBoyId: boyId,
          dateBoyCode: boyCode,
          dateBoyName: boyName,
          dateBoyCity: boyCity,
          dateBoyTownship: boyTownship,
          dateBoyPreference: normalizeClientPreference(boyData.clientPreference),
          dateBoyChatId: boyChatId || null,
          clientType: clientType || "lgbt",
          clientName: clientDisplayName,
          clientContact: username ? `@${username}` : `tg://user?id=${chatId}`,
          clientChatId: chatId,
          clientProfileLink,
          depositPhotoUrl: photos[0] || "",
          depositFileId: fileIdToForward || "",
          preferredDate,
          preferredTime,
          packageId,
          packageName,
          packageDuration,
          packagePrice,
          depositPercent,
          depositAmount,
          duration: formattedDurationSummary,
          notes: `Telegram Bot မှ စရံပြေစာ ပေးပို့ထားသော Dating Request (${clientTypeLabel} · ${packageName} · ${preferredDate} ${preferredTime})`,
          status: "pending",
          createdAt: serverTimestamp(),
        });
        bookingDocId = bkDocRef.id;
      } catch (e) {
        console.error("Failed to save Telegram booking doc:", e);
      }

      await setDoc(stateRef, { step: "IDLE", data: {} }, { merge: true });
      await sendMessage(
        chatId,
        `⏳ <b>Booking စရံ ငွေလွှဲပြေစာ ရရှိပါပြီ (${bookingRef})။</b>\n\n` +
          `👤 <b>Date Boy:</b> <b>${boyCode}</b>\n` +
          `🧑‍💼 <b>သင်၏ ဧည့်သည်အမျိုးအစား:</b> <b>${escapeHTML(clientTypeLabel)}</b>\n` +
          `📦 <b>ရွေးချယ်ထားသော Package:</b> <b>${escapeHTML(packageName)}</b>\n` +
          (packageDuration ? `⏱️ <b>သတ်မှတ်ကြာချိန်:</b> <b>${escapeHTML(packageDuration)}</b>\n` : "") +
          `📅 <b>ခေါ်ယူလိုသည့် နေ့ရက်:</b> <b>${escapeHTML(preferredDate)}</b>\n` +
          `⏰ <b>ခေါ်ယူလိုသည့် အချိန်:</b> <b>${escapeHTML(preferredTime)}</b>\n` +
          (packagePrice > 0
            ? `💰 <b>Package ဈေးနှုန်း:</b> <b>${formatBotKyats(packagePrice)} ကျပ်</b> (စရံ <b>${formatBotKyats(depositAmount)} ကျပ်</b>)\n`
            : "") +
          `\nAdmin မှ စစ်ဆေးအတည်ပြုပြီးသည်နှင့် သက်ဆိုင်ရာ Date Boy ထံသို့ သင်၏ ဧည့်သည်အမျိုးအစား၊ Package နှင့် ခေါ်ယူလိုသည့် နေ့ရက်/အချိန် အချက်အလက်များကို ချက်ချင်း အကြောင်းကြားပေးပါမည်။`
      );
      if (adminChatId) {
        const boyLinkLine = boyTgLink
          ? `\n🔗 <b>Date Boy Telegram:</b> <a href="${boyTgLink}">💬 ${escapeHTML(boyName)} နှင့် တိုက်ရိုက်စကားပြောရန်</a>`
          : "";
        const pkgLines =
          `\n📦 <b>ရွေးချယ်ထားသော Package:</b> <b>${escapeHTML(packageName)}</b>` +
          (packageDuration ? `\n⏱️ <b>သတ်မှတ်ကြာချိန်:</b> <b>${escapeHTML(packageDuration)}</b>` : "") +
          `\n📅 <b>ခေါ်ယူလိုသည့် နေ့ရက်:</b> <b>${escapeHTML(preferredDate)}</b>` +
          `\n⏰ <b>ခေါ်ယူလိုသည့် အချိန်:</b> <b>${escapeHTML(preferredTime)}</b>` +
          (packagePrice > 0
            ? `\n💰 <b>ဈေးနှုန်း / စရံ (${depositPercent}%):</b> <b>${formatBotKyats(packagePrice)} Ks</b> (စရံ <b>${formatBotKyats(depositAmount)} Ks</b>)`
            : "");
        const adminMsg =
          `🚨 <b>Dating Request (Booking) — ${bookingRef}</b> 🚨\n\n` +
          `🆔 <b>Date Boy:</b> ${escapeHTML(boyName)} (<b>${boyCode}</b>)\n` +
          `🎯 <b>Date Boy လက်ခံသော ဧည့်သည်:</b> ${escapeHTML(boyPrefLabel)}\n` +
          `📍 <b>မြို့နယ်:</b> ${escapeHTML(boyTownship)}, ${escapeHTML(boyCity)}\n\n` +
          `👤 <b>ခေါ်ယူသူ ဧည့်သည်အမျိုးအစား (Client Type):</b> <b>${escapeHTML(clientTypeLabel)}</b>` +
          pkgLines +
          `\n🧑‍💼 <b>Client:</b> <a href="${clientProfileLink}">💬 ${escapeHTML(clientDisplayName)} (Profile နှိပ်ရန်)</a>` +
          boyLinkLine +
          `\n\n💳 Client မှ Booking စရံပြေစာ ပို့ထားပါသည်။ Approve နှိပ်လိုက်ပါက Date Boy ထံသို့ ဧည့်သည်အမျိုးအစား (<b>${escapeHTML(clientTypeShort)}</b>)၊ ရွေးချယ်ထားသော Package (<b>${escapeHTML(packageName)}</b>) နှင့် ခေါ်ယူမည့် နေ့ရက်/အချိန် (<b>${escapeHTML(preferredDate)} · ${escapeHTML(preferredTime)}</b>) တို့ကို အလိုအလျောက် အကြောင်းကြားစာ ပို့ပေးပါမည်။`;

        const approveCallback = bookingDocId
          ? `APP_HBK_${bookingDocId}`
          : `APP_H_${chatId}_${boyId}_${clientType === "girl" ? "girl" : "lgbt"}`;
        const rejectCallback = bookingDocId
          ? `REJ_HBK_${bookingDocId}`
          : `REJ_H_${chatId}_${boyId}_${clientType === "girl" ? "girl" : "lgbt"}`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: "✅ Approve & Date Boy ထံ ပို့မည်", callback_data: approveCallback },
              { text: "❌ Reject", callback_data: rejectCallback },
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
