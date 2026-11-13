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
 * Normalizes a companion document from Firestore (supporting both legacy `publicPhoto`
 * and multi-photo `publicPhotos` arrays from Web and Telegram Bot).
 */
export function normalizeCompanionRecord(rawBoy, index = 0) {
  if (!rawBoy || typeof rawBoy !== 'object') {
    return null;
  }

  const id = String(rawBoy.id || `anon-${index}`);
  const boyCode = `WLDB-${id.substring(0, 5).toUpperCase()}`;

  const rawPublicList = Array.isArray(rawBoy.publicPhotos)
    ? rawBoy.publicPhotos.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [];

  if (
    rawPublicList.length === 0 &&
    typeof rawBoy.publicPhoto === 'string' &&
    rawBoy.publicPhoto.trim().length > 0
  ) {
    rawPublicList.push(rawBoy.publicPhoto.trim());
  }

  const fallbackImg = FALLBACK_PORTRAITS[index % FALLBACK_PORTRAITS.length];
  const publicPhotos = rawPublicList.length > 0 ? rawPublicList : [fallbackImg];
  const primaryPhoto = publicPhotos[0];

  const privatePhotos = Array.isArray(rawBoy.privatePhotos)
    ? rawBoy.privatePhotos.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [];

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
    hasUploadedPhoto: rawPublicList.length > 0,
    privatePhotos,
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
