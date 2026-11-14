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

