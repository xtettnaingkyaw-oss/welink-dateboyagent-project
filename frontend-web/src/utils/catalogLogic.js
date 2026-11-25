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

export const CLIENT_PREFERENCE_OPTIONS = [
  {
    id: 'both',
    label: 'နှစ်ခုလုံး (Girl & LGBT နှစ်မျိုးလုံး အဆင်ပြေသည်)',
    shortLabel: 'Girl & LGBT (Both)',
    botButtonText: '🌟 နှစ်ခုလုံး (Girl & LGBT အဆင်ပြေသည်)',
    desc: 'အမျိုးသမီး ဧည့်သည်ရော LGBT ဧည့်သည်ပါ နှစ်မျိုးလုံး လက်ခံနိုင်သည် (ဧည့်သည်ရရှိနိုင်ခြေ အမြင့်ဆုံး)',
  },
  {
    id: 'lgbt_only',
    label: 'LGBT Only (LGBT သီးသန့်သာ လိုက်မည်)',
    shortLabel: 'LGBT Only',
    botButtonText: '🏳️‍🌈 LGBT Only (LGBT သီးသန့်)',
    desc: 'LGBT ဧည့်သည် သီးသန့်သာ လက်ခံလိုသည်',
  },
  {
    id: 'girl_only',
    label: 'Girl Only (အမျိုးသမီး သီးသန့်သာ လိုက်မည်)',
    shortLabel: 'Girl Only',
    botButtonText: '👩 Girl Only (အမျိုးသမီး သီးသန့်)',
    desc: 'အမျိုးသမီး ဧည့်သည် သီးသန့်သာ လက်ခံလိုသည် (⚠️ ဧည့်သည်ရရှိမှု နည်းပါးနိုင်ပါသည်)',
  },
];

export const GIRL_ONLY_REMINDER_MESSAGE =
  '⚠️ သတိပေးချက် (Reminder): "Girl Only (အမျိုးသမီး သီးသန့်)" သာ ရွေးချယ်ထားပါက အေဂျင်စီ၏ လက်ရှိ ဧည့်သည်ခေါ်ယူမှု အချိုးအစားအရ ဧည့်သည်ရရှိမှု သိသာစွာ နည်းပါးနိုင်ပြီး အချိန်ပိုမိုစောင့်ဆိုင်းရနိုင်ပါသည်။ ဧည့်သည် ပိုမိုမြန်ဆန်စွာ ရရှိလိုပါက "နှစ်ခုလုံး (Girl & LGBT အဆင်ပြေသည်)" ကို ရွေးချယ်ရန် အကြံပြုပါသည်။';

/**
 * Normalizes any raw clientPreference value ('girl_only' | 'lgbt_only' | 'both')
 * defaulting to 'both' for legacy records that predate this field.
 */
export function normalizeClientPreference(rawPref) {
  if (!rawPref || typeof rawPref !== 'string') return 'both';
  const clean = rawPref.trim().toLowerCase();
  if (clean === 'girl_only' || clean === 'girl' || clean.includes('girl only')) {
    return 'girl_only';
  }
  if (clean === 'lgbt_only' || clean === 'lgbt' || clean.includes('lgbt only')) {
    return 'lgbt_only';
  }
  if (clean === 'both' || clean.includes('နှစ်ခုလုံး')) {
    return 'both';
  }
  return 'both';
}

/**
 * Returns a full human-readable Burmese + English label for a client preference code.
 */
export function formatClientPreferenceLabel(rawPref) {
  const norm = normalizeClientPreference(rawPref);
  const found = CLIENT_PREFERENCE_OPTIONS.find((o) => o.id === norm);
  return found ? found.label : CLIENT_PREFERENCE_OPTIONS[0].label;
}

/**
 * Returns a compact badge label ('Girl & LGBT (Both)' | 'LGBT Only' | 'Girl Only').
 */
export function formatClientPreferenceShortBadge(rawPref) {
  const norm = normalizeClientPreference(rawPref);
  const found = CLIENT_PREFERENCE_OPTIONS.find((o) => o.id === norm);
  return found ? found.shortLabel : 'Girl & LGBT (Both)';
}

/**
 * Checks if a companion's clientPreference matches a requested filter:
 * - 'all' or '': matches everyone
 * - 'girl_only': matches strictly 'girl_only'
 * - 'lgbt_only': matches strictly 'lgbt_only'
 * - 'both': matches strictly 'both'
 * - 'for_girl': matches companions available for female clients ('girl_only' OR 'both')
 * - 'for_lgbt': matches companions available for LGBT clients ('lgbt_only' OR 'both')
 */
export function matchesClientPreferenceFilter(boyPref, filterValue = 'all') {
  if (!filterValue || filterValue === 'all') return true;
  const norm = normalizeClientPreference(boyPref);
  if (filterValue === 'for_girl') {
    return norm === 'girl_only' || norm === 'both';
  }
  if (filterValue === 'for_lgbt') {
    return norm === 'lgbt_only' || norm === 'both';
  }
  return norm === filterValue;
}

export const BOOKING_CLIENT_TYPE_OPTIONS = [
  {
    id: 'girl',
    label: '👩 Girl (အမျိုးသမီး ဧည့်သည်)',
    shortLabel: '👩 Girl ဧည့်သည်',
    botButtonText: '👩 Girl (အမျိုးသမီး ဧည့်သည်)',
    desc: 'အမျိုးသမီး ဧည့်သည်အနေဖြင့် Date Boy ခေါ်ယူမည်',
  },
  {
    id: 'lgbt',
    label: '🏳️‍🌈 LGBT (LGBT ဧည့်သည်)',
    shortLabel: '🏳️‍🌈 LGBT ဧည့်သည်',
    botButtonText: '🏳️‍🌈 LGBT (LGBT ဧည့်သည်)',
    desc: 'LGBT ဧည့်သည်အနေဖြင့် Date Boy ခေါ်ယူမည်',
  },
];

/**
 * Normalizes a client's declared identity type ('girl' | 'lgbt' | '') when placing a Dating Request.
 */
export function normalizeBookingClientType(rawType) {
  if (!rawType || typeof rawType !== 'string') return '';
  const clean = rawType.trim().toLowerCase();
  if (
    clean === 'girl' ||
    clean === 'g' ||
    clean === 'female' ||
    clean === 'woman' ||
    clean.includes('girl') ||
    clean.includes('အမျိုးသမီး')
  ) {
    return 'girl';
  }
  if (clean === 'lgbt' || clean === 'l' || clean.includes('lgbt') || clean.includes('gay')) {
    return 'lgbt';
  }
  return '';
}

/**
 * Formats a full human-readable label for a client's declared type ('👩 Girl (အမျိုးသမီး ဧည့်သည်)' | '🏳️‍🌈 LGBT (LGBT ဧည့်သည်)').
 */
export function formatBookingClientTypeLabel(rawType) {
  const norm = normalizeBookingClientType(rawType);
  const found = BOOKING_CLIENT_TYPE_OPTIONS.find((o) => o.id === norm);
  return found ? found.label : 'မဖော်ပြထားပါ (Unspecified)';
}

/**
 * Formats a short badge for a client's declared type ('👩 Girl ဧည့်သည်' | '🏳️‍🌈 LGBT ဧည့်သည်').
 */
export function formatBookingClientTypeShortBadge(rawType) {
  const norm = normalizeBookingClientType(rawType);
  const found = BOOKING_CLIENT_TYPE_OPTIONS.find((o) => o.id === norm);
  return found ? found.shortLabel : 'ဧည့်သည် (Unspecified)';
}

/**
 * Checks if a Client's declared type ('girl' | 'lgbt') is compatible with a Date Boy's clientPreference ('both' | 'girl_only' | 'lgbt_only').
 */
export function checkClientTypeCompatibility(clientType, boyClientPreference) {
  const normClient = normalizeBookingClientType(clientType);
  const normBoyPref = normalizeClientPreference(boyClientPreference);

  if (!normClient) {
    return {
      compatible: false,
      normalizedClientType: '',
      normalizedBoyPreference: normBoyPref,
      warning: 'ကျေးဇူးပြု၍ သင်သည် Girl (အမျိုးသမီး ဧည့်သည်) သို့မဟုတ် LGBT ဧည့်သည် ဖြစ်ကြောင်း အရင်ဆုံး ရွေးချယ်အသိပေးပါ။',
    };
  }

  if (normClient === 'lgbt' && normBoyPref === 'girl_only') {
    return {
      compatible: false,
      normalizedClientType: normClient,
      normalizedBoyPreference: normBoyPref,
      warning:
        '⚠️ ဤ Date Boy သည် "Girl Only (အမျိုးသမီး သီးသန့်)" သာ လက်ခံမည်ဟု သတ်မှတ်ထားပါသည်။ LGBT ဧည့်သည်များအနေဖြင့် "နှစ်ခုလုံး (Girl & LGBT)" သို့မဟုတ် "LGBT Only" လက်ခံသော Date Boy ကို ရွေးချယ်ပေးပါ။',
    };
  }

  if (normClient === 'girl' && normBoyPref === 'lgbt_only') {
    return {
      compatible: false,
      normalizedClientType: normClient,
      normalizedBoyPreference: normBoyPref,
      warning:
        '⚠️ ဤ Date Boy သည် "LGBT Only (LGBT သီးသန့်)" သာ လက်ခံမည်ဟု သတ်မှတ်ထားပါသည်။ အမျိုးသမီး ဧည့်သည်များအနေဖြင့် "နှစ်ခုလုံး (Girl & LGBT)" သို့မဟုတ် "Girl Only" လက်ခံသော Date Boy ကို ရွေးချယ်ပေးပါ။',
    };
  }

  return {
    compatible: true,
    normalizedClientType: normClient,
    normalizedBoyPreference: normBoyPref,
    warning: null,
  };
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

  const clientPreference = normalizeClientPreference(rawBoy.clientPreference);

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
    clientPreference,
    clientPreferenceLabel: formatClientPreferenceLabel(clientPreference),
    clientPreferenceShort: formatClientPreferenceShortBadge(clientPreference),
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
    clientPreference = 'all',
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
      if (!matchesClientPreferenceFilter(boy.clientPreference, clientPreference)) return false;

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = boy.name?.toLowerCase().includes(q);
        const matchCity = boy.city?.toLowerCase().includes(q);
        const matchTownship = boy.township?.toLowerCase().includes(q);
        const matchCode = boy.boyCode?.toLowerCase().includes(q);
        const matchPref = formatClientPreferenceLabel(boy.clientPreference)
          .toLowerCase()
          .includes(q);
        if (!matchName && !matchCity && !matchTownship && !matchCode && !matchPref) return false;
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
  requireClientPreference = false,
  girlOnlyConfirmed = true,
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

  const rawPref = String(formData.clientPreference || '').trim();
  if (requireClientPreference && !['girl_only', 'lgbt_only', 'both'].includes(rawPref)) {
    return {
      valid: false,
      error:
        'ကျေးဇူးပြု၍ လက်ခံလိုသော ဧည့်သည်အမျိုးအစား (Girl Only / LGBT Only / နှစ်ခုလုံး) ကို ရွေးချယ်ပေးပါ။',
      finalCity: '',
      finalTownship: '',
    };
  }

  if (rawPref === 'girl_only' && !girlOnlyConfirmed) {
    return {
      valid: false,
      error:
        'Girl Only သီးသန့် ရွေးချယ်ထားပါက ဧည့်သည်ရရှိမှု နည်းပါးနိုင်ကြောင်း သတိပေးချက်ကို သိရှိသဘောတူကြောင်း အမှန်ခြစ်ပေးပါ။',
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
    finalClientPreference: normalizeClientPreference(rawPref || 'both'),
  };
}

/**
 * Formats a concise, luxury concierge booking summary text.
 */
export function formatBookingSummary({ bookingRef, boy, bookingForm }) {
  if (!boy || !bookingForm) return '';
  const code = boy.boyCode || `WLDB-${String(boy.id || '').substring(0, 5).toUpperCase()}`;
  const prefLabel = formatClientPreferenceShortBadge(boy.clientPreference);
  const clientTypeLine = bookingForm.clientType
    ? `Client Type: ${formatBookingClientTypeLabel(bookingForm.clientType)}`
    : null;
  return [
    'WE LINK — PRIVATE CONCIERGE RESERVATION',
    `Reference: ${bookingRef}`,
    `Companion: ${boy.name} (${code})`,
    `Preference: ${prefLabel}`,
    `Location: ${boy.township}, ${boy.city}`,
    `Client: ${bookingForm.clientName}`,
    ...(clientTypeLine ? [clientTypeLine] : []),
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
 * by date ('all' | 'today' | 'yesterday' | 'custom'), clientPreference, search query, and sortOrder ('newest' | 'oldest').
 * Always defaults to newest-first so newly submitted Telegram Bot applications appear at #1.
 */
export function filterAndSortAdminCompanions(boys, options = {}, nowMs = Date.now()) {
  if (!Array.isArray(boys)) return [];
  const {
    dateFilter = 'all',
    customDate = '',
    clientPreference = 'all',
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

      if (!matchesClientPreferenceFilter(boy.clientPreference, clientPreference)) {
        return false;
      }

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
        const codeMatch =
          boyCode.includes(cleanSearch) || String(boy.id || '').toLowerCase().includes(cleanSearch);
        const phoneMatch = String(boy.phone || '').toLowerCase().includes(cleanSearch);
        const cityMatch = String(boy.city || '').toLowerCase().includes(cleanSearch);
        const townshipMatch = String(boy.township || '').toLowerCase().includes(cleanSearch);
        const addrMatch = String(boy.address || '').toLowerCase().includes(cleanSearch);
        const prefMatch = formatClientPreferenceLabel(boy.clientPreference)
          .toLowerCase()
          .includes(cleanSearch);
        if (
          !nameMatch &&
          !codeMatch &&
          !phoneMatch &&
          !cityMatch &&
          !townshipMatch &&
          !addrMatch &&
          !prefMatch
        ) {
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

/**
 * Extracts a numeric/string Telegram Chat ID from a Date Boy record,
 * checking `telegramChatId` first and falling back to `tg://user?id=...` in `telegramProfileLink`.
 */
export function extractCompanionChatId(boy) {
  if (!boy || typeof boy !== 'object') return '';
  if (
    boy.telegramChatId !== undefined &&
    boy.telegramChatId !== null &&
    String(boy.telegramChatId).trim() !== '' &&
    String(boy.telegramChatId).trim() !== '0'
  ) {
    return String(boy.telegramChatId).trim();
  }
  if (typeof boy.telegramProfileLink === 'string') {
    const match = boy.telegramProfileLink.match(/id=(\d+)/);
    if (match && match[1]) return match[1];
  }
  return '';
}

/**
 * Resolves a valid clickable Telegram profile link for a Date Boy.
 * Fixes legacy records where `first_name` with spaces was accidentally placed after `https://t.me/`.
 */
export function resolveSafeTelegramLink(boy) {
  if (!boy || typeof boy !== 'object') return '';
  const chatId = extractCompanionChatId(boy);
  const rawLink = typeof boy.telegramProfileLink === 'string' ? boy.telegramProfileLink.trim() : '';

  if (rawLink.startsWith('tg://user?id=')) {
    return rawLink;
  }
  // Valid Telegram @username link (5+ alphanumeric/underscore characters, no spaces)
  if (/^https?:\/\/t\.me\/[a-zA-Z0-9_]{4,}$/.test(rawLink)) {
    return rawLink;
  }
  if (chatId) {
    return `tg://user?id=${chatId}`;
  }
  return rawLink;
}

/**
 * Filters Date Boys eligible for Telegram Bot Bulk Messaging (must have a valid Telegram Chat ID)
 * based on mode ('all' | 'location' | 'selected'), statusFilter, clientPreference, city, township, searchQuery, and selectedIds.
 */
export function filterBulkMessageRecipients(boys, options = {}) {
  if (!Array.isArray(boys)) return [];
  const {
    targetMode = 'all', // 'all' | 'location' | 'selected'
    statusFilter = 'all', // 'all' | 'approved' | 'pending' | 'hidden'
    clientPreference = 'all',
    selectedCity = '',
    selectedTownship = '',
    searchQuery = '',
    selectedIds = [],
  } = options;

  const cleanSearch = String(searchQuery || '').toLowerCase().trim();
  const selectedSet = new Set(Array.isArray(selectedIds) ? selectedIds : []);

  // Only include Date Boys who actually have a Telegram Chat ID from the Bot
  const withChatId = boys.filter((boy) => Boolean(extractCompanionChatId(boy)));

  return withChatId
    .filter((boy) => {
      if (statusFilter !== 'all' && boy.status !== statusFilter) {
        return false;
      }

      if (
        targetMode !== 'selected' &&
        !matchesClientPreferenceFilter(boy.clientPreference, clientPreference)
      ) {
        return false;
      }

      if (targetMode === 'location') {
        if (selectedCity && String(boy.city || '').trim() !== selectedCity) {
          return false;
        }
        if (selectedTownship && String(boy.township || '').trim() !== selectedTownship) {
          return false;
        }
      } else if (targetMode === 'selected') {
        if (!selectedSet.has(boy.id)) {
          return false;
        }
      }

      if (cleanSearch && targetMode !== 'selected') {
        const boyCode = `WLDB-${String(boy.id || '').substring(0, 5).toUpperCase()}`.toLowerCase();
        const matchName = String(boy.name || '').toLowerCase().includes(cleanSearch);
        const matchCode =
          boyCode.includes(cleanSearch) || String(boy.id || '').toLowerCase().includes(cleanSearch);
        const matchPhone = String(boy.phone || '').toLowerCase().includes(cleanSearch);
        const matchCity = String(boy.city || '').toLowerCase().includes(cleanSearch);
        const matchTownship = String(boy.township || '').toLowerCase().includes(cleanSearch);
        if (!matchName && !matchCode && !matchPhone && !matchCity && !matchTownship) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = getCompanionTimestampMs(a);
      const timeB = getCompanionTimestampMs(b);
      if (timeA !== timeB) return timeB - timeA;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
}

/**
 * Formats a personalized bulk message for a specific Date Boy by substituting
 * {name}, {code}, {city}, {township}, and {preference} placeholders.
 */
export function formatBulkMessageForRecipient(templateText, boy, headerTitle = '') {
  if (!templateText || typeof templateText !== 'string') return '';
  const id = String(boy?.id || '');
  const boyCode = boy?.boyCode || (id ? `WLDB-${id.substring(0, 5).toUpperCase()}` : 'WLDB-XXXXX');
  const name = String(boy?.name || 'Date Boy').trim();
  const city = String(boy?.city || '-').trim();
  const township = String(boy?.township || '-').trim();
  const prefLabel = formatClientPreferenceShortBadge(boy?.clientPreference);

  const body = templateText
    .replace(/\{name\}/gi, name)
    .replace(/\{code\}/gi, boyCode)
    .replace(/\{city\}/gi, city)
    .replace(/\{township\}/gi, township)
    .replace(/\{preference\}/gi, prefLabel)
    .trim();

  const cleanHeader = String(headerTitle || '').trim();
  if (cleanHeader) {
    return `📢 <b>${cleanHeader}</b>\n\n${body}`;
  }
  return body;
}

export const DEFAULT_DATING_PACKAGES = [
  {
    id: 'sec',
    icon: '🕒',
    title: 'Section',
    nameMm: 'Section (အချိန်ပိုင်း)',
    duration: '၂ နာရီ ~ ၃ နာရီ (1 Session)',
    price: 70000,
    description: 'အချိန်တို သီးသန့်တွေ့ဆုံမှု (၁) ကြိမ် / Private Session',
    badge: 'လူကြိုက်များသည်',
    enabled: true,
  },
  {
    id: 'day',
    icon: '☀️',
    title: 'Day',
    nameMm: 'Day (နေ့ပိုင်း အချိန်ပြည့်)',
    duration: 'နေ့ပိုင်း ၈ နာရီ (9:00 AM – 5:00 PM)',
    price: 300000,
    description: 'နေ့ခင်းပိုင်း အပြင်သွား၊ စားသောက်၊ အပန်းဖြေ အဖော်လိုက်ပေးခြင်း',
    badge: '',
    enabled: true,
  },
  {
    id: 'night',
    icon: '🌙',
    title: 'Night',
    nameMm: 'Night (ညပိုင်း / Overnight)',
    duration: 'ညပိုင်း ၁၂ နာရီ / Overnight (8:00 PM – 8:00 AM)',
    price: 300000,
    description: 'ညပိုင်း အချိန်ပြည့် သီးသန့် အဖော်လိုက်ပေးခြင်း (Overnight)',
    badge: 'Best Value',
    enabled: true,
  },
];

export const DURATION_QUICK_PRESETS = [
  '၂ နာရီ ~ ၃ နာရီ (1 Session)',
  '၄ နာရီ (Half-Day Session)',
  'နေ့ပိုင်း ၈ နာရီ (9:00 AM – 5:00 PM)',
  'ညပိုင်း ၁၂ နာရီ / Overnight (8:00 PM – 8:00 AM)',
  '၂၄ နာရီ (Full Day & Overnight VIP)',
];

export const PAYMENT_METHOD_PRESETS = [
  'KBZPay (KPay)',
  'WavePay',
  'AYA Pay',
  'CB Pay',
  'KBZ Bank',
  'AYA Bank',
  'UAB Pay',
];

export function formatKyats(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) return '0';
  return Math.round(num).toLocaleString('en-US');
}

export function calculatePackageDeposit(price, depositPercent = 50) {
  const total = Math.max(0, Math.round(Number(price) || 0));
  const pctRaw = Number(depositPercent);
  const pct = Number.isFinite(pctRaw) && pctRaw >= 0 && pctRaw <= 100 ? Math.round(pctRaw) : 50;
  const depositAmount = Math.round((total * pct) / 100);
  const remainingAmount = Math.max(0, total - depositAmount);
  return {
    total,
    depositPercent: pct,
    depositAmount,
    remainingAmount,
  };
}

export function parseLegacyPaymentInfo(paymentInfo = '') {
  const raw = String(paymentInfo || '').trim();
  if (!raw) {
    return [
      {
        id: 'acc_default_1',
        method: 'KBZPay (KPay)',
        accountNumber: '09123456789',
        accountName: 'WE LINK Concierge',
        enabled: true,
      },
    ];
  }

  const lines = raw
    .split(/\r?\n|\/|;|\|/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed = lines.map((line, index) => {
    // Match patterns like "KPay: 09123456789 (Name)" or "WavePay - 09987654321 (U Mya)"
    const colonIdx = line.indexOf(':');
    let method = 'KBZPay (KPay)';
    let rest = line;
    if (colonIdx > 0 && colonIdx < 28) {
      const m = line.slice(0, colonIdx).trim();
      method = /^kpay$/i.test(m) ? 'KBZPay (KPay)' : m;
      rest = line.slice(colonIdx + 1).trim();
    }

    const nameMatch = rest.match(/\(([^)]+)\)\s*$/);
    let accountName = '';
    if (nameMatch) {
      accountName = nameMatch[1].trim();
      rest = rest.slice(0, nameMatch.index).trim();
    }

    return {
      id: `acc_legacy_${index + 1}`,
      method: method || 'KBZPay (KPay)',
      accountNumber: rest || line,
      accountName: accountName || '',
      enabled: true,
    };
  });

  return parsed.length > 0
    ? parsed
    : [
        {
          id: 'acc_default_1',
          method: 'KBZPay (KPay)',
          accountNumber: raw,
          accountName: '',
          enabled: true,
        },
      ];
}

export function formatPaymentAccountsToInfoString(paymentAccounts = [], fallbackInfo = '') {
  if (!Array.isArray(paymentAccounts) || paymentAccounts.length === 0) {
    return String(fallbackInfo || '').trim();
  }
  const active = paymentAccounts.filter(
    (acc) => acc && acc.enabled !== false && String(acc.accountNumber || '').trim()
  );
  if (active.length === 0) {
    return String(fallbackInfo || '').trim();
  }
  return active
    .map((acc) => {
      const method = String(acc.method || 'KPay').trim();
      const number = String(acc.accountNumber || '').trim();
      const holder = String(acc.accountName || '').trim();
      return `${method}: ${number}${holder ? ` (${holder})` : ''}`;
    })
    .join('\n');
}

export function normalizePricingConfig(rawConfig = {}) {
  const safe = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
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
      .filter((pkg) => pkg && typeof pkg === 'object')
      .map((pkg, idx) => {
        const id = String(pkg.id || `pkg_${idx + 1}`).trim();
        const defaultMatch = DEFAULT_DATING_PACKAGES.find((d) => d.id === id);
        const fallbackPrice =
          id === 'sec'
            ? feeSec
            : id === 'day'
              ? feeDay
              : id === 'night'
                ? feeNight
                : defaultMatch?.price || 100000;
        const priceNum = Number(pkg.price);
        return {
          id,
          icon: String(pkg.icon || defaultMatch?.icon || '💎').trim(),
          title: String(pkg.title || defaultMatch?.title || `Package ${idx + 1}`).trim(),
          nameMm: String(
            pkg.nameMm || pkg.title || defaultMatch?.nameMm || `Package ${idx + 1}`
          ).trim(),
          duration: String(
            pkg.duration || defaultMatch?.duration || 'သတ်မှတ်ချိန်အတိုင်း'
          ).trim(),
          price: Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum) : fallbackPrice,
          description: String(
            pkg.description !== undefined ? pkg.description : defaultMatch?.description || ''
          ).trim(),
          badge: String(pkg.badge !== undefined ? pkg.badge : defaultMatch?.badge || '').trim(),
          enabled: pkg.enabled !== false,
        };
      });
  } else {
    datingPackages = DEFAULT_DATING_PACKAGES.map((pkg) => ({
      ...pkg,
      price:
        pkg.id === 'sec'
          ? feeSec
          : pkg.id === 'day'
            ? feeDay
            : pkg.id === 'night'
              ? feeNight
              : pkg.price,
    }));
  }

  let paymentAccounts = [];
  if (Array.isArray(safe.paymentAccounts) && safe.paymentAccounts.length > 0) {
    paymentAccounts = safe.paymentAccounts
      .filter((acc) => acc && typeof acc === 'object')
      .map((acc, idx) => ({
        id: String(acc.id || `acc_${idx + 1}`),
        method: String(acc.method || 'KBZPay (KPay)').trim(),
        accountNumber: String(acc.accountNumber || '').trim(),
        accountName: String(acc.accountName || '').trim(),
        enabled: acc.enabled !== false,
      }));
  } else {
    paymentAccounts = parseLegacyPaymentInfo(safe.paymentInfo);
  }

  const paymentInfo =
    formatPaymentAccountsToInfoString(paymentAccounts, safe.paymentInfo) ||
    String(safe.paymentInfo || 'Admin ကိုဆက်သွယ်ပါ').trim();

  const secPkg = datingPackages.find((p) => p.id === 'sec') || datingPackages[0];
  const dayPkg = datingPackages.find((p) => p.id === 'day') || datingPackages[1];
  const nightPkg = datingPackages.find((p) => p.id === 'night') || datingPackages[2];

  const activePackages = datingPackages.filter((p) => p.enabled !== false);

  return {
    clientIdFee,
    clientIdNote: String(
      safe.clientIdNote || 'Date Boy များ ရှာဖွေကြည့်ရှုရန် VIP Client ID ကုဒ် (တစ်သက်တာ အသုံးပြုခွင့်)'
    ).trim(),
    privFee,
    privPhotoNote: String(
      safe.privPhotoNote || 'ရွေးချယ်ထားသော Date Boy ၏ သီးသန့် Private ပုံနှင့် Video ကြည့်ရှုခွင့်'
    ).trim(),
    depositPercent,
    feeSec: secPkg ? secPkg.price : feeSec,
    feeDay: dayPkg ? dayPkg.price : feeDay,
    feeNight: nightPkg ? nightPkg.price : feeNight,
    datingPackages,
    activePackages: activePackages.length > 0 ? activePackages : datingPackages,
    paymentAccounts,
    paymentInfo,
  };
}

export function serializePricingConfigForFirestore(draft = {}) {
  const norm = normalizePricingConfig(draft);
  return {
    clientIdFee: norm.clientIdFee,
    clientIdNote: norm.clientIdNote,
    privFee: norm.privFee,
    privPhotoNote: norm.privPhotoNote,
    depositPercent: norm.depositPercent,
    feeSec: norm.feeSec,
    feeDay: norm.feeDay,
    feeNight: norm.feeNight,
    datingPackages: norm.datingPackages,
    paymentAccounts: norm.paymentAccounts,
    paymentInfo: norm.paymentInfo,
  };
}

// ==========================================
// 📅 Telegram Bot Interactive Date & Time Picker Helpers
// ==========================================

export const BURMESE_WEEKDAYS = [
  'တနင်္ဂနွေနေ့',
  'တနင်္လာနေ့',
  'အင်္ဂါနေ့',
  'ဗုဒ္ဓဟူးနေ့',
  'ကြာသပတေးနေ့',
  'သောကြာနေ့',
  'စနေနေ့',
];

export const BURMESE_MONTHS = [
  'January (ဇန်နဝါရီ)',
  'February (ဖေဖော်ဝါရီ)',
  'March (မတ်)',
  'April (ဧပြီ)',
  'May (မေ)',
  'June (ဇွန်)',
  'July (ဇူလိုင်)',
  'August (ဩဂုတ်)',
  'September (စက်တင်ဘာ)',
  'October (အောက်တိုဘာ)',
  'November (နိုဝင်ဘာ)',
  'December (ဒီဇင်ဘာ)',
];

/**
 * Computes today's, tomorrow's, and day-after-tomorrow's YYYY-MM-DD keys in Myanmar Standard Time (UTC+06:30).
 */
export function getMyanmarTodayParts(nowMs = Date.now()) {
  const MMT_OFFSET_MS = (6 * 60 + 30) * 60 * 1000;
  const mmtNow = new Date(nowMs + MMT_OFFSET_MS);
  const year = mmtNow.getUTCFullYear();
  const month = mmtNow.getUTCMonth() + 1; // 1..12
  const day = mmtNow.getUTCDate();

  const toIsoKey = (y, m, d) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  return {
    year,
    month,
    day,
    yearMonth: `${year}-${String(month).padStart(2, '0')}`,
    todayKey: toIsoKey(year, month, day),
    tomorrowKey: toIsoKey(year, month, day + 1),
    dayAfterTomorrowKey: toIsoKey(year, month, day + 2),
  };
}

/**
 * Formats a YYYY-MM-DD date string or custom user date input into a rich Burmese + ISO label.
 */
export function formatBurmeseBookingDateLabel(rawDate = '', nowMs = Date.now()) {
  const trimmed = String(rawDate || '').trim();
  if (!trimmed) return '';

  // Match YYYY-MM-DD or YYYY/MM/DD
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
      const isoKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekdayMm = BURMESE_WEEKDAYS[dt.getUTCDay()] || '';
      const { todayKey, tomorrowKey, dayAfterTomorrowKey } = getMyanmarTodayParts(nowMs);
      let relativeSuffix = '';
      if (isoKey === todayKey) relativeSuffix = ' · ယနေ့ (Today)';
      else if (isoKey === tomorrowKey) relativeSuffix = ' · မနက်ဖြန် (Tomorrow)';
      else if (isoKey === dayAfterTomorrowKey) relativeSuffix = ' · သန်ဘက်ခါ';
      return `${isoKey} (${weekdayMm}${relativeSuffix})`;
    }
  }

  return trimmed;
}

/**
 * Formats a time slot or custom time input into a descriptive Burmese time-of-day label.
 */
export function formatBurmeseBookingTimeLabel(rawTime = '') {
  const trimmed = String(rawTime || '').trim();
  if (!trimmed) return '';
  if (/ASAP|အမြန်ဆုံး|ချက်ချင်း/i.test(trimmed)) {
    return '⚡ အမြန်ဆုံး / ချက်ချင်း (ASAP)';
  }

  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    const hr12 = Number(amPmMatch[1]);
    const min = amPmMatch[2];
    const period = amPmMatch[3].toUpperCase();
    const hr24 = period === 'PM' ? (hr12 === 12 ? 12 : hr12 + 12) : hr12 === 12 ? 0 : hr12;
    const padded12 = `${String(hr12).padStart(2, '0')}:${min} ${period}`;

    let periodMm = 'ညပိုင်း';
    if (hr24 >= 5 && hr24 < 12) periodMm = 'နံနက်ပိုင်း';
    else if (hr24 >= 12 && hr24 < 16) periodMm = 'နေ့လယ်ပိုင်း';
    else if (hr24 >= 16 && hr24 < 19) periodMm = 'ညနေပိုင်း';

    return `${padded12} (${periodMm})`;
  }

  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hr24 = Number(h24Match[1]);
    const min = h24Match[2];
    if (hr24 >= 0 && hr24 <= 23) {
      const period = hr24 >= 12 ? 'PM' : 'AM';
      const hr12 = hr24 % 12 || 12;
      return formatBurmeseBookingTimeLabel(`${String(hr12).padStart(2, '0')}:${min} ${period}`);
    }
  }

  return trimmed;
}

/**
 * Builds an interactive Telegram Inline Calendar Date Picker keyboard with:
 * - Quick Today / Tomorrow / Day-After-Tomorrow buttons
 * - Month navigation (Prev / Next Month)
 * - 7-column calendar day grid (disabling past dates)
 * - Custom date input & Back to Package Menu Cards button
 */
export function buildTelegramDatePickerKeyboard(
  targetYearMonth = '',
  nowMs = Date.now(),
  backCallbackData = ''
) {
  const { year: curYear, month: curMonth, todayKey, tomorrowKey, dayAfterTomorrowKey } =
    getMyanmarTodayParts(nowMs);

  let viewYear = curYear;
  let viewMonth = curMonth; // 1..12
  const ymMatch = String(targetYearMonth || '').match(/^(\d{4})-(\d{1,2})$/);
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
  const prevYm = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const nextYm = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const canGoPrev =
    viewYear > curYear || (viewYear === curYear && viewMonth > curMonth);

  const monthTitle = `${BURMESE_MONTHS[viewMonth - 1]} ${viewYear}`;
  const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

  const rows = [];

  // 1. Quick Select Buttons (Today, Tomorrow, Day After Tomorrow)
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

  // 2. Month Navigation Header Row
  rows.push([
    {
      text: canGoPrev ? '◀️ ယခင်လ' : '·',
      callback_data: canGoPrev ? `HDATE_M_${prevYm}` : 'HDATE_NOP',
    },
    {
      text: `🗓️ ${monthTitle}`,
      callback_data: 'HDATE_NOP',
    },
    {
      text: 'နောက်လ ▶️',
      callback_data: `HDATE_M_${nextYm}`,
    },
  ]);

  // 3. Weekday Header Row
  rows.push(
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd) => ({
      text: wd,
      callback_data: 'HDATE_NOP',
    }))
  );

  // 4. Calendar Grid Cells (7 columns per week row)
  let currentWeek = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ text: ' ', callback_data: 'HDATE_NOP' });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isoDate = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (isoDate < todayKey) {
      currentWeek.push({
        text: '·',
        callback_data: 'HDATE_PAST',
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
      currentWeek.push({ text: ' ', callback_data: 'HDATE_NOP' });
    }
    rows.push(currentWeek);
  }

  // 5. Custom Date & Back Navigation Row
  rows.push([
    {
      text: '✍️ အခြားရက်စွဲ ကိုယ်တိုင်ရိုက်ထည့်မည်',
      callback_data: 'HDATE_CUSTOM',
    },
  ]);

  if (backCallbackData) {
    rows.push([
      {
        text: '⬅️ Package Menu Card ပြန်ရွေးမည်',
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

/**
 * Builds an interactive Telegram Inline Time Picker keyboard organized by time of day.
 */
export function buildTelegramTimePickerKeyboard() {
  const rows = [
    // Morning (နံနက်ပိုင်း)
    [
      { text: '🌅 09:00 AM', callback_data: 'HTIME_S_09:00 AM' },
      { text: '🌅 10:00 AM', callback_data: 'HTIME_S_10:00 AM' },
      { text: '🌅 11:00 AM', callback_data: 'HTIME_S_11:00 AM' },
    ],
    // Afternoon (နေ့လယ် / ညနေပိုင်း)
    [
      { text: '☀️ 12:00 PM', callback_data: 'HTIME_S_12:00 PM' },
      { text: '☀️ 01:00 PM', callback_data: 'HTIME_S_01:00 PM' },
      { text: '☀️ 02:00 PM', callback_data: 'HTIME_S_02:00 PM' },
    ],
    [
      { text: '🌤️ 03:00 PM', callback_data: 'HTIME_S_03:00 PM' },
      { text: '🌤️ 04:00 PM', callback_data: 'HTIME_S_04:00 PM' },
      { text: '🌤️ 05:00 PM', callback_data: 'HTIME_S_05:00 PM' },
    ],
    // Evening & Night (ညနေ / ညပိုင်း)
    [
      { text: '🌆 06:00 PM', callback_data: 'HTIME_S_06:00 PM' },
      { text: '🌆 07:00 PM', callback_data: 'HTIME_S_07:00 PM' },
      { text: '🌙 08:00 PM', callback_data: 'HTIME_S_08:00 PM' },
    ],
    [
      { text: '🌙 09:00 PM', callback_data: 'HTIME_S_09:00 PM' },
      { text: '🌙 10:00 PM', callback_data: 'HTIME_S_10:00 PM' },
      { text: '🌙 11:00 PM', callback_data: 'HTIME_S_11:00 PM' },
    ],
    // Immediate & Custom Time
    [
      {
        text: '⚡ အမြန်ဆုံး / ချက်ချင်း (ASAP)',
        callback_data: 'HTIME_S_ASAP',
      },
    ],
    [
      {
        text: '✍️ အခြားအချိန် စာရိုက်ထည့်မည် (ဥပမာ - 7:30 PM)',
        callback_data: 'HTIME_CUSTOM',
      },
    ],
    [
      {
        text: '⬅️ ခေါ်ယူမည့် နေ့ရက် (Date) ပြန်ရွေးမည်',
        callback_data: 'HDATE_OPEN',
      },
    ],
  ];

  return { inline_keyboard: rows };
}




