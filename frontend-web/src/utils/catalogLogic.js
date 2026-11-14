export const BRAND_LOGO_URL =
  '/assets/aistudio/IMG-261ce20021d63ca3c8be56a8803e3540-V_86eb9421.jpg';
export const BRAND_TAGLINE = 'ALL OF YOU';

export const HERO_LOUNGE_IMAGE = '/assets/images/hero_luxury_lounge_1794591265943.jpg';

export const FALLBACK_PORTRAITS = [
  '/assets/images/portrait_editorial_companion_1_1794591267637.jpg',
  '/assets/images/portrait_editorial_companion_2_1794591268793.jpg',
];

export const CURATED_SHOWCASE_COMPANIONS = [
  {
    id: 'showcase-Julian-01',
    name: 'Julian Vance',
    age: '25',
    height: "5' 11\"",
    cockSize: '6.5"',
    city: 'Yangon',
    township: 'Bahan',
    status: 'approved',
    bio: 'Bilingual architecture graduate & fine-dining companion. Fluent in English and Myanmar, well-versed in black-tie galas, private cocktail evenings, and travel arrangements.',
    publicPhotos: [
      '/assets/images/portrait_editorial_companion_1_1794591267637.jpg',
      '/assets/images/portrait_editorial_companion_2_1794591268793.jpg',
    ],
    isShowcase: true,
  },
  {
    id: 'showcase-kaung-02',
    name: 'Kaung Myat',
    age: '24',
    height: "6' 0\"",
    cockSize: '6.5"',
    city: 'Mandalay',
    township: 'Chanayethazan',
    status: 'approved',
    bio: 'Fitness model and luxury hospitality specialist. Discreet, articulate, and tailored for private social engagements, dinner dates, and executive accompaniment.',
    publicPhotos: [
      '/assets/images/portrait_editorial_companion_2_1794591268793.jpg',
      '/assets/images/portrait_editorial_companion_1_1794591267637.jpg',
    ],
    isShowcase: true,
  },
];

/**
 * Resolves any stored photo/video string or Telegram file_id into a safe, non-expiring
 * relative proxy URL (/api/webhook?file_id=...) or asset/data URL.
 * Never exposes TELEGRAM_BOT_TOKEN in the browser DOM.
 */
export function resolveMediaUrl(rawItem, fileIdFallback = '', type = 'photo') {
  const typeParam = type === 'video' ? '&type=video' : '';
  if (typeof rawItem === 'string' && rawItem.trim().startsWith('data:')) {
    return rawItem.trim();
  }
  if (typeof fileIdFallback === 'string' && fileIdFallback.trim().length > 0) {
    return `/api/webhook?file_id=${encodeURIComponent(fileIdFallback.trim())}${typeParam}`;
  }

  if (typeof rawItem !== 'string' || !rawItem.trim()) {
    return '';
  }

  const trimmed = rawItem.trim();

  // Already a proxy URL (absolute or relative) -> normalize to relative /api/webhook?... so it works on any host
  const proxyIdx = trimmed.indexOf('/api/webhook?');
  if (proxyIdx !== -1) {
    return trimmed.slice(proxyIdx);
  }

  // Data URLs (Base64 from Web registration or Admin upload) or local static assets
  if (trimmed.startsWith('data:') || trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  // Legacy api.telegram.org/file/bot<TOKEN>/<file_path> URL -> route through server proxy without exposing bot token
  const legacyMatch = trimmed.match(/api\.telegram\.org\/file\/bot[^/]+\/(.+)$/);
  if (legacyMatch && legacyMatch[1]) {
    return `/api/webhook?legacy_path=${encodeURIComponent(legacyMatch[1])}${typeParam}`;
  }

  // Standard HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }

  // Raw Telegram file_id (e.g., saved by backend-bot/bot.js)
  return `/api/webhook?file_id=${encodeURIComponent(trimmed)}${typeParam}`;
}

/**
 * Detects whether a companion record still relies on legacy 1-hour expiring api.telegram.org URLs
 * without permanent Telegram file_ids.
 */
export function isLegacyExpiredProneTelegramMedia(rawBoy) {
  if (!rawBoy || typeof rawBoy !== 'object') return false;
  const pubIds = Array.isArray(rawBoy.publicFileIds) ? rawBoy.publicFileIds.filter(Boolean) : [];
  const privIds = Array.isArray(rawBoy.privateFileIds) ? rawBoy.privateFileIds.filter(Boolean) : [];
  const pubPhotos = Array.isArray(rawBoy.publicPhotos)
    ? rawBoy.publicPhotos
    : rawBoy.publicPhoto
      ? [rawBoy.publicPhoto]
      : [];
  const privPhotos = Array.isArray(rawBoy.privatePhotos) ? rawBoy.privatePhotos : [];

  const hasLegacyPub =
    pubIds.length === 0 &&
    pubPhotos.some((u) => typeof u === 'string' && u.includes('api.telegram.org/file/bot'));
  const hasLegacyPriv =
    privIds.length === 0 &&
    privPhotos.some((u) => typeof u === 'string' && u.includes('api.telegram.org/file/bot'));
  const hasLegacyVid =
    !rawBoy.privateVideoFileId &&
    typeof rawBoy.privateVideo === 'string' &&
    rawBoy.privateVideo.includes('api.telegram.org/file/bot');

  return hasLegacyPub || hasLegacyPriv || hasLegacyVid;
}

/**
 * Normalizes a companion document from Firestore (supporting both legacy `publicPhoto`,
 * multi-photo `publicPhotos` arrays, and permanent `publicFileIds`/`privateFileIds` from Telegram Bot).
 */
export function normalizeCompanionRecord(rawBoy, index = 0) {
  if (!rawBoy || typeof rawBoy !== 'object') {
    return null;
  }

  const id = String(rawBoy.id || `anon-${index}`);
  const boyCode = `WLDB-${id.substring(0, 5).toUpperCase()}`;

  const rawPubPhotos = Array.isArray(rawBoy.publicPhotos)
    ? rawBoy.publicPhotos.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [];
  if (
    rawPubPhotos.length === 0 &&
    typeof rawBoy.publicPhoto === 'string' &&
    rawBoy.publicPhoto.trim().length > 0
  ) {
    rawPubPhotos.push(rawBoy.publicPhoto.trim());
  }

  const rawPubIds = Array.isArray(rawBoy.publicFileIds)
    ? rawBoy.publicFileIds.filter((fid) => typeof fid === 'string' && fid.trim().length > 0)
    : [];

  const pubCount = Math.max(rawPubPhotos.length, rawPubIds.length);
  const resolvedPublicList = [];
  for (let i = 0; i < pubCount; i++) {
    const resolved = resolveMediaUrl(rawPubPhotos[i] || '', rawPubIds[i] || '', 'photo');
    if (resolved) resolvedPublicList.push(resolved);
  }

  const fallbackImg = FALLBACK_PORTRAITS[index % FALLBACK_PORTRAITS.length];
  const publicPhotos = resolvedPublicList.length > 0 ? resolvedPublicList : [fallbackImg];
  const primaryPhoto = publicPhotos[0];

  const rawPrivPhotos = Array.isArray(rawBoy.privatePhotos)
    ? rawBoy.privatePhotos.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [];
  const rawPrivIds = Array.isArray(rawBoy.privateFileIds)
    ? rawBoy.privateFileIds.filter((fid) => typeof fid === 'string' && fid.trim().length > 0)
    : [];

  const privCount = Math.max(rawPrivPhotos.length, rawPrivIds.length);
  const privatePhotos = [];
  for (let i = 0; i < privCount; i++) {
    const resolved = resolveMediaUrl(rawPrivPhotos[i] || '', rawPrivIds[i] || '', 'photo');
    if (resolved) privatePhotos.push(resolved);
  }

  const privateVideo = resolveMediaUrl(
    rawBoy.privateVideo || '',
    rawBoy.privateVideoFileId || '',
    'video'
  );

  return {
    ...rawBoy,
    id,
    boyCode,
    name: (rawBoy.name || 'Anonymous Companion').trim(),
    age: rawBoy.age ? String(rawBoy.age).trim() : '-',
    height: rawBoy.height ? String(rawBoy.height).trim() : '-',
    cockSize: rawBoy.cockSize ? String(rawBoy.cockSize).trim() : '',
    city: rawBoy.city ? String(rawBoy.city).trim() : 'Yangon',
    township: rawBoy.township ? String(rawBoy.township).trim() : 'Central',
    publicPhotos,
    primaryPhoto,
    hasUploadedPhoto: resolvedPublicList.length > 0,
    privatePhotos,
    privateVideo,
    hasLegacyTelegramLinks: isLegacyExpiredProneTelegramMedia(rawBoy),
  };
}

/**
 * Filters and sorts normalized companion records.
 */
export function filterAndSortCompanions(boys, filters = {}) {
  const {
    selectedCity = '',
    selectedTownship = '',
    searchQuery = '',
    ageRange = 'all',
    sortBy = 'featured',
    showFavoritesOnly = false,
    favorites = [],
  } = filters;

  if (!Array.isArray(boys)) return [];

  return boys
    .filter((boy) => {
      if (!boy) return false;
      if (selectedCity && boy.city !== selectedCity) return false;
      if (selectedTownship && boy.township !== selectedTownship) return false;
      if (showFavoritesOnly && !favorites.includes(boy.id)) return false;

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = boy.name?.toLowerCase().includes(q);
        const matchCity = boy.city?.toLowerCase().includes(q);
        const matchTownship = boy.township?.toLowerCase().includes(q);
        const matchCode = boy.boyCode?.toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchTownship && !matchCode) return false;
      }

      if (ageRange !== 'all') {
        const ageNum = parseInt(boy.age, 10);
        if (!isNaN(ageNum)) {
          if (ageRange === '18-22' && (ageNum < 18 || ageNum > 22)) return false;
          if (ageRange === '23-27' && (ageNum < 23 || ageNum > 27)) return false;
          if (ageRange === '28+' && ageNum < 28) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'age-asc') return (parseInt(a.age, 10) || 99) - (parseInt(b.age, 10) || 99);
      if (sortBy === 'age-desc') return (parseInt(b.age, 10) || 0) - (parseInt(a.age, 10) || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });
}

/**
 * Validates the companion registration dossier without relying on window.alert().
 */
export function validateRegistrationForm({
  formData = {},
  customCity = '',
  customTownship = '',
  publicPhotos = [],
  privatePhotos = [],
  agreeTerms = false,
  agreePrivacy = false,
}) {
  const name = (formData.name || '').trim();
  const age = (formData.age || '').toString().trim();
  const height = (formData.height || '').trim();
  const phone = (formData.phone || '').trim();
  const address = (formData.address || '').trim();

  if (!name || !age || !height || !phone || !address) {
    return {
      valid: false,
      error: 'ကိုယ်ရေးအချက်အလက်အားလုံးကို ပြည့်စုံစွာ ဖြည့်သွင်းပေးပါရန် လိုအပ်ပါသည်။',
      finalCity: '',
      finalTownship: '',
    };
  }

  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 18 || ageNum > 60) {
    return {
      valid: false,
      error: 'အသက်သည် ၁၈ နှစ်နှင့် အထက် ဖြစ်ရပါမည်။',
      finalCity: '',
      finalTownship: '',
    };
  }

  const finalCity = (formData.city === 'other' ? customCity : formData.city || '').trim();
  const finalTownship = (
    formData.city === 'other' || formData.township === 'other'
      ? customTownship
      : formData.township || ''
  ).trim();

  if (!finalCity || !finalTownship) {
    return {
      valid: false,
      error: 'မြို့ နှင့် မြို့နယ်ကို ပြည့်စုံစွာ ရွေးချယ် သို့မဟုတ် ထည့်သွင်းပေးပါ။',
      finalCity: '',
      finalTownship: '',
    };
  }

  if (!Array.isArray(publicPhotos) || publicPhotos.length < 3) {
    return {
      valid: false,
      error: `Public Profile ပုံ အနည်းဆုံး ၃ ပုံ တင်ပေးရန် လိုအပ်ပါသည် (လက်ရှိ ${publicPhotos?.length || 0}/3 ပုံ)။`,
      finalCity,
      finalTownship,
    };
  }

  if (!Array.isArray(privatePhotos) || privatePhotos.length < 3) {
    return {
      valid: false,
      error: `Private Portfolio ပုံ အနည်းဆုံး ၃ ပုံ တင်ပေးရန် လိုအပ်ပါသည် (လက်ရှိ ${privatePhotos?.length || 0}/3 ပုံ)။`,
      finalCity,
      finalTownship,
    };
  }

  if (!agreeTerms || !agreePrivacy) {
    return {
      valid: false,
      error: 'Agency Terms & Discretion Policy များကို သဘောတူညီရန် လိုအပ်ပါသည်။',
      finalCity,
      finalTownship,
    };
  }

  return {
    valid: true,
    error: null,
    finalCity,
    finalTownship,
  };
}

/**
 * Formats a concise, luxury concierge booking summary text.
 */
export function formatBookingSummary({ bookingRef, boy, bookingForm }) {
  if (!boy || !bookingForm) return '';
  const code = boy.boyCode || `WLDB-${String(boy.id || '').substring(0, 5).toUpperCase()}`;
  return [
    'WE LINK — PRIVATE CONCIERGE RESERVATION',
    `Reference: ${bookingRef}`,
    `Companion: ${boy.name} (${code})`,
    `Location: ${boy.township}, ${boy.city}`,
    `Client: ${bookingForm.clientName}`,
    `Contact: ${bookingForm.clientContact}`,
    `Schedule: ${bookingForm.preferredDate} at ${bookingForm.preferredTime}`,
    `Arrangement: ${bookingForm.duration}`,
    `Notes: ${bookingForm.notes || 'Standard Private Protocol'}`,
  ].join('\n');
}

/**
 * Extracts epoch milliseconds from a Firestore Timestamp, Date object, number, or ISO string.
 */
export function extractTimestampMs(val) {
  if (!val) return 0;
  if (typeof val === 'number') {
    return val < 1e11 ? val * 1000 : val;
  }
  if (val instanceof Date) {
    const t = val.getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') {
      return val.toMillis();
    }
    const secs =
      typeof val.seconds === 'number'
        ? val.seconds
        : typeof val._seconds === 'number'
          ? val._seconds
          : null;
    if (secs !== null) {
      const nanos = Number(val.nanoseconds || val._nanoseconds || 0);
      return secs * 1000 + Math.floor(nanos / 1e6);
    }
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Returns the primary submission/activity timestamp (in ms) for a Date Boy record.
 */
export function getCompanionTimestampMs(boy) {
  if (!boy || typeof boy !== 'object') return 0;
  return (
    extractTimestampMs(boy.createdAt) ||
    extractTimestampMs(boy.updatedAt) ||
    extractTimestampMs(boy.approvedAt) ||
    extractTimestampMs(boy.reuploadRequestedAt) ||
    0
  );
}

/**
 * Formats an epoch timestamp (ms) into a local YYYY-MM-DD date string for reliable calendar day comparison.
 */
export function toLocalDateKey(ms) {
  if (!ms || ms <= 0) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a human-readable submission date/time badge for Admin cards (e.g., "ယနေ့ · 01:27 AM").
 */
export function formatCompanionDateBadge(boy, nowMs = Date.now()) {
  const ms = getCompanionTimestampMs(boy);
  if (!ms) return 'ရက်စွဲ မပါရှိပါ';

  const d = new Date(ms);
  const hours24 = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = String(hours24 % 12 || 12).padStart(2, '0');
  const timeStr = `${hours12}:${minutes} ${period}`;

  const itemDateKey = toLocalDateKey(ms);
  const todayKey = toLocalDateKey(nowMs);
  const yesterdayDate = new Date(nowMs);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterdayDate.getTime());

  if (itemDateKey === todayKey) {
    return `ယနေ့ (Today) · ${timeStr}`;
  }
  if (itemDateKey === yesterdayKey) {
    return `မနေ့က (Yesterday) · ${timeStr}`;
  }

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const dateStr = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  return `${dateStr} · ${timeStr}`;
}

/**
 * Computes Today / Yesterday / All counts for the Admin Date Filter bar.
 */
export function computeAdminDateCounts(boys, nowMs = Date.now()) {
  if (!Array.isArray(boys)) return { all: 0, today: 0, yesterday: 0 };
  const todayKey = toLocalDateKey(nowMs);
  const yesterdayDate = new Date(nowMs);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterdayDate.getTime());

  let today = 0;
  let yesterday = 0;
  for (const boy of boys) {
    const key = toLocalDateKey(getCompanionTimestampMs(boy));
    if (key && key === todayKey) today++;
    else if (key && key === yesterdayKey) yesterday++;
  }

  return {
    all: boys.length,
    today,
    yesterday,
  };
}

/**
 * Filters and sorts Admin companion lists (Pending Applications or Approved Roster)
 * by date ('all' | 'today' | 'yesterday' | 'custom'), search query, and sortOrder ('newest' | 'oldest').
 * Always defaults to newest-first so newly submitted Telegram Bot applications appear at #1.
 */
export function filterAndSortAdminCompanions(boys, options = {}, nowMs = Date.now()) {
  if (!Array.isArray(boys)) return [];
  const {
    dateFilter = 'all',
    customDate = '',
    searchQuery = '',
    sortOrder = 'newest',
  } = options;

  const todayKey = toLocalDateKey(nowMs);
  const yesterdayDate = new Date(nowMs);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterdayDate.getTime());
  const cleanSearch = String(searchQuery || '').toLowerCase().trim();

  return boys
    .filter((boy) => {
      if (!boy) return false;

      if (dateFilter !== 'all') {
        const itemKey = toLocalDateKey(getCompanionTimestampMs(boy));
        if (!itemKey) return false;
        if (dateFilter === 'today' && itemKey !== todayKey) return false;
        if (dateFilter === 'yesterday' && itemKey !== yesterdayKey) return false;
        if (dateFilter === 'custom') {
          if (customDate && itemKey !== customDate) return false;
        }
      }

      if (cleanSearch) {
        const boyCode = `WLDB-${String(boy.id || '').substring(0, 5).toUpperCase()}`.toLowerCase();
        const nameMatch = String(boy.name || '').toLowerCase().includes(cleanSearch);
        const codeMatch = boyCode.includes(cleanSearch) || String(boy.id || '').toLowerCase().includes(cleanSearch);
        const phoneMatch = String(boy.phone || '').toLowerCase().includes(cleanSearch);
        const cityMatch = String(boy.city || '').toLowerCase().includes(cleanSearch);
        const townshipMatch = String(boy.township || '').toLowerCase().includes(cleanSearch);
        const addrMatch = String(boy.address || '').toLowerCase().includes(cleanSearch);
        if (!nameMatch && !codeMatch && !phoneMatch && !cityMatch && !townshipMatch && !addrMatch) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = getCompanionTimestampMs(a);
      const timeB = getCompanionTimestampMs(b);
      if (timeA !== timeB) {
        return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
      }
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
}

