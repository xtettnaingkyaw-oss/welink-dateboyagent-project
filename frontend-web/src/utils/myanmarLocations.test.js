import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MYANMAR_LOCATIONS,
  normalizeLocationKey,
  sanitizeLocationCatalog,
  buildUnifiedLocationCatalog,
  mergeDefaultMyanmarLocations,
  addUniqueLocationToCatalog,
  removeTownshipFromCatalog,
  removeCityFromCatalog,
  renameCityInCatalog,
  renameTownshipInCatalog,
  getCitiesFromCatalog,
  getTownshipsForCity,
  locationExistsInCatalog,
  countCatalogStats,
  paginateLocationItems,
} from './myanmarLocations.js';

test('DEFAULT_MYANMAR_LOCATIONS covers all 15 Myanmar Regions/States/Union Territory with 330 unique townships', () => {
  const stats = countCatalogStats(DEFAULT_MYANMAR_LOCATIONS);
  assert.equal(stats.cityCount, 15);
  assert.equal(stats.townshipCount, 330);

  // Ensure every city is unique and every township inside a city is unique
  const cityKeys = new Set();
  for (const region of DEFAULT_MYANMAR_LOCATIONS) {
    const cKey = normalizeLocationKey(region.city);
    assert.ok(!cityKeys.has(cKey), `Duplicate city found: ${region.city}`);
    cityKeys.add(cKey);

    const tspKeys = new Set();
    for (const tsp of region.townships) {
      const tKey = normalizeLocationKey(tsp);
      assert.ok(!tspKeys.has(tKey), `Duplicate township "${tsp}" in ${region.city}`);
      tspKeys.add(tKey);
    }
  }

  // Spot check major hubs
  const ygnTownships = getTownshipsForCity(DEFAULT_MYANMAR_LOCATIONS, 'ရန်ကုန် (Yangon)');
  assert.equal(ygnTownships.length, 45);
  assert.ok(ygnTownships.includes('ဗဟန်း'));
  assert.ok(ygnTownships.includes('ကမာရွတ်'));

  const mdyTownships = getTownshipsForCity(DEFAULT_MYANMAR_LOCATIONS, 'မန္တလေး (Mandalay)');
  assert.equal(mdyTownships.length, 28);
  assert.ok(mdyTownships.includes('ချမ်းအေးသာစံ'));
  assert.ok(mdyTownships.includes('ပြင်ဦးလွင်'));

  const nptTownships = getTownshipsForCity(DEFAULT_MYANMAR_LOCATIONS, 'နေပြည်တော် (Naypyidaw)');
  assert.equal(nptTownships.length, 8);
  assert.ok(nptTownships.includes('ဇမ္ဗူသီရိ'));
});

test('addUniqueLocationToCatalog prevents duplicates and adds new unique cities/townships', () => {
  const start = sanitizeLocationCatalog([
    { city: 'ရန်ကုန် (Yangon)', townships: ['ဗဟန်း', 'စမ်းချောင်း'] },
  ]);

  // Duplicate township (case/whitespace insensitive) must be rejected
  const dupRes = addUniqueLocationToCatalog(start, '  ရန်ကုန် (yangon) ', '  ဗဟန်း ');
  assert.equal(dupRes.added, false);
  assert.equal(dupRes.reason, 'duplicate_township');
  assert.equal(dupRes.catalog[0].townships.length, 2);

  // New township under existing city
  const addTspRes = addUniqueLocationToCatalog(start, 'ရန်ကုန် (Yangon)', 'လှိုင်');
  assert.equal(addTspRes.added, true);
  assert.equal(addTspRes.reason, 'township_added');
  assert.deepEqual(addTspRes.catalog[0].townships, ['ဗဟန်း', 'စမ်းချောင်း', 'လှိုင်']);

  // Brand new city + township (e.g., Bangkok)
  const addCityRes = addUniqueLocationToCatalog(addTspRes.catalog, 'ဘန်ကောက် (Bangkok)', 'ဆူခွန်ဗစ်');
  assert.equal(addCityRes.added, true);
  assert.equal(addCityRes.reason, 'city_and_township_added');
  assert.equal(addCityRes.catalog.length, 2);
  assert.equal(locationExistsInCatalog(addCityRes.catalog, 'ဘန်ကောက် (Bangkok)', 'ဆူခွန်ဗစ်'), true);
});

test('rename and remove helpers maintain uniqueness cleanly', () => {
  const start = [
    { city: 'ရန်ကုန် (Yangon)', townships: ['ဗဟန်း', 'တာမွေ'] },
    { city: 'မန္တလေး (Mandalay)', townships: ['ချမ်းအေးသာစံ'] },
  ];

  const renamedTsp = renameTownshipInCatalog(start, 'ရန်ကုန် (Yangon)', 'တာမွေ', 'တာမွေမြို့နယ်');
  assert.deepEqual(getTownshipsForCity(renamedTsp, 'ရန်ကုန် (Yangon)'), ['ဗဟန်း', 'တာမွေမြို့နယ်']);

  const removedTsp = removeTownshipFromCatalog(renamedTsp, 'ရန်ကုန် (Yangon)', 'ဗဟန်း');
  assert.deepEqual(getTownshipsForCity(removedTsp, 'ရန်ကုန် (Yangon)'), ['တာမွေမြို့နယ်']);

  const renamedCity = renameCityInCatalog(removedTsp, 'မန္တလေး (Mandalay)', 'မန္တလေးတိုင်း');
  assert.ok(getCitiesFromCatalog(renamedCity).includes('မန္တလေးတိုင်း'));

  const removedCity = removeCityFromCatalog(renamedCity, 'မန္တလေးတိုင်း');
  assert.equal(removedCity.length, 1);
});

test('buildUnifiedLocationCatalog and mergeDefaultMyanmarLocations preserve custom entries without duplicates', () => {
  const customOnly = [{ city: 'ဘန်ကောက် (Bangkok)', townships: ['ဖစ်ချာဘူရီ'] }];
  const merged = mergeDefaultMyanmarLocations(customOnly);
  const stats = countCatalogStats(merged);
  assert.equal(stats.cityCount, 16);
  assert.equal(stats.townshipCount, 331);

  const unified = buildUnifiedLocationCatalog(null, [
    { city: 'ရန်ကုန် (Yangon)', township: 'ဗဟန်း', status: 'approved' }, // already in default
    { city: 'ချင်းမိုင် (Chiang Mai)', township: 'နင်မန်', status: 'approved' },
    { city: 'Pending City', township: 'Pending Tsp', status: 'pending' }, // must be excluded
  ]);
  assert.equal(locationExistsInCatalog(unified, 'ချင်းမိုင် (Chiang Mai)', 'နင်မန်'), true);
  assert.equal(locationExistsInCatalog(unified, 'Pending City', 'Pending Tsp'), false);
});

test('paginateLocationItems paginates cities and townships accurately for Telegram Bot inline keyboards', () => {
  const cities = getCitiesFromCatalog(DEFAULT_MYANMAR_LOCATIONS); // 15 cities
  const page0 = paginateLocationItems(cities, 0, 10);
  assert.equal(page0.items.length, 10);
  assert.equal(page0.page, 0);
  assert.equal(page0.totalPages, 2);
  assert.equal(page0.hasPrev, false);
  assert.equal(page0.hasNext, true);
  assert.equal(page0.items[0].index, 0);

  const page1 = paginateLocationItems(cities, 1, 10);
  assert.equal(page1.items.length, 5);
  assert.equal(page1.page, 1);
  assert.equal(page1.hasPrev, true);
  assert.equal(page1.hasNext, false);
  assert.equal(page1.items[0].index, 10);
});
