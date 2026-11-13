import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCompanionRecord,
  filterAndSortCompanions,
  validateRegistrationForm,
  formatBookingSummary,
} from './catalogLogic.js';

test('normalizeCompanionRecord handles both publicPhotos array and legacy publicPhoto string', () => {
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

  const fromLegacy = normalizeCompanionRecord({
    id: 'xyz98765',
    name: 'Min',
    publicPhoto: 'https://example.com/legacy.jpg',
  });
  assert.equal(fromLegacy.boyCode, 'WLDB-XYZ98');
  assert.equal(fromLegacy.primaryPhoto, 'https://example.com/legacy.jpg');
  assert.equal(fromLegacy.publicPhotos.length, 1);
  assert.equal(fromLegacy.hasUploadedPhoto, true);
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
