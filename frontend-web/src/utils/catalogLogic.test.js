import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveMediaUrl,
  isLegacyExpiredProneTelegramMedia,
  normalizeCompanionRecord,
  filterAndSortCompanions,
  validateRegistrationForm,
  formatBookingSummary,
  extractTimestampMs,
  toLocalDateKey,
  formatCompanionDateBadge,
  computeAdminDateCounts,
  filterAndSortAdminCompanions,
  extractCompanionChatId,
  resolveSafeTelegramLink,
  filterBulkMessageRecipients,
  formatBulkMessageForRecipient,
  normalizeClientPreference,
  formatClientPreferenceLabel,
  formatClientPreferenceShortBadge,
  matchesClientPreferenceFilter,
  GIRL_ONLY_REMINDER_MESSAGE,
  normalizeBookingClientType,
  formatBookingClientTypeLabel,
  formatBookingClientTypeShortBadge,
  checkClientTypeCompatibility,
  formatKyats,
  calculatePackageDeposit,
  parseLegacyPaymentInfo,
  formatPaymentAccountsToInfoString,
  normalizePricingConfig,
  serializePricingConfigForFirestore,
  getMyanmarTodayParts,
  formatBurmeseBookingDateLabel,
  formatBurmeseBookingTimeLabel,
  buildTelegramDatePickerKeyboard,
  buildTelegramTimePickerKeyboard,
} from './catalogLogic.js';

test('resolveMediaUrl converts Telegram file_ids and legacy api.telegram.org URLs into safe proxy URLs', () => {
  // 1. Explicit fileIdFallback takes priority and never expires
  assert.equal(
    resolveMediaUrl('https://api.telegram.org/file/bot123:ABC/photos/file_1.jpg', 'AgACAgUAAxkBAA'),
    '/api/webhook?file_id=AgACAgUAAxkBAA'
  );

  // 2. Raw Telegram file_id (e.g., from backend-bot/bot.js)
  assert.equal(resolveMediaUrl('AgACAgUAAxkBAA999'), '/api/webhook?file_id=AgACAgUAAxkBAA999');

  // 3. Full domain proxy URL normalized to relative path
  assert.equal(
    resolveMediaUrl('https://welink.vercel.app/api/webhook?file_id=AgACAgU123'),
    '/api/webhook?file_id=AgACAgU123'
  );

  // 4. Legacy api.telegram.org URL stripped of bot token and routed through legacy_path proxy
  assert.equal(
    resolveMediaUrl('https://api.telegram.org/file/bot999999:SECRET_TOKEN/photos/file_42.jpg'),
    '/api/webhook?legacy_path=photos%2Ffile_42.jpg'
  );

  // 5. Video type appends &type=video
  assert.equal(
    resolveMediaUrl('', 'BAACAgUAAxkBAA_VID', 'video'),
    '/api/webhook?file_id=BAACAgUAAxkBAA_VID&type=video'
  );

  // 6. Base64 data: URL takes priority for instant zero-latency rendering
  assert.equal(
    resolveMediaUrl('data:image/jpeg;base64,/9j/4AAQ', 'AgACAgUAAxkBAA'),
    'data:image/jpeg;base64,/9j/4AAQ'
  );
});

test('isLegacyExpiredProneTelegramMedia detects records with raw api.telegram.org links and no file_ids', () => {
  const legacyBoy = {
    id: 'gzhhg123',
    name: 'Htet Myat',
    publicPhotos: ['https://api.telegram.org/file/bot123:SEC/photos/file_10.jpg'],
  };
  assert.equal(isLegacyExpiredProneTelegramMedia(legacyBoy), true);

  const upgradedBoy = {
    id: 'gzhhg123',
    name: 'Htet Myat',
    publicPhotos: ['/api/webhook?file_id=AgACAgUAAxk1'],
    publicFileIds: ['AgACAgUAAxk1'],
  };
  assert.equal(isLegacyExpiredProneTelegramMedia(upgradedBoy), false);
});

test('normalizeCompanionRecord handles publicPhotos, legacy publicPhoto, and Telegram file_ids', () => {
  const fromArray = normalizeCompanionRecord({
    id: 'abc12345',
    name: 'Aung',
    age: 24,
    height: "5'10\"",
    city: 'Yangon',
    township: 'Bahan',
    publicPhotos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
  });

  assert.equal(fromArray.boyCode, 'WLDB-ABC12');
  assert.equal(fromArray.primaryPhoto, 'https://example.com/1.jpg');
  assert.equal(fromArray.publicPhotos.length, 2);
  assert.equal(fromArray.hasUploadedPhoto, true);

  const fromTelegramFileIds = normalizeCompanionRecord({
    id: 'gzhhg999',
    name: 'Htet Myat',
    publicFileIds: ['AgACAgUAA1', 'AgACAgUAA2', 'AgACAgUAA3'],
    privateFileIds: ['AgACAgUPRIV1'],
    privateVideoFileId: 'BAACAgUVID1',
  });
  assert.equal(fromTelegramFileIds.boyCode, 'WLDB-GZHHG');
  assert.equal(fromTelegramFileIds.primaryPhoto, '/api/webhook?file_id=AgACAgUAA1');
  assert.equal(fromTelegramFileIds.publicPhotos.length, 3);
  assert.equal(fromTelegramFileIds.privatePhotos[0], '/api/webhook?file_id=AgACAgUPRIV1');
  assert.equal(
    fromTelegramFileIds.privateVideo,
    '/api/webhook?file_id=BAACAgUVID1&type=video'
  );
});

test('filterAndSortCompanions filters by city, ageRange, searchQuery, and sorts accurately', () => {
  const sample = [
    normalizeCompanionRecord({ id: 'b1111', name: 'Zay', age: '21', city: 'Yangon', township: 'Sanchaung' }),
    normalizeCompanionRecord({ id: 'a2222', name: 'Arkar', age: '25', city: 'Yangon', township: 'Bahan' }),
    normalizeCompanionRecord({ id: 'c3333', name: 'Kyaw', age: '29', city: 'Mandalay', township: 'Chanayethazan' }),
  ];

  const yangonOnly = filterAndSortCompanions(sample, { selectedCity: 'Yangon', sortBy: 'name' });
  assert.equal(yangonOnly.length, 2);
  assert.equal(yangonOnly[0].name, 'Arkar');
  assert.equal(yangonOnly[1].name, 'Zay');

  const age23to27 = filterAndSortCompanions(sample, { ageRange: '23-27' });
  assert.equal(age23to27.length, 1);
  assert.equal(age23to27[0].name, 'Arkar');

  const searchByCode = filterAndSortCompanions(sample, { searchQuery: 'WLDB-C3333' });
  assert.equal(searchByCode.length, 1);
  assert.equal(searchByCode[0].name, 'Kyaw');
});

test('validateRegistrationForm enforces photo minimums and terms without alert()', () => {
  const baseData = {
    name: 'Lin',
    age: '24',
    height: "5' 11\"",
    phone: '09123456789',
    city: 'Yangon',
    township: 'Bahan',
    address: 'No 12, Golden Valley',
  };

  const tooFewPhotos = validateRegistrationForm({
    formData: baseData,
    publicPhotos: ['img1', 'img2'],
    privatePhotos: ['p1', 'p2', 'p3'],
    agreeTerms: true,
    agreePrivacy: true,
  });
  assert.equal(tooFewPhotos.valid, false);
  assert.match(tooFewPhotos.error, /Public Profile/);

  const validResult = validateRegistrationForm({
    formData: { ...baseData, city: 'other' },
    customCity: 'Taunggyi',
    customTownship: 'Myoma',
    publicPhotos: ['1', '2', '3'],
    privatePhotos: ['1', '2', '3'],
    agreeTerms: true,
    agreePrivacy: true,
  });
  assert.equal(validResult.valid, true);
  assert.equal(validResult.finalCity, 'Taunggyi');
  assert.equal(validResult.finalTownship, 'Myoma');
});

test('formatBookingSummary outputs clean structured reservation details', () => {
  const summary = formatBookingSummary({
    bookingRef: 'WL-99X12',
    boy: { id: 'abcde12', boyCode: 'WLDB-ABCDE', name: 'Julian', township: 'Bahan', city: 'Yangon' },
    bookingForm: {
      clientName: 'Alex',
      clientContact: '@alex_vip',
      preferredDate: '2026-12-01',
      preferredTime: '19:30',
      duration: '4 Hours (Half-Day Companion)',
      notes: 'Private rooftop dinner',
    },
  });

  assert.match(summary, /Reference: WL-99X12/);
  assert.match(summary, /Companion: Julian \(WLDB-ABCDE\)/);
  assert.match(summary, /Schedule: 2026-12-01 at 19:30/);
});

test('filterAndSortAdminCompanions sorts newest first (fixing alphabetical Firestore ID burial) and filters by Today, Yesterday, Custom Date, and Search', () => {
  const now = new Date(2026, 10, 14, 2, 0, 0).getTime(); // Nov 14, 2026 02:00 AM local
  const todaySubmission = new Date(2026, 10, 14, 1, 27, 0).getTime(); // Nov 14, 2026 01:27 AM local
  const yesterdaySubmission = new Date(2026, 10, 13, 18, 45, 0).getTime(); // Nov 13, 2026 06:45 PM local
  const olderSubmission = new Date(2026, 10, 5, 14, 15, 0).getTime(); // Nov 05, 2026 02:15 PM local

  // Notice that the newest boy has ID starting with 'z9999' which Firestore's default alphabetical ID sort puts at the bottom!
  const rawPendingBoys = [
    {
      id: 'bi4pg111',
      name: 'Than Htike Zaw',
      phone: '09680865145',
      city: 'ရန်ကုန်',
      township: 'ဗိုလ်တထောင်မြို့နယ်',
      createdAt: { seconds: Math.floor(olderSubmission / 1000), nanoseconds: 0 },
    },
    {
      id: 'byr6d222',
      name: 'shine htet aung',
      phone: '09986578911',
      city: 'ရန်ကုန်မြို့',
      township: 'သာကေတမြို့နယ်',
      createdAt: { toMillis: () => yesterdaySubmission },
    },
    {
      id: 'z9999new',
      name: 'New Telegram Applicant',
      phone: '09777888999',
      city: 'မန္တလေး',
      township: 'ချမ်းအေးသာစံ',
      createdAt: { seconds: Math.floor(todaySubmission / 1000), nanoseconds: 0 },
    },
  ];

  // 1. Default 'all' sort puts newest submission ('z9999new') at #1!
  const allSorted = filterAndSortAdminCompanions(rawPendingBoys, { dateFilter: 'all' }, now);
  assert.equal(allSorted.length, 3);
  assert.equal(allSorted[0].id, 'z9999new');
  assert.equal(allSorted[1].id, 'byr6d222');
  assert.equal(allSorted[2].id, 'bi4pg111');

  // 2. Date counts
  const counts = computeAdminDateCounts(rawPendingBoys, now);
  assert.deepEqual(counts, { all: 3, today: 1, yesterday: 1 });

  // 3. Today filter ('today')
  const todayList = filterAndSortAdminCompanions(rawPendingBoys, { dateFilter: 'today' }, now);
  assert.equal(todayList.length, 1);
  assert.equal(todayList[0].id, 'z9999new');

  // 4. Yesterday filter ('yesterday')
  const yesterdayList = filterAndSortAdminCompanions(rawPendingBoys, { dateFilter: 'yesterday' }, now);
  assert.equal(yesterdayList.length, 1);
  assert.equal(yesterdayList[0].id, 'byr6d222');

  // 5. Custom Date filter ('custom' -> '2026-11-05')
  const customKey = toLocalDateKey(olderSubmission);
  const customList = filterAndSortAdminCompanions(
    rawPendingBoys,
    { dateFilter: 'custom', customDate: customKey },
    now
  );
  assert.equal(customList.length, 1);
  assert.equal(customList[0].id, 'bi4pg111');

  // 6. Search by Code WLDB-Z9999 or phone
  const bySearch = filterAndSortAdminCompanions(
    rawPendingBoys,
    { dateFilter: 'all', searchQuery: 'WLDB-Z9999' },
    now
  );
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].name, 'New Telegram Applicant');

  // 7. Formatted date badge
  const badgeToday = formatCompanionDateBadge(rawPendingBoys[2], now);
  assert.match(badgeToday, /ယနေ့ \(Today\)/);
  assert.equal(extractTimestampMs(rawPendingBoys[1].createdAt), yesterdaySubmission);
});

test('filterBulkMessageRecipients and formatBulkMessageForRecipient filter by All, Location (City/Township), and Selected Date Boys with Chat IDs', () => {
  const sampleBoys = [
    {
      id: 'boy111',
      name: 'Aung Kyaw',
      city: 'Yangon',
      township: 'Bahan',
      status: 'approved',
      telegramChatId: '10001',
      telegramProfileLink: 'https://t.me/Aung Kyaw', // invalid space in legacy link
    },
    {
      id: 'boy222',
      name: 'Min Thu',
      city: 'Yangon',
      township: 'Sanchaung',
      status: 'pending',
      telegramProfileLink: 'tg://user?id=10002', // fallback Chat ID from profile link
    },
    {
      id: 'boy333',
      name: 'Zin Ko',
      city: 'Mandalay',
      township: 'Chanayethazan',
      status: 'approved',
      telegramChatId: '10003',
      telegramProfileLink: 'https://t.me/zinko_vip',
    },
    {
      id: 'boy444_web_only',
      name: 'Web Only Applicant',
      city: 'Yangon',
      township: 'Bahan',
      status: 'pending',
      // No telegramChatId -> should be excluded from Bot Bulk Messaging
    },
  ];

  // Safe Telegram link fixes space in t.me/Aung Kyaw -> tg://user?id=10001
  assert.equal(resolveSafeTelegramLink(sampleBoys[0]), 'tg://user?id=10001');
  assert.equal(resolveSafeTelegramLink(sampleBoys[2]), 'https://t.me/zinko_vip');
  assert.equal(extractCompanionChatId(sampleBoys[1]), '10002');
  assert.equal(extractCompanionChatId(sampleBoys[3]), '');

  // 1. Mode 'all' returns all 3 boys with Chat IDs (excluding web-only boy444)
  const allRecipients = filterBulkMessageRecipients(sampleBoys, { targetMode: 'all' });
  assert.equal(allRecipients.length, 3);

  // 2. Mode 'all' + statusFilter 'approved' returns 2 boys
  const approvedOnly = filterBulkMessageRecipients(sampleBoys, {
    targetMode: 'all',
    statusFilter: 'approved',
  });
  assert.equal(approvedOnly.length, 2);

  // 3. Mode 'location' by City + Township
  const yangonSanchaung = filterBulkMessageRecipients(sampleBoys, {
    targetMode: 'location',
    selectedCity: 'Yangon',
    selectedTownship: 'Sanchaung',
  });
  assert.equal(yangonSanchaung.length, 1);
  assert.equal(yangonSanchaung[0].id, 'boy222');

  // 4. Mode 'selected' by explicit IDs
  const customSelected = filterBulkMessageRecipients(sampleBoys, {
    targetMode: 'selected',
    selectedIds: ['boy111', 'boy333'],
  });
  assert.equal(customSelected.length, 2);

  // 5. Personalized message formatting
  const msg = formatBulkMessageForRecipient(
    'မင်္ဂလာပါ {name} ({code})၊ {city} - {township} အတွက် အလုပ်ချိတ်ဆက်မှု ရှိပါသည်။',
    sampleBoys[0],
    'WE LINK Admin အသိပေးချက်'
  );
  assert.match(msg, /📢 <b>WE LINK Admin အသိပေးချက်<\/b>/);
  assert.match(msg, /မင်္ဂလာပါ Aung Kyaw \(WLDB-BOY11\)/);
  assert.match(msg, /Yangon - Bahan/);
});

test('PWA manifest and iOS Add to Home Screen icons are valid PNGs and linked in index.html', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const rootDir = path.resolve(import.meta.dirname, '../..');

  const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert.match(htmlContent, /rel="apple-touch-icon"[^>]*href="\/apple-touch-icon\.png"/);
  assert.match(htmlContent, /name="apple-mobile-web-app-title" content="WE LINK"/);
  assert.match(htmlContent, /rel="manifest" href="\/manifest\.webmanifest"/);

  const manifestRaw = fs.readFileSync(path.join(rootDir, 'public/manifest.webmanifest'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.short_name, 'WE LINK');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((i) => i.sizes === '180x180' && i.type === 'image/png'));
  assert.ok(manifest.icons.some((i) => i.sizes === '192x192' && i.type === 'image/png'));
  assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.type === 'image/png'));

  // Verify PNG magic signature (89 50 4E 47 0D 0A 1A 0A) so iOS Safari never rejects the icon
  for (const file of ['apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png']) {
    const buf = fs.readFileSync(path.join(rootDir, 'public', file));
    assert.equal(buf[0], 0x89, `${file} must have PNG signature byte 0`);
    assert.equal(buf[1], 0x50, `${file} must have PNG signature byte 1 ('P')`);
    assert.equal(buf[2], 0x4e, `${file} must have PNG signature byte 2 ('N')`);
    assert.equal(buf[3], 0x47, `${file} must have PNG signature byte 3 ('G')`);
  }
});

test('Client Preference (Girl Only / LGBT Only / Both) normalization, Girl Only reminder confirmation, and filtering work end-to-end', () => {
  // 1. Normalization handles canonical keys, Burmese text, and defaults safely to 'both'
  assert.equal(normalizeClientPreference('girl_only'), 'girl_only');
  assert.equal(normalizeClientPreference('Girl Only ပဲ လိုက်မည်'), 'girl_only');
  assert.equal(normalizeClientPreference('lgbt_only'), 'lgbt_only');
  assert.equal(normalizeClientPreference('LGBT Only'), 'lgbt_only');
  assert.equal(normalizeClientPreference('both'), 'both');
  assert.equal(normalizeClientPreference(undefined), 'both');

  assert.match(formatClientPreferenceLabel('girl_only'), /Girl Only/);
  assert.equal(formatClientPreferenceShortBadge('lgbt_only'), 'LGBT Only');
  assert.equal(formatClientPreferenceShortBadge('both'), 'Girl & LGBT (Both)');
  assert.match(GIRL_ONLY_REMINDER_MESSAGE, /Girl Only/);
  assert.match(GIRL_ONLY_REMINDER_MESSAGE, /ဧည့်သည်/);

  // 2. matchesClientPreferenceFilter supports exact & client-centric ('for_girl' / 'for_lgbt') filters
  assert.equal(matchesClientPreferenceFilter('girl_only', 'for_girl'), true);
  assert.equal(matchesClientPreferenceFilter('both', 'for_girl'), true);
  assert.equal(matchesClientPreferenceFilter('lgbt_only', 'for_girl'), false);
  assert.equal(matchesClientPreferenceFilter('lgbt_only', 'for_lgbt'), true);
  assert.equal(matchesClientPreferenceFilter('both', 'for_lgbt'), true);
  assert.equal(matchesClientPreferenceFilter('girl_only', 'for_lgbt'), false);
  assert.equal(matchesClientPreferenceFilter('girl_only', 'girl_only'), true);
  assert.equal(matchesClientPreferenceFilter('both', 'girl_only'), false);

  // 3. Registration validation requires clientPreference and blocks Girl Only until reminder is confirmed
  const baseData = {
    name: 'Thura',
    age: '23',
    height: "5' 9\"",
    phone: '09777111222',
    city: 'ရန်ကုန် (Yangon)',
    township: 'စမ်းချောင်း (Sanchaung)',
    address: 'Sanchaung Street',
  };

  const missingPref = validateRegistrationForm({
    formData: { ...baseData, clientPreference: '' },
    publicPhotos: ['1', '2', '3'],
    privatePhotos: ['1', '2', '3'],
    agreeTerms: true,
    agreePrivacy: true,
    requireClientPreference: true,
  });
  assert.equal(missingPref.valid, false);
  assert.match(missingPref.error, /Girl Only \/ LGBT Only \/ နှစ်ခုလုံး/);

  const unconfirmedGirlOnly = validateRegistrationForm({
    formData: { ...baseData, clientPreference: 'girl_only' },
    publicPhotos: ['1', '2', '3'],
    privatePhotos: ['1', '2', '3'],
    agreeTerms: true,
    agreePrivacy: true,
    requireClientPreference: true,
    girlOnlyConfirmed: false,
  });
  assert.equal(unconfirmedGirlOnly.valid, false);
  assert.match(unconfirmedGirlOnly.error, /Girl Only/);

  const confirmedGirlOnly = validateRegistrationForm({
    formData: { ...baseData, clientPreference: 'girl_only' },
    publicPhotos: ['1', '2', '3'],
    privatePhotos: ['1', '2', '3'],
    agreeTerms: true,
    agreePrivacy: true,
    requireClientPreference: true,
    girlOnlyConfirmed: true,
  });
  assert.equal(confirmedGirlOnly.valid, true);
  assert.equal(confirmedGirlOnly.finalClientPreference, 'girl_only');

  // 4. Directory, Admin, and Bulk Message filtering by clientPreference
  const companions = [
    normalizeCompanionRecord({ id: 'g1', name: 'GirlPrefBoy', age: 23, city: 'Yangon', clientPreference: 'girl_only', telegramChatId: '2001' }),
    normalizeCompanionRecord({ id: 'l1', name: 'LgbtPrefBoy', age: 25, city: 'Yangon', clientPreference: 'lgbt_only', telegramChatId: '2002' }),
    normalizeCompanionRecord({ id: 'b1', name: 'BothPrefBoy', age: 24, city: 'Yangon', clientPreference: 'both', telegramChatId: '2003' }),
  ];

  assert.equal(filterAndSortCompanions(companions, { clientPreference: 'girl_only' }).length, 1);
  assert.equal(filterAndSortCompanions(companions, { clientPreference: 'for_girl' }).length, 2);
  assert.equal(filterAndSortAdminCompanions(companions, { clientPreference: 'lgbt_only' }).length, 1);
  assert.equal(
    filterBulkMessageRecipients(companions, { targetMode: 'all', clientPreference: 'girl_only' }).length,
    1
  );
  const formattedPrefMsg = formatBulkMessageForRecipient(
    'Hello {name} - {preference}',
    companions[0],
    'Notice'
  );
  assert.match(formattedPrefMsg, /Girl Only/);
});

test('Dating Request Client Type (Girl / LGBT) normalization, Date Boy compatibility verification, and booking summary formatting', () => {
  // 1. Normalization of Client Type
  assert.equal(normalizeBookingClientType('girl'), 'girl');
  assert.equal(normalizeBookingClientType('👩 Girl (အမျိုးသမီး ဧည့်သည်)'), 'girl');
  assert.equal(normalizeBookingClientType('lgbt'), 'lgbt');
  assert.equal(normalizeBookingClientType('🏳️‍🌈 LGBT ဧည့်သည်'), 'lgbt');
  assert.equal(normalizeBookingClientType(''), '');

  assert.match(formatBookingClientTypeLabel('girl'), /Girl/);
  assert.match(formatBookingClientTypeLabel('lgbt'), /LGBT/);
  assert.equal(formatBookingClientTypeShortBadge('girl'), '👩 Girl ဧည့်သည်');
  assert.equal(formatBookingClientTypeShortBadge('lgbt'), '🏳️‍🌈 LGBT ဧည့်သည်');

  // 2. Compatibility check between Client Type ('girl' | 'lgbt') and Date Boy preference ('girl_only' | 'lgbt_only' | 'both')
  const missingTypeCheck = checkClientTypeCompatibility('', 'both');
  assert.equal(missingTypeCheck.compatible, false);
  assert.match(missingTypeCheck.warning, /Girl.*LGBT/);

  assert.equal(checkClientTypeCompatibility('girl', 'girl_only').compatible, true);
  assert.equal(checkClientTypeCompatibility('girl', 'both').compatible, true);

  const girlWithLgbtOnlyBoy = checkClientTypeCompatibility('girl', 'lgbt_only');
  assert.equal(girlWithLgbtOnlyBoy.compatible, false);
  assert.match(girlWithLgbtOnlyBoy.warning, /LGBT Only/);

  assert.equal(checkClientTypeCompatibility('lgbt', 'lgbt_only').compatible, true);
  assert.equal(checkClientTypeCompatibility('lgbt', 'both').compatible, true);

  const lgbtWithGirlOnlyBoy = checkClientTypeCompatibility('lgbt', 'girl_only');
  assert.equal(lgbtWithGirlOnlyBoy.compatible, false);
  assert.match(lgbtWithGirlOnlyBoy.warning, /Girl Only/);

  // 3. Booking summary includes Client Type
  const summaryWithClientType = formatBookingSummary({
    bookingRef: 'WL-88G11',
    boy: { id: 'abcde12', boyCode: 'WLDB-ABCDE', name: 'Julian', township: 'Bahan', city: 'Yangon' },
    bookingForm: {
      clientName: 'May',
      clientContact: '@may_vip',
      clientType: 'girl',
      preferredDate: '2026-12-05',
      preferredTime: '20:00',
      duration: '3 Hours (Dinner / Evening Social)',
      notes: 'Fine dining reservation',
    },
  });
  assert.match(summaryWithClientType, /Client Type: 👩 Girl \(အမျိုးသမီး ဧည့်သည်\)/);
});

test('Pricing Config, Package Menu Cards (Duration, Price, Deposit), and Payment Accounts normalize and serialize cleanly', () => {
  // 1. Legacy Firestore settings normalize into 3 rich Menu Cards (Section, Day, Night) with durations
  const normalizedFromLegacy = normalizePricingConfig({
    feeSec: 80000,
    feeDay: 320000,
    feeNight: 350000,
    clientIdFee: 15000,
    privFee: 12000,
    paymentInfo: 'KPay: 09123456789 (U Kyaw) | WavePay: 09987654321 (Daw Mya)',
  });

  assert.equal(normalizedFromLegacy.depositPercent, 50);
  assert.equal(normalizedFromLegacy.clientIdFee, 15000);
  assert.equal(normalizedFromLegacy.privFee, 12000);
  assert.equal(normalizedFromLegacy.datingPackages.length, 3);
  assert.equal(normalizedFromLegacy.datingPackages[0].id, 'sec');
  assert.equal(normalizedFromLegacy.datingPackages[0].price, 80000);
  assert.ok(normalizedFromLegacy.datingPackages[0].duration.length > 0);
  assert.equal(normalizedFromLegacy.datingPackages[1].price, 320000);
  assert.equal(normalizedFromLegacy.datingPackages[2].price, 350000);

  // 2. Payment accounts parsed from legacy string and formatted back
  assert.equal(normalizedFromLegacy.paymentAccounts.length, 2);
  assert.equal(normalizedFromLegacy.paymentAccounts[0].accountNumber, '09123456789');
  assert.equal(normalizedFromLegacy.paymentAccounts[0].accountName, 'U Kyaw');
  assert.equal(normalizedFromLegacy.paymentAccounts[1].accountNumber, '09987654321');
  assert.match(formatPaymentAccountsToInfoString(normalizedFromLegacy.paymentAccounts), /09123456789/);

  // 3. Deposit calculation and Kyats formatting
  assert.equal(calculatePackageDeposit(70000, 50).depositAmount, 35000);
  assert.equal(calculatePackageDeposit(70000, 50).remainingAmount, 35000);
  assert.equal(calculatePackageDeposit(300000, 30).depositAmount, 90000);
  assert.equal(calculatePackageDeposit(300000, 30).remainingAmount, 210000);
  assert.equal(formatKyats(300000), '300,000');

  // 4. Custom Menu Card addition + Firestore serialization keeps legacy fields in sync
  const customConfig = {
    ...normalizedFromLegacy,
    depositPercent: 30,
    datingPackages: [
      ...normalizedFromLegacy.datingPackages,
      {
        id: 'vip_weekend',
        icon: '💎',
        title: 'VIP Weekend Getaway',
        nameMm: 'ပိတ်ရက် အထူးခရီးစဉ် Package',
        duration: '၂၄ နာရီ (Full Day & Night)',
        price: 600000,
        description: 'VIP ခရီးစဉ် အဖော်လိုက်ပေးခြင်း',
        badge: 'VIP Special',
        enabled: true,
      },
    ],
  };

  const payload = serializePricingConfigForFirestore(customConfig);
  assert.equal(payload.feeSec, 80000);
  assert.equal(payload.feeDay, 320000);
  assert.equal(payload.feeNight, 350000);
  assert.equal(payload.depositPercent, 30);
  assert.equal(payload.datingPackages.length, 4);
  assert.equal(payload.datingPackages[3].duration, '၂၄ နာရီ (Full Day & Night)');

  // 5. parseLegacyPaymentInfo handles empty input gracefully with default account
  const fallbackAccounts = parseLegacyPaymentInfo('');
  assert.equal(fallbackAccounts.length, 1);
  assert.equal(fallbackAccounts[0].accountNumber, '09123456789');
});

test('Telegram Bot Date Picker & Time Picker generate calendar grids, Burmese weekday labels, and time slots accurately', () => {
  // Nov 25, 2026 06:00 AM MMT = Nov 24, 2026 23:30 UTC
  const sampleNowUtcMs = Date.UTC(2026, 10, 24, 23, 30, 0);
  const parts = getMyanmarTodayParts(sampleNowUtcMs);
  assert.equal(parts.todayKey, '2026-11-25');
  assert.equal(parts.tomorrowKey, '2026-11-26');
  assert.equal(parts.dayAfterTomorrowKey, '2026-11-27');

  // Date formatting with Burmese weekday & relative day badges
  assert.equal(
    formatBurmeseBookingDateLabel('2026-11-25', sampleNowUtcMs),
    '2026-11-25 (ဗုဒ္ဓဟူးနေ့ · ယနေ့ (Today))'
  );
  assert.equal(
    formatBurmeseBookingDateLabel('26/11/2026', sampleNowUtcMs),
    '2026-11-26 (ကြာသပတေးနေ့ · မနက်ဖြန် (Tomorrow))'
  );
  assert.equal(
    formatBurmeseBookingDateLabel('2026-12-05', sampleNowUtcMs),
    '2026-12-05 (စနေနေ့)'
  );

  // Time formatting with Burmese period of day
  assert.equal(formatBurmeseBookingTimeLabel('09:00 AM'), '09:00 AM (နံနက်ပိုင်း)');
  assert.equal(formatBurmeseBookingTimeLabel('02:00 PM'), '02:00 PM (နေ့လယ်ပိုင်း)');
  assert.equal(formatBurmeseBookingTimeLabel('06:00 PM'), '06:00 PM (ညနေပိုင်း)');
  assert.equal(formatBurmeseBookingTimeLabel('08:00 PM'), '08:00 PM (ညပိုင်း)');
  assert.equal(formatBurmeseBookingTimeLabel('20:30'), '08:30 PM (ညပိုင်း)');
  assert.equal(formatBurmeseBookingTimeLabel('ASAP'), '⚡ အမြန်ဆုံး / ချက်ချင်း (ASAP)');

  // Calendar Date Picker keyboard structure
  const datePicker = buildTelegramDatePickerKeyboard(
    '2026-11',
    sampleNowUtcMs,
    'HIRFORCE_L_boy123'
  );
  assert.equal(datePicker.year, 2026);
  assert.equal(datePicker.month, 11);
  const flatDateCallbacks = datePicker.inline_keyboard
    .flat()
    .map((btn) => btn.callback_data);
  assert.ok(flatDateCallbacks.includes('HDATE_S_2026-11-25'));
  assert.ok(flatDateCallbacks.includes('HDATE_S_2026-11-26'));
  assert.ok(flatDateCallbacks.includes('HDATE_M_2026-12'));
  assert.ok(flatDateCallbacks.includes('HDATE_PAST'));
  assert.ok(flatDateCallbacks.includes('HDATE_CUSTOM'));
  assert.ok(flatDateCallbacks.includes('HIRFORCE_L_boy123'));

  // Time Picker keyboard structure
  const timePicker = buildTelegramTimePickerKeyboard();
  const flatTimeCallbacks = timePicker.inline_keyboard
    .flat()
    .map((btn) => btn.callback_data);
  assert.ok(flatTimeCallbacks.includes('HTIME_S_09:00 AM'));
  assert.ok(flatTimeCallbacks.includes('HTIME_S_02:00 PM'));
  assert.ok(flatTimeCallbacks.includes('HTIME_S_08:00 PM'));
  assert.ok(flatTimeCallbacks.includes('HTIME_S_ASAP'));
  assert.ok(flatTimeCallbacks.includes('HTIME_CUSTOM'));
  assert.ok(flatTimeCallbacks.includes('HDATE_OPEN'));
});







