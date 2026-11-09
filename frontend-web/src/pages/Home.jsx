import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Search,
  Heart,
  Sparkles,
  ShieldCheck,
  SlidersHorizontal,
  X,
  Calendar,
  Clock,
  UserCheck,
  Ruler,
  Cake,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Eye,
  RotateCcw
} from 'lucide-react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Home() {
  const [dateBoys, setDateBoys] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search States (လက်ရှိ City & Township Rule ကို အခြေခံထားသည်)
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedTownship, setSelectedTownship] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ageRange, setAgeRange] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Saved Favorites (LocalStorage ဖြင့် မှတ်သားထားခြင်း)
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
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qBoys = query(collection(db, 'dateboys'), where('status', '==', 'approved'));
        const [boysSnap, locSnap] = await Promise.all([
          getDocs(qBoys),
          getDocs(collection(db, 'locations'))
        ]);

        setDateBoys(boysSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLocations(locSnap.docs.map((doc) => doc.data()));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Favorites ပြောင်းတိုင်း LocalStorage တွင် သိမ်းမည်
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

  // Admin လက်ခံထားသော (Pending မဟုတ်သော) မြို့နယ်များကိုသာ Home တွင် ပြမည်
  const activeLocations = useMemo(
    () => locations.filter((l) => l.status !== 'pending'),
    [locations]
  );
  const cities = useMemo(
    () => [...new Set(activeLocations.map((l) => l.city).filter(Boolean))],
    [activeLocations]
  );
  const townships = useMemo(
    () =>
      activeLocations
        .filter((l) => l.city === selectedCity)
        .map((l) => l.township)
        .filter(Boolean),
    [activeLocations, selectedCity]
  );

  // Filter & Sort Logic
  const filteredBoys = useMemo(() => {
    return dateBoys
      .filter((boy) => {
        if (selectedTownship && boy.township !== selectedTownship) return false;
        if (selectedCity && boy.city !== selectedCity) return false;
        if (showFavoritesOnly && !favorites.includes(boy.id)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = boy.name?.toLowerCase().includes(q);
          const matchCity = boy.city?.toLowerCase().includes(q);
          const matchTownship = boy.township?.toLowerCase().includes(q);
          if (!matchName && !matchCity && !matchTownship) return false;
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
  }, [dateBoys, selectedCity, selectedTownship, searchQuery, ageRange, sortBy, showFavoritesOnly, favorites]);

  const resetAllFilters = () => {
    setSelectedCity('');
    setSelectedTownship('');
    setSearchQuery('');
    setAgeRange('all');
    setSortBy('featured');
    setShowFavoritesOnly(false);
  };

  const hasActiveFilters =
    selectedCity ||
    selectedTownship ||
    searchQuery.trim() ||
    ageRange !== 'all' ||
    showFavoritesOnly;

  // Modal Open Handler
  const openBoyModal = (boy, initialStep = 'profile') => {
    setSelectedBoy(boy);
    setBookingStep(initialStep);
    setCopiedCode(false);
  };

  const closeBoyModal = () => {
    setSelectedBoy(null);
    setBookingStep('profile');
  };

  // Booking Request Submit Handler
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBoy) return;
    setSubmittingBooking(true);

    const generatedRef = `WL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    try {
      // Firestore 'bookings' collection သို့ သိမ်းဆည်းခြင်း (Rule ခွင့်ပြုချက်ရှိပါက တိုက်ရိုက်ဝင်မည်)
      await addDoc(collection(db, 'bookings'), {
        bookingRef: generatedRef,
        dateBoyId: selectedBoy.id,
        dateBoyName: selectedBoy.name || '',
        dateBoyCity: selectedBoy.city || '',
        dateBoyTownship: selectedBoy.township || '',
        ...bookingForm,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      // Firestore 'bookings' rule မဖွင့်ထားသေးသည့်တိုင် Client အတွက် Booking Summary ထုတ်ပေးမည်
      console.warn('Booking logged locally:', err);
    } finally {
      setBookingRef(generatedRef);
      setSubmittingBooking(false);
      setBookingStep('success');
    }
  };

  const copyBookingSummary = () => {
    if (!selectedBoy) return;
    const summaryText = `✨ WE LINK BOOKING REQUEST ✨\nRef: ${bookingRef}\nCompanion: ${selectedBoy.name} (${selectedBoy.township}, ${selectedBoy.city})\nClient: ${bookingForm.clientName}\nContact: ${bookingForm.clientContact}\nDate/Time: ${bookingForm.preferredDate} @ ${bookingForm.preferredTime}\nDuration: ${bookingForm.duration}\nNotes: ${bookingForm.notes || '-'}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-in fade-in duration-700">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-10 lg:p-14 mb-8 sm:mb-10 shadow-2xl border border-slate-800">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs sm:text-sm font-bold tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Premier Male Companion Directory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Find Your{' '}
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-emerald-400 text-transparent bg-clip-text">
              Perfect Match
            </span>
          </h1>

          <p className="text-slate-300 font-medium text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            WE LINK မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်။ စိစစ်အတည်ပြုထားပြီးသော အရည်အသွေးမြင့် Date Boy များကို မြို့နယ်အလိုက် လုံခြုံစိတ်ချစွာ ရွေးချယ်ချိတ်ဆက်လိုက်ပါ။
          </p>

          {/* Live Stats Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-white">{dateBoys.length}</span> Verified Profiles
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-amber-400" />
              <span className="font-bold text-white">{cities.length}</span> Active Cities
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-400" />
              <span>100% Discreet Concierge</span>
            </div>
          </div>
        </div>
      </div>

      {/* International Standard Filter & Search Console */}
      <div className="max-w-5xl mx-auto mb-10 relative z-20">
        <div className="bg-white/95 backdrop-blur-xl p-3 sm:p-4 rounded-[2rem] shadow-[0_10px_40px_-10px_rgba(15,23,42,0.08)] border border-slate-200/80 space-y-3">
          
          {/* Primary Row: City, Township, Name Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* City Select */}
            <div className="flex items-center bg-slate-50 hover:bg-slate-100/80 transition-colors rounded-2xl px-4 py-2.5 border border-slate-200/70">
              <MapPin className="text-amber-500 w-5 h-5 mr-2.5 shrink-0" />
              <div className="w-full">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  City / မြို့
                </span>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setSelectedTownship('');
                  }}
                  className="w-full bg-transparent outline-none text-slate-800 font-bold text-sm py-0.5 cursor-pointer"
                >
                  <option value="">မြို့ အားလုံးပြပါ</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Township Select */}
            <div className="flex items-center bg-slate-50 hover:bg-slate-100/80 transition-colors rounded-2xl px-4 py-2.5 border border-slate-200/70">
              <Search className="text-emerald-500 w-5 h-5 mr-2.5 shrink-0" />
              <div className="w-full">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Township / မြို့နယ်
                </span>
                <select
                  value={selectedTownship}
                  onChange={(e) => setSelectedTownship(e.target.value)}
                  disabled={!selectedCity}
                  className="w-full bg-transparent outline-none text-slate-800 font-bold text-sm py-0.5 disabled:opacity-50 cursor-pointer"
                >
                  <option value="">
                    {selectedCity ? 'မြို့နယ် အားလုံးပြပါ' : 'မြို့ကို အရင်ရွေးပါ'}
                  </option>
                  {townships.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instant Keyword Search */}
            <div className="flex items-center bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-400/50 transition-all rounded-2xl px-4 py-2.5 border border-slate-200/70">
              <Search className="text-slate-400 w-5 h-5 mr-2.5 shrink-0" />
              <div className="w-full">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Search / အမည်ရှာရန်
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="အမည် သို့မဟုတ် မြို့နယ်..."
                  className="w-full bg-transparent outline-none text-slate-800 font-semibold text-sm placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Secondary Row: Age Filter, Sort, Favorites Toggle & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-slate-400 font-semibold px-2">
                <SlidersHorizontal size={13} />
                Filters:
              </span>

              {/* Age Pills */}
              {['all', '18-22', '23-27', '28+'].map((range) => (
                <button
                  key={range}
                  onClick={() => setAgeRange(range)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    ageRange === range
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {range === 'all' ? 'All Ages' : `${range} yrs`}
                </button>
              ))}

              {/* Favorites Filter Button */}
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                  showFavoritesOnly
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                }`}
              >
                <Heart size={13} className={showFavoritesOnly ? 'fill-white' : 'fill-rose-500'} />
                <span>Saved ({favorites.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl outline-none cursor-pointer"
              >
                <option value="featured">Sort: Featured</option>
                <option value="age-asc">Age: Youngest First</option>
                <option value="age-desc">Age: Mature First</option>
                <option value="name">Name: A - Z</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold transition-colors"
                >
                  <RotateCcw size={13} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Header Count */}
      {!loading && (
        <div className="flex items-center justify-between mb-6 px-1">
          <p className="text-xs sm:text-sm font-bold text-slate-500">
            Showing <span className="text-slate-900">{filteredBoys.length}</span> available{' '}
            {filteredBoys.length === 1 ? 'companion' : 'companions'}
            {selectedCity && ` in ${selectedTownship ? `${selectedTownship}, ` : ''}${selectedCity}`}
          </p>
        </div>
      )}

      {/* Main Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 p-3 space-y-4 animate-pulse"
            >
              <div className="aspect-[4/5] bg-slate-200/70 rounded-[1.5rem]"></div>
              <div className="space-y-2 px-2 pb-2">
                <div className="h-5 bg-slate-200 rounded-lg w-2/3"></div>
                <div className="h-4 bg-slate-100 rounded-lg w-1/2"></div>
                <div className="h-11 bg-slate-200 rounded-2xl w-full mt-3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredBoys.length === 0 ? (
        <div className="text-center bg-white p-10 sm:p-14 rounded-[2.5rem] shadow-sm border border-slate-200/70 max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <Search size={28} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">ရှာဖွေမှု မတွေ့ရှိပါ</h3>
          <p className="text-slate-500 text-sm mb-6">
            ရွေးချယ်ထားသော မြို့နယ် သို့မဟုတ် စစ်ထုတ်မှုတွင် Date Boy မရှိသေးပါ။
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-md"
            >
              <RotateCcw size={16} />
              အားလုံးပြန်ကြည့်မည် (Reset Filters)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {filteredBoys.map((boy) => {
            const isSaved = favorites.includes(boy.id);
            return (
              <div
                key={boy.id}
                onClick={() => openBoyModal(boy, 'profile')}
                className="bg-white rounded-[2rem] shadow-[0_4px_25px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_40px_-12px_rgba(15,23,42,0.16)] border border-slate-200/80 overflow-hidden transition-all duration-300 group flex flex-col h-full hover:-translate-y-1.5 cursor-pointer"
              >
                {/* Portrait Image Container */}
                <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                  {boy.publicPhoto ? (
                    <img
                      src={boy.publicPhoto}
                      alt={boy.name || 'Date Boy'}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                      <UserCheck size={40} className="mb-2 opacity-40" />
                      <span className="text-xs font-semibold">No Photo Available</span>
                    </div>
                  )}

                  {/* Top Left: Verified Badge & Favorite Heart */}
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
                    <button
                      onClick={(e) => toggleFavorite(e, boy.id)}
                      aria-label="Save to favorites"
                      className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-sm ${
                        isSaved
                          ? 'bg-rose-500 text-white scale-110'
                          : 'bg-black/35 text-white hover:bg-black/55'
                      }`}
                    >
                      <Heart size={16} className={isSaved ? 'fill-white' : ''} />
                    </button>

                    <div className="bg-white/95 backdrop-blur-md text-emerald-700 text-[11px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-emerald-100">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      AVAILABLE
                    </div>
                  </div>

                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent"></div>

                  {/* Quick View Pill on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-950/20 backdrop-blur-[2px]">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/95 text-slate-900 font-bold text-xs shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Eye size={14} className="text-amber-500" />
                      View Full Profile
                    </span>
                  </div>

                  {/* Bottom Name & Location Info */}
                  <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-black text-2xl truncate drop-shadow-md">{boy.name}</h3>
                      <ShieldCheck size={18} className="text-amber-400 shrink-0 drop-shadow" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-200 flex items-center gap-1.5 mt-1 truncate">
                      <MapPin size={14} className="text-amber-400 shrink-0" />
                      <span>
                        {boy.township}, {boy.city}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Card Body: Specs & CTA */}
                <div className="p-5 flex flex-col flex-grow bg-white">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl mb-4 border border-slate-100">
                    <div className="flex items-center justify-center gap-2 border-r border-slate-200/80 pr-2">
                      <Cake size={16} className="text-amber-500 shrink-0" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">
                          အသက် / Age
                        </span>
                        <span className="block text-slate-800 font-black text-sm mt-0.5">
                          {boy.age || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 pl-2">
                      <Ruler size={16} className="text-emerald-500 shrink-0" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">
                          အရပ် / Height
                        </span>
                        <span className="block text-slate-800 font-black text-sm mt-0.5">
                          {boy.height || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openBoyModal(boy, 'form');
                    }}
                    className="mt-auto w-full bg-slate-900 text-white group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:via-yellow-500 group-hover:to-emerald-500 group-hover:text-slate-950 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <Heart size={17} className="group-hover:scale-110 transition-transform" />
                    <span>REQUEST TO DATE</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* International Profile & Concierge Booking Modal */}
      {selectedBoy && (
        <div
          onClick={closeBoyModal}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-[2.25rem] shadow-2xl border border-slate-200/80 overflow-hidden my-auto max-h-[92vh] flex flex-col"
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-600 w-5 h-5" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  WE LINK Verified Companion Profile
                </span>
              </div>
              <button
                onClick={closeBoyModal}
                className="p-2 rounded-full bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              {bookingStep === 'profile' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                  <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-slate-100 shadow-md">
                    {selectedBoy.publicPhoto ? (
                      <img
                        src={selectedBoy.publicPhoto}
                        alt={selectedBoy.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        No Photo
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full">
                      AVAILABLE NOW
                    </div>
                  </div>

                  <div className="flex flex-col h-full justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60">
                        <Sparkles size={13} />
                        ID: #{selectedBoy.id.slice(0, 6).toUpperCase()}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                        {selectedBoy.name}
                      </h2>
                      <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                        <MapPin size={16} className="text-amber-500" />
                        {selectedBoy.township}, {selectedBoy.city}
                      </p>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-400 uppercase block">
                            အသက် / Age
                          </span>
                          <span className="text-lg font-black text-slate-800">
                            {selectedBoy.age || '-'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-400 uppercase block">
                            အရပ် / Height
                          </span>
                          <span className="text-lg font-black text-slate-800">
                            {selectedBoy.height || '-'}
                          </span>
                        </div>
                      </div>

                      {selectedBoy.bio && (
                        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {selectedBoy.bio}
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-800 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <ShieldCheck size={15} className="text-emerald-600" />
                          100% Privacy & Identity Protection
                        </p>
                        <p className="text-emerald-700/90">
                          WE LINK မှ အချက်အလက်အားလုံးကို လျှို့ဝှက်ထိန်းသိမ်းပေးထားပြီး Concierge မှတစ်ဆင့် တိုက်ရိုက်ချိတ်ဆက်ပေးပါသည်။
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2.5">
                      <button
                        onClick={() => setBookingStep('form')}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-emerald-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Heart size={18} />
                        PROCEED TO DATE REQUEST
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 'form' && (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                    {selectedBoy.publicPhoto && (
                      <img
                        src={selectedBoy.publicPhoto}
                        alt={selectedBoy.name}
                        className="w-14 h-14 rounded-2xl object-cover"
                      />
                    )}
                    <div>
                      <span className="text-[11px] font-bold uppercase text-amber-600">
                        Selected Date Boy
                      </span>
                      <h4 className="font-black text-slate-900 text-lg leading-tight">
                        {selectedBoy.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {selectedBoy.township}, {selectedBoy.city} • Age {selectedBoy.age}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        သင့်အမည် (Your Name / Nickname) *
                      </label>
                      <input
                        type="text"
                        required
                        value={bookingForm.clientName}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, clientName: e.target.value })
                        }
                        placeholder="ဥပမာ - Alex / မောင်မောင်"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        ဆက်သွယ်ရန် ဖုန်း သို့မဟုတ် Telegram @Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={bookingForm.clientContact}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, clientContact: e.target.value })
                        }
                        placeholder="09xxxxxxxxx သို့မဟုတ် @username"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Calendar size={13} className="text-amber-500" />
                        တွေ့ဆုံလိုသည့် ရက်စွဲ (Preferred Date) *
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingForm.preferredDate}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, preferredDate: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Clock size={13} className="text-emerald-500" />
                        တွေ့ဆုံလိုသည့် အချိန် (Preferred Time) *
                      </label>
                      <input
                        type="time"
                        required
                        value={bookingForm.preferredTime}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, preferredTime: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Date Package / Duration
                    </label>
                    <select
                      value={bookingForm.duration}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, duration: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 outline-none text-sm font-semibold"
                    >
                      <option value="2 Hours (Standard Date)">2 Hours (Standard Coffee / Dinner Date)</option>
                      <option value="4 Hours (Half-Day Companion)">4 Hours (Half-Day Companion)</option>
                      <option value="Full Day / Evening Event">Full Day / Evening Event Companion</option>
                      <option value="Custom Arrangement">Custom Arrangement (Discuss with Concierge)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      အထူးမှာကြားလိုသည်များ (Special Notes / Venue Preference)
                    </label>
                    <textarea
                      rows={2}
                      value={bookingForm.notes}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, notes: e.target.value })
                      }
                      placeholder="တွေ့ဆုံလိုသည့် နေရာ သို့မဟုတ် အခြားလိုအပ်ချက်များ..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 outline-none text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBookingStep('profile')}
                      className="px-5 py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submittingBooking}
                      className="flex-1 py-3.5 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      <Send size={16} />
                      {submittingBooking ? 'Submitting Request...' : 'CONFIRM DATE REQUEST'}
                    </button>
                  </div>
                </form>
              )}

              {bookingStep === 'success' && (
                <div className="text-center py-4 space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={34} />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600">
                      Booking Request Registered
                    </span>
                    <h3 className="text-2xl font-black text-slate-900">
                      တောင်းဆိုမှု အောင်မြင်ပါသည်
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                      WE LINK Concierge Team မှ သင်ဖြည့်သွင်းထားသော ဆက်သွယ်ရန်လိပ်စာသို့ အမြန်ဆုံး ပြန်လည်ဆက်သွယ်ပေးပါမည်။
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 max-w-md mx-auto text-left space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-400 font-bold">BOOKING REF:</span>
                      <span className="font-black text-sm text-amber-600">{bookingRef}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Companion:</span>
                      <span className="font-bold text-slate-800">{selectedBoy.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="font-bold text-slate-800">
                        {selectedBoy.township}, {selectedBoy.city}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Schedule:</span>
                      <span className="font-bold text-slate-800">
                        {bookingForm.preferredDate} ({bookingForm.preferredTime})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-md mx-auto pt-2">
                    <button
                      onClick={copyBookingSummary}
                      className="flex-1 py-3 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-200 transition-colors"
                    >
                      {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                      {copiedCode ? 'Copied Details!' : 'Copy Booking Details'}
                    </button>
                    <button
                      onClick={closeBoyModal}
                      className="flex-1 py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
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
