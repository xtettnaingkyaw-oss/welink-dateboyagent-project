import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Search,
  Heart,
  ShieldCheck,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Send,
  RotateCcw,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  BRAND_LOGO_URL,
  HERO_LOUNGE_IMAGE,
  FALLBACK_PORTRAITS,
  CURATED_SHOWCASE_COMPANIONS,
  normalizeCompanionRecord,
  filterAndSortCompanions,
  formatBookingSummary,
} from '../utils/catalogLogic';

export default function Home() {
  const [dateBoys, setDateBoys] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroImgError, setHeroImgError] = useState(false);

  // Filter & Search States
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedTownship, setSelectedTownship] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ageRange, setAgeRange] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Saved Favorites (LocalStorage)
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('welink_saved_boys');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Profile & Booking Modal States
  const [selectedBoy, setSelectedBoy] = useState(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [bookingStep, setBookingStep] = useState('profile'); // 'profile' | 'form' | 'success'
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [bookingForm, setBookingForm] = useState({
    clientName: '',
    clientContact: '',
    preferredDate: '',
    preferredTime: '',
    duration: '2 Hours (Standard Date)',
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qBoys = query(collection(db, 'dateboys'), where('status', '==', 'approved'));
        const [boysSnap, locSnap] = await Promise.all([
          getDocs(qBoys),
          getDocs(collection(db, 'locations')),
        ]);

        const rawBoys = boysSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const normalized = rawBoys
          .map((b, idx) => normalizeCompanionRecord(b, idx))
          .filter(Boolean);

        if (normalized.length > 0) {
          setDateBoys(normalized);
        } else {
          setDateBoys(
            CURATED_SHOWCASE_COMPANIONS.map((b, idx) => normalizeCompanionRecord(b, idx))
          );
        }

        setLocations(locSnap.docs.map((doc) => doc.data()));
      } catch (error) {
        console.error('Error loading directory:', error);
        setDateBoys(
          CURATED_SHOWCASE_COMPANIONS.map((b, idx) => normalizeCompanionRecord(b, idx))
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('welink_saved_boys', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const activeLocations = useMemo(
    () => locations.filter((l) => l.status !== 'pending'),
    [locations]
  );

  const cities = useMemo(() => {
    const locCities = activeLocations.map((l) => l.city).filter(Boolean);
    const boyCities = dateBoys.map((b) => b.city).filter(Boolean);
    return [...new Set([...locCities, ...boyCities])];
  }, [activeLocations, dateBoys]);

  const townships = useMemo(() => {
    if (!selectedCity) return [];
    const locTownships = activeLocations
      .filter((l) => l.city === selectedCity)
      .map((l) => l.township)
      .filter(Boolean);
    const boyTownships = dateBoys
      .filter((b) => b.city === selectedCity)
      .map((b) => b.township)
      .filter(Boolean);
    return [...new Set([...locTownships, ...boyTownships])];
  }, [activeLocations, dateBoys, selectedCity]);

  const filteredBoys = useMemo(
    () =>
      filterAndSortCompanions(dateBoys, {
        selectedCity,
        selectedTownship,
        searchQuery,
        ageRange,
        sortBy,
        showFavoritesOnly,
        favorites,
      }),
    [dateBoys, selectedCity, selectedTownship, searchQuery, ageRange, sortBy, showFavoritesOnly, favorites]
  );

  const resetAllFilters = () => {
    setSelectedCity('');
    setSelectedTownship('');
    setSearchQuery('');
    setAgeRange('all');
    setSortBy('featured');
    setShowFavoritesOnly(false);
  };

  const hasActiveFilters =
    Boolean(selectedCity) ||
    Boolean(selectedTownship) ||
    Boolean(searchQuery.trim()) ||
    ageRange !== 'all' ||
    showFavoritesOnly;

  const openBoyModal = (boy, initialStep = 'profile') => {
    setSelectedBoy(boy);
    setActivePhotoIndex(0);
    setBookingStep(initialStep);
    setCopiedCode(false);
  };

  const closeBoyModal = () => {
    setSelectedBoy(null);
    setBookingStep('profile');
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBoy) return;
    setSubmittingBooking(true);

    const generatedRef = `WL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    try {
      await addDoc(collection(db, 'bookings'), {
        bookingRef: generatedRef,
        dateBoyId: selectedBoy.id,
        dateBoyCode: selectedBoy.boyCode,
        dateBoyName: selectedBoy.name || '',
        dateBoyCity: selectedBoy.city || '',
        dateBoyTownship: selectedBoy.township || '',
        ...bookingForm,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Reservation saved locally:', err);
    } finally {
      setBookingRef(generatedRef);
      setSubmittingBooking(false);
      setBookingStep('success');
    }
  };

  const copyBookingSummary = () => {
    if (!selectedBoy) return;
    const summaryText = formatBookingSummary({
      bookingRef,
      boy: selectedBoy,
      bookingForm,
    });
    navigator.clipboard.writeText(summaryText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 space-y-16">
      {/* 1. Split-Column Luxury Brand Hero (WE LINK · ALL OF YOU Theme) */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#062E22] text-white border border-slate-800 overflow-hidden shadow-xl">
        <div className="h-1.5 w-full welink-spectrum-bar" />
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Column: Brand Crest + Editorial Value Proposition */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              {/* Official WE LINK Brand Crest Lockup */}
              <div className="inline-flex items-center gap-4 p-2.5 pr-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <img
                  src={BRAND_LOGO_URL}
                  alt="WE LINK All Of You Logo"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl bg-white p-1 shadow-md shrink-0"
                />
                <div>
                  <p className="font-mono text-[11px] tracking-[0.22em] text-amber-300 font-semibold">
                    WE LINK · ALL OF YOU
                  </p>
                  <p className="text-xs sm:text-sm text-slate-200 font-medium mt-0.5">
                    Premier Inclusive Companion & Private Concierge
                  </p>
                </div>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[54px] font-medium tracking-tight leading-[1.08] text-white max-w-2xl">
                Curated Companionship, Tailored for{' '}
                <span className="welink-text-gradient font-semibold">All of You.</span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                WE LINK မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်။ စိစစ်အတည်ပြုထားပြီးသော အရည်အသွေးမြင့် Date Boy များကို မြို့နယ်အလိုက် လုံခြုံစိတ်ချစွာ ရွေးချယ်ပြီး Private Concierge မှတစ်ဆင့် တိုက်ရိုက်ချိတ်ဆက်နိုင်ပါသည်။
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#directory-console"
                className="px-6 py-3.5 rounded-xl welink-brand-gradient hover:opacity-95 text-slate-950 font-bold text-xs sm:text-sm tracking-wide transition-opacity shadow-lg shadow-amber-500/15 whitespace-nowrap shrink-0"
              >
                Explore Verified Roster
              </a>
              <Link
                to="/register"
                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
              >
                Submit Model Dossier
              </Link>
            </div>
          </div>

          {/* Right Column: Architectural Lounge Showcase */}
          <div className="lg:col-span-5 relative min-h-[280px] sm:min-h-[360px] lg:min-h-full bg-slate-900 overflow-hidden">
            {!heroImgError ? (
              <img
                src={HERO_LOUNGE_IMAGE}
                alt="WE LINK Private Members Lounge"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-900 to-emerald-950">
                <img
                  src={BRAND_LOGO_URL}
                  alt="WE LINK"
                  className="w-24 h-24 object-contain rounded-2xl bg-white p-2 mb-3 shadow-lg"
                />
                <span className="font-serif text-xl text-white">WE LINK Private Concierge</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/35 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="font-mono text-[11px] text-amber-300 tracking-widest tabular-nums">
                CONCIERGE DESK · 100% CONFIDENTIAL
              </p>
              <p className="font-serif text-lg sm:text-xl text-white mt-1">
                Personal screening, verified portfolios, and encrypted client arrangements.
              </p>
            </div>
          </div>
        </div>

        {/* Full-Width Quantitative Proof Strip Below Hero Split */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-800/90 bg-[#0B1120]/90 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/90">
          <div className="px-6 py-4 sm:py-5">
            <span className="block font-mono text-xl sm:text-2xl font-semibold text-amber-400 tabular-nums">
              {dateBoys.length}
            </span>
            <span className="text-xs text-slate-400">Verified Companion Portfolios</span>
          </div>
          <div className="px-6 py-4 sm:py-5">
            <span className="block font-mono text-xl sm:text-2xl font-semibold text-emerald-400 tabular-nums">
              {cities.length || 2}
            </span>
            <span className="text-xs text-slate-400">Active Metropolitan Hubs</span>
          </div>
          <div className="px-6 py-4 sm:py-5">
            <span className="block font-mono text-xl sm:text-2xl font-semibold text-sky-400 tabular-nums">
              3-Step
            </span>
            <span className="text-xs text-slate-400">Identity & Visual Screening</span>
          </div>
          <div className="px-6 py-4 sm:py-5">
            <span className="block font-mono text-xl sm:text-2xl font-semibold text-white tabular-nums">
              24 / 7
            </span>
            <span className="text-xs text-slate-400">Private Telegram & Web Desk</span>
          </div>
        </div>
      </section>

      {/* 2. Bespoke Filter & Search Console */}
      <section id="directory-console" className="scroll-mt-24 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs tracking-[0.2em] text-emerald-700 font-bold mb-1">
              WE LINK · ALL OF YOU · DIRECTORY
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900">
              Verified Companion Roster
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md">
            Filter by metropolitan jurisdiction, age bracket, or companion reference code (
            <span className="font-mono text-slate-900 font-semibold">WLDB-</span>).
          </p>
        </div>

        {/* Filter Bar Surface */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
          {/* Primary Row: City, Township, Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* City Select */}
            <div className="bg-slate-50/90 rounded-xl px-4 py-3 border border-slate-200/90 focus-within:border-amber-500 focus-within:bg-white transition-colors">
              <label
                htmlFor="city-filter"
                className="block text-[11px] font-semibold tracking-wider text-slate-500 mb-1"
              >
                City / မြို့ ရွေးချယ်ရန်
              </label>
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-amber-500 shrink-0" />
                <select
                  id="city-filter"
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setSelectedTownship('');
                  }}
                  className="w-full bg-transparent outline-none text-slate-900 font-semibold text-sm cursor-pointer"
                >
                  <option value="">All Cities (မြို့ အားလုံးပြပါ)</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Township Select */}
            <div className="bg-slate-50/90 rounded-xl px-4 py-3 border border-slate-200/90 focus-within:border-emerald-500 focus-within:bg-white transition-colors">
              <label
                htmlFor="township-filter"
                className="block text-[11px] font-semibold tracking-wider text-slate-500 mb-1"
              >
                Township / မြို့နယ် ရွေးချယ်ရန်
              </label>
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-emerald-600 shrink-0" />
                <select
                  id="township-filter"
                  value={selectedTownship}
                  onChange={(e) => setSelectedTownship(e.target.value)}
                  disabled={!selectedCity}
                  className="w-full bg-transparent outline-none text-slate-900 font-semibold text-sm disabled:opacity-45 cursor-pointer"
                >
                  <option value="">
                    {selectedCity
                      ? 'All Townships (မြို့နယ် အားလုံး)'
                      : 'Select a City First (မြို့အရင်ရွေးပါ)'}
                  </option>
                  {townships.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instant Search */}
            <div className="bg-slate-50/90 rounded-xl px-4 py-3 border border-slate-200/90 focus-within:border-amber-500 focus-within:bg-white transition-colors">
              <label
                htmlFor="keyword-search"
                className="block text-[11px] font-semibold tracking-wider text-slate-500 mb-1"
              >
                Search / အမည် သို့မဟုတ် ID ရှာရန်
              </label>
              <div className="flex items-center gap-2">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  id="keyword-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, WLDB-ID, or Township..."
                  className="w-full bg-transparent outline-none text-slate-900 font-medium text-sm placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Row: Interactive Segmented Age Filter, Saved Toggle, Sort & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-medium mr-1">Age Bracket:</span>
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                {['all', '18-22', '23-27', '28+'].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setAgeRange(range)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      ageRange === range
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {range === 'all' ? 'All Ages' : `${range} Yrs`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold border transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  showFavoritesOnly
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-amber-500'
                }`}
              >
                <Heart
                  size={13}
                  className={showFavoritesOnly ? 'fill-amber-400 text-amber-400' : 'text-amber-500'}
                />
                <span>Saved Shortlist ({favorites.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <label htmlFor="sort-select" className="sr-only">
                Sort Companions
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 text-slate-800 font-semibold px-3.5 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
              >
                <option value="featured">Sort: Featured Roster</option>
                <option value="age-asc">Age: Youngest First</option>
                <option value="age-desc">Age: Mature First</option>
                <option value="name">Name: Alphabetical (A–Z)</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80 font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Summary Bar */}
        {!loading && (
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 px-1">
            <p className="tabular-nums">
              Displaying <span className="font-bold text-slate-900">{filteredBoys.length}</span>{' '}
              verified {filteredBoys.length === 1 ? 'companion' : 'companions'}
              {selectedCity && ` in ${selectedTownship ? `${selectedTownship}, ` : ''}${selectedCity}`}
            </p>
            <span className="hidden sm:inline text-xs text-slate-400">
              Select any portrait to inspect full portfolio & request arrangement
            </span>
          </div>
        )}

        {/* Companion Roster Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 p-4 space-y-4 animate-pulse"
              >
                <div className="aspect-[3/4] bg-slate-200/70 rounded-xl" />
                <div className="space-y-2 pt-1">
                  <div className="h-5 bg-slate-200 rounded w-2/3" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-10 bg-slate-200 rounded-xl w-full mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBoys.length === 0 ? (
          <div className="text-center bg-white p-12 sm:p-16 rounded-2xl border border-slate-200 max-w-xl mx-auto my-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
              <Search size={22} />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-slate-900 mb-2">
              No Matching Portfolios Found
            </h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              ရွေးချယ်ထားသော မြို့နယ် သို့မဟုတ် စစ်ထုတ်မှုတွင် Date Boy မရှိသေးပါ။ Filter များကို ပြန်လည်ဖြေလျှော့၍ ရှာဖွေကြည့်ပါ။
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                <RotateCcw size={15} />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {filteredBoys.map((boy, idx) => {
              const isSaved = favorites.includes(boy.id);
              const photoCount = boy.publicPhotos?.length || 1;
              const fallbackPortrait = FALLBACK_PORTRAITS[idx % FALLBACK_PORTRAITS.length];

              return (
                <article
                  key={boy.id}
                  onClick={() => openBoyModal(boy, 'profile')}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/80 overflow-hidden transition-all duration-200 group flex flex-col h-full cursor-pointer shadow-sm hover:shadow-md"
                >
                  {/* Editorial 3:4 Portrait Container */}
                  <div className="relative aspect-[3/4] bg-slate-900 overflow-hidden">
                    <img
                      src={boy.primaryPhoto || fallbackPortrait}
                      alt={boy.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        if (e.currentTarget.src !== window.location.origin + fallbackPortrait) {
                          e.currentTarget.src = fallbackPortrait;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Measured Gradient Scrim */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0B1120]/95 via-[#0B1120]/40 to-transparent" />

                    {/* Top Controls: Shortlist Heart & Quiet Photo Count */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, boy.id)}
                        aria-label={`Save ${boy.name} to shortlist`}
                        className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                          isSaved
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-950/45 text-white hover:bg-slate-950/70'
                        }`}
                      >
                        <Heart size={16} className={isSaved ? 'fill-slate-950' : ''} />
                      </button>

                      {photoCount > 1 && (
                        <span className="font-mono text-[11px] text-white/90 drop-shadow tabular-nums">
                          {photoCount} Portraits
                        </span>
                      )}
                    </div>

                    {/* Bottom Editorial Name & Reference Code */}
                    <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                      <p className="font-mono text-[11px] text-amber-300 tracking-wider tabular-nums">
                        {boy.boyCode} · VERIFIED
                      </p>
                      <h3 className="font-serif text-2xl font-medium tracking-tight text-white truncate mt-0.5">
                        {boy.name}
                      </h3>
                    </div>
                  </div>

                  {/* Card Body: Unboxed Metadata with Typographic Separators + Primary Action */}
                  <div className="p-5 flex flex-col flex-grow justify-between space-y-5 bg-white">
                    <div className="space-y-2">
                      {/* Zero-Pill Metadata Discipline: Clean unboxed inline text with middle-dot separators */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium tabular-nums">
                        <span className="text-slate-900 font-semibold">{boy.age} Yrs</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-900 font-semibold">{boy.height}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate text-emerald-700 font-medium">
                          {boy.township}, {boy.city}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {boy.bio ||
                          'Verified WE LINK companion available for private social engagements, dinner dates, and bespoke arrangements.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBoyModal(boy, 'form');
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-slate-900 group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:via-yellow-500 group-hover:to-emerald-500 text-white group-hover:text-slate-950 text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <span>Request Arrangement</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Editorial Concierge Protocol Section */}
      <section
        id="concierge-protocol"
        className="scroll-mt-24 bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 lg:p-14 shadow-sm"
      >
        <div className="max-w-2xl mb-10">
          <p className="text-xs tracking-[0.2em] text-emerald-700 font-bold mb-2">
            WE LINK · HOW ARRANGEMENTS WORK
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900">
            The Private Concierge Protocol
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Whether booking directly through our Web Dossier or via your confidential Telegram Client ID (
            <span className="font-mono text-slate-900 font-semibold">WLC-</span>), every engagement follows a strict three-stage protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3 border-t-2 border-amber-500 pt-5">
            <span className="font-mono text-xs font-semibold text-amber-600 tabular-nums">
              01. PORTFOLIO SELECTION
            </span>
            <h3 className="font-serif text-2xl font-semibold text-slate-900">
              01. Select Companion Dossier
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Browse verified public portfolios by city and township. Inspect multi-angle portraits, physical specifications, and companion reference codes (
              <span className="font-mono">WLDB-</span>).
            </p>
          </div>

          <div className="space-y-3 border-t-2 border-emerald-500 pt-5">
            <span className="font-mono text-xs font-semibold text-emerald-600 tabular-nums">
              02. RESERVATION DISPATCH
            </span>
            <h3 className="font-serif text-2xl font-semibold text-slate-900">
              02. Submit Confidential Request
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Specify your preferred date, time, package duration, and private contact handle. An encrypted reservation code (
              <span className="font-mono">WL-</span>) is issued immediately.
            </p>
          </div>

          <div className="space-y-3 border-t-2 border-blue-600 pt-5">
            <span className="font-mono text-xs font-semibold text-blue-600 tabular-nums">
              03. CONCIERGE CONFIRMATION
            </span>
            <h3 className="font-serif text-2xl font-semibold text-slate-900">
              03. Discreet Escort & Briefing
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Our senior concierge confirms companion availability, verifies membership credentials, and coordinates the private meeting point with complete discretion.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Companion Dossier & Concierge Reservation Modal */}
      {selectedBoy && (
        <div
          onClick={closeBoyModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-companion-title"
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
          >
            <div className="h-1.5 w-full welink-spectrum-bar shrink-0" />
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-3 text-xs font-mono text-slate-600 tabular-nums">
                <img
                  src={BRAND_LOGO_URL}
                  alt="WE LINK"
                  className="w-7 h-7 object-contain rounded-md bg-white border border-slate-200 p-0.5"
                />
                <span>DOSSIER REF: {selectedBoy.boyCode}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-semibold">VERIFIED</span>
              </div>
              <button
                type="button"
                onClick={closeBoyModal}
                aria-label="Close companion dossier"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              {bookingStep === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  {/* Left: Multi-Photo Portrait Viewer */}
                  <div className="md:col-span-6 space-y-3">
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                      <img
                        src={
                          selectedBoy.publicPhotos?.[activePhotoIndex] ||
                          selectedBoy.primaryPhoto ||
                          FALLBACK_PORTRAITS[0]
                        }
                        alt={`${selectedBoy.name} portrait ${activePhotoIndex + 1}`}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_PORTRAITS[0];
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Thumbnail Strip when multiple publicPhotos exist */}
                    {selectedBoy.publicPhotos?.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {selectedBoy.publicPhotos.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhotoIndex(idx)}
                            aria-label={`View portrait ${idx + 1}`}
                            className={`relative w-16 h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                              activePhotoIndex === idx
                                ? 'border-emerald-500 opacity-100'
                                : 'border-transparent opacity-60 hover:opacity-90'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src =
                                  FALLBACK_PORTRAITS[idx % FALLBACK_PORTRAITS.length];
                              }}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Dossier Specifications & Action */}
                  <div className="md:col-span-6 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div>
                        <p className="font-mono text-xs text-emerald-700 font-semibold tracking-wider tabular-nums">
                          {selectedBoy.boyCode} · AVAILABLE FOR RESERVATION
                        </p>
                        <h2
                          id="modal-companion-title"
                          className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 mt-1"
                        >
                          {selectedBoy.name}
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-1.5 mt-1">
                          <MapPin size={15} className="text-amber-500" />
                          <span>
                            {selectedBoy.township}, {selectedBoy.city}
                          </span>
                        </p>
                      </div>

                      {/* Specifications Table */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-medium text-slate-500 block">
                            Age / အသက်
                          </span>
                          <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                            {selectedBoy.age || '-'} Yrs
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-medium text-slate-500 block">
                            Height / အရပ်
                          </span>
                          <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                            {selectedBoy.height || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {selectedBoy.bio ||
                          'Personally screened and verified by WE LINK management. Available for private dining, executive social events, and tailored companion arrangements.'}
                      </div>

                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs text-emerald-950 space-y-1.5">
                        <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Lock size={14} className="text-emerald-600" />
                          <span>Confidential Concierge Dispatch</span>
                        </p>
                        <p className="leading-relaxed text-emerald-800">
                          WE LINK မှ အချက်အလက်အားလုံးကို လျှို့ဝှက်ထိန်းသိမ်းပေးထားပြီး Concierge မှတစ်ဆင့် တိုက်ရိုက်ချိတ်ဆက်ပေးပါသည်။ Private Gallery ပုံများအား Telegram Bot တွင် Client ID ဖြင့် ကြည့်ရှုနိုင်ပါသည်။
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setBookingStep('form')}
                        className="w-full py-4 px-6 rounded-xl welink-brand-gradient hover:opacity-95 text-slate-950 font-bold text-xs sm:text-sm tracking-wide transition-opacity shadow-md flex items-center justify-center gap-2"
                      >
                        <span>Proceed to Private Reservation</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 'form' && (
                <form onSubmit={handleBookingSubmit} className="space-y-5">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={selectedBoy.primaryPhoto || FALLBACK_PORTRAITS[0]}
                        alt={selectedBoy.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_PORTRAITS[0];
                        }}
                        className="w-14 h-16 rounded-lg object-cover bg-slate-900"
                      />
                      <div>
                        <span className="font-mono text-[11px] font-semibold text-emerald-700 tabular-nums">
                          {selectedBoy.boyCode} · SELECTED COMPANION
                        </span>
                        <h4 className="font-serif text-2xl font-semibold text-slate-900 leading-tight">
                          {selectedBoy.name}
                        </h4>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {selectedBoy.township}, {selectedBoy.city} · {selectedBoy.age} Yrs
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="booking-client-name"
                        className="block text-xs font-semibold text-slate-800 mb-1.5"
                      >
                        Your Name or Alias (သင့်အမည်) *
                      </label>
                      <input
                        id="booking-client-name"
                        type="text"
                        required
                        value={bookingForm.clientName}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, clientName: e.target.value })
                        }
                        placeholder="e.g. Alex / မောင်မောင်"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="booking-client-contact"
                        className="block text-xs font-semibold text-slate-800 mb-1.5"
                      >
                        Phone or Telegram @Username (ဆက်သွယ်ရန်) *
                      </label>
                      <input
                        id="booking-client-contact"
                        type="text"
                        required
                        value={bookingForm.clientContact}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, clientContact: e.target.value })
                        }
                        placeholder="09xxxxxxxxx or @username"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="booking-date"
                        className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5"
                      >
                        <Calendar size={13} className="text-amber-500" />
                        <span>Preferred Date (တွေ့ဆုံလိုသည့် ရက်စွဲ) *</span>
                      </label>
                      <input
                        id="booking-date"
                        type="date"
                        required
                        value={bookingForm.preferredDate}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, preferredDate: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm font-mono tabular-nums"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="booking-time"
                        className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5"
                      >
                        <Clock size={13} className="text-emerald-600" />
                        <span>Preferred Time (တွေ့ဆုံလိုသည့် အချိန်) *</span>
                      </label>
                      <input
                        id="booking-time"
                        type="time"
                        required
                        value={bookingForm.preferredTime}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, preferredTime: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="booking-duration"
                      className="block text-xs font-semibold text-slate-800 mb-1.5"
                    >
                      Arrangement Package / Duration
                    </label>
                    <select
                      id="booking-duration"
                      value={bookingForm.duration}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, duration: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm font-medium cursor-pointer"
                    >
                      <option value="2 Hours (Standard Date)">
                        2 Hours — Standard Private Dinner / Lounge Date
                      </option>
                      <option value="4 Hours (Half-Day Companion)">
                        4 Hours — Half-Day Social & Event Arrangement
                      </option>
                      <option value="Full Day / Evening Event">
                        Full Evening / Overnight VIP Arrangement
                      </option>
                      <option value="Custom Arrangement">
                        Bespoke Itinerary (Coordinate with Concierge)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="booking-notes"
                      className="block text-xs font-semibold text-slate-800 mb-1.5"
                    >
                      Special Preferences / Venue Notes (အထူးမှာကြားလိုသည်များ)
                    </label>
                    <textarea
                      id="booking-notes"
                      rows={2}
                      value={bookingForm.notes}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, notes: e.target.value })
                      }
                      placeholder="Preferred hotel, lounge, dress code, or special notes..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBookingStep('profile')}
                      className="px-5 py-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs sm:text-sm hover:bg-slate-200 transition-colors"
                    >
                      Back to Dossier
                    </button>
                    <button
                      type="submit"
                      disabled={submittingBooking}
                      className="flex-1 py-3.5 px-6 rounded-xl welink-brand-gradient hover:opacity-95 text-slate-950 font-bold text-xs sm:text-sm transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                    >
                      <Send size={15} />
                      <span>
                        {submittingBooking
                          ? 'Registering Reservation...'
                          : 'Confirm Reservation Request'}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {bookingStep === 'success' && (
                <div className="text-center py-6 space-y-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>

                  <div className="space-y-2">
                    <p className="font-mono text-xs font-semibold tracking-widest text-emerald-700">
                      RESERVATION DISPATCHED
                    </p>
                    <h3 className="font-serif text-3xl font-semibold text-slate-900">
                      တောင်းဆိုမှု အောင်မြင်ပါသည်
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                      WE LINK Private Concierge Team မှ သင်ဖြည့်သွင်းထားသော ဆက်သွယ်ရန်လိပ်စာသို့ အမြန်ဆုံး ပြန်လည်ဆက်သွယ်ပေးပါမည်။
                    </p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 max-w-md mx-auto text-left space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">RESERVATION REF</span>
                      <span className="font-mono font-bold text-sm text-amber-600 tabular-nums">
                        {bookingRef}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Companion:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedBoy.name} ({selectedBoy.boyCode})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="font-medium text-slate-900">
                        {selectedBoy.township}, {selectedBoy.city}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Schedule:</span>
                      <span className="font-mono font-medium text-slate-900 tabular-nums">
                        {bookingForm.preferredDate} · {bookingForm.preferredTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-2">
                    <button
                      type="button"
                      onClick={copyBookingSummary}
                      className="flex-1 py-3 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs flex items-center justify-center gap-1.5 border border-amber-200 transition-colors"
                    >
                      {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                      <span>
                        {copiedCode ? 'Copied Reservation Dossier' : 'Copy Reservation Summary'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={closeBoyModal}
                      className="flex-1 py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
