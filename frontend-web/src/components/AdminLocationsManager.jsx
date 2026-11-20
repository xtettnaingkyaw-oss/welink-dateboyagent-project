import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  Save,
  Check,
  Database,
  Building2,
  AlertCircle,
} from 'lucide-react';
import {
  countCatalogStats,
  normalizeLocationKey,
} from '../utils/myanmarLocations';

export default function AdminLocationsManager({
  locationCatalog,
  masterRegionsSynced,
  pendingLocations,
  isSavingLocations,
  onSyncDefaultMyanmar330,
  onAddUniqueLocation,
  onRenameCity,
  onDeleteCity,
  onRenameTownship,
  onDeleteTownship,
  onApprovePendingRequest,
  onRejectPendingRequest,
}) {
  const stats = useMemo(() => countCatalogStats(locationCatalog), [locationCatalog]);

  const [selectedCity, setSelectedCity] = useState(() => locationCatalog[0]?.city || '');
  const [citySearch, setCitySearch] = useState('');
  const [townshipSearch, setTownshipSearch] = useState('');

  // Add new unique City / Township form state
  const [addMode, setAddMode] = useState('existing_city'); // 'existing_city' | 'new_city'
  const [formCity, setFormCity] = useState(() => locationCatalog[0]?.city || '');
  const [formCustomCity, setFormCustomCity] = useState('');
  const [formTownship, setFormTownship] = useState('');

  // Quick-add township inside currently selected city
  const [quickTownship, setQuickTownship] = useState('');

  // Inline rename states
  const [renamingCityKey, setRenamingCityKey] = useState(null);
  const [renameCityDraft, setRenameCityDraft] = useState('');

  const [renamingTownshipKey, setRenamingTownshipKey] = useState(null);
  const [renameTownshipDraft, setRenameTownshipDraft] = useState('');

  // Inline delete confirmation (never window.confirm)
  const [confirmDeleteCity, setConfirmDeleteCity] = useState(null);

  // Pending request inline edit before approve
  const [editingPendingId, setEditingPendingId] = useState(null);
  const [pendingCityDraft, setPendingCityDraft] = useState('');
  const [pendingTownshipDraft, setPendingTownshipDraft] = useState('');

  // Keep selectedCity valid if catalog updates
  useEffect(() => {
    if (!locationCatalog.length) {
      setSelectedCity('');
      return;
    }
    const exists = locationCatalog.some(
      (r) => normalizeLocationKey(r.city) === normalizeLocationKey(selectedCity)
    );
    if (!exists) {
      setSelectedCity(locationCatalog[0].city);
    }
    if (!formCity && locationCatalog[0]?.city) {
      setFormCity(locationCatalog[0].city);
    }
  }, [locationCatalog, selectedCity, formCity]);

  const filteredRegions = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return locationCatalog;
    return locationCatalog.filter(
      (region) =>
        region.city.toLowerCase().includes(q) ||
        region.townships.some((t) => t.toLowerCase().includes(q))
    );
  }, [locationCatalog, citySearch]);

  const activeRegion = useMemo(
    () =>
      locationCatalog.find(
        (r) => normalizeLocationKey(r.city) === normalizeLocationKey(selectedCity)
      ) || locationCatalog[0] || null,
    [locationCatalog, selectedCity]
  );

  const filteredTownships = useMemo(() => {
    if (!activeRegion) return [];
    const q = townshipSearch.trim().toLowerCase();
    if (!q) return activeRegion.townships;
    return activeRegion.townships.filter((t) => t.toLowerCase().includes(q));
  }, [activeRegion, townshipSearch]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const targetCity = addMode === 'new_city' ? formCustomCity.trim() : formCity.trim();
    const targetTownship = formTownship.trim();
    if (!targetCity || !targetTownship) return;

    const ok = await onAddUniqueLocation(targetCity, targetTownship);
    if (ok) {
      setSelectedCity(targetCity);
      setFormCity(targetCity);
      setFormCustomCity('');
      setFormTownship('');
      setAddMode('existing_city');
    }
  };

  const handleQuickAddTownship = async (e) => {
    e.preventDefault();
    if (!activeRegion || !quickTownship.trim()) return;
    const ok = await onAddUniqueLocation(activeRegion.city, quickTownship.trim());
    if (ok) {
      setQuickTownship('');
    }
  };

  const startEditPending = (req) => {
    setEditingPendingId(req.id);
    setPendingCityDraft(req.city || '');
    setPendingTownshipDraft(req.township || '');
  };

  const saveAndApprovePending = async (req) => {
    const cleanCity = pendingCityDraft.trim();
    const cleanTownship = pendingTownshipDraft.trim();
    if (!cleanCity || !cleanTownship) return;
    await onApprovePendingRequest(req, cleanCity, cleanTownship);
    setEditingPendingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Header & Global Master Sync Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E6DFD3] pb-5">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-[#9E7B36] font-semibold mb-1">
            MYANMAR MASTER JURISDICTIONS · UNIQUE LOCATION CATALOG
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C0D0E]">
            မြန်မာနိုင်ငံ မြို့နှင့် မြို့နယ်များ စီမံခန့်ခွဲရန်
          </h2>
          <p className="text-xs sm:text-sm text-[#6E675F] mt-1 max-w-2xl leading-relaxed">
            Date Boy Registration (Web နှင့် Telegram Bot) တွင် User များ စာလုံးပေါင်းမတူဘဲ
            Unique ဖြစ်စွာ Dropdown ရွေးချယ်နိုင်ရန် မြန်မာတစ်နိုင်ငံလုံးရှိ တိုင်းဒေသကြီး/ပြည်နယ်
            (၁၅) ခုနှင့် မြို့နယ် (၃၃၀) ကို စုစည်းထားပါသည်။
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-[#E6DFD3] text-xs font-mono tabular-nums">
            <div>
              <span className="text-[#787167] block text-[10px]">တိုင်း/ပြည်နယ်</span>
              <span className="font-bold text-sm text-[#0C0D0E]">{stats.totalCities}</span>
            </div>
            <div className="h-6 w-px bg-[#E6DFD3]" />
            <div>
              <span className="text-[#787167] block text-[10px]">မြို့နယ် စုစုပေါင်း</span>
              <span className="font-bold text-sm text-[#0C0D0E]">{stats.totalTownships}</span>
            </div>
            <div className="h-6 w-px bg-[#E6DFD3]" />
            <div>
              <span className="text-[#787167] block text-[10px]">Requests</span>
              <span
                className={`font-bold text-sm ${
                  pendingLocations.length > 0 ? 'text-amber-600' : 'text-[#0C0D0E]'
                }`}
              >
                {pendingLocations.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingLocations}
            onClick={onSyncDefaultMyanmar330}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0C0D0E] hover:bg-[#1E2126] text-[#FAF8F5] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isSavingLocations ? 'animate-spin text-amber-400' : 'text-amber-400'} />
            <span>
              {masterRegionsSynced
                ? 'မြန်မာ ၃၃၀ မြို့နယ် ပြန်လည် Sync လုပ်မည်'
                : 'မြန်မာ ၃၃၀ မြို့နယ် Database ထဲသို့ ဖြည့်သွင်းမည်'}
            </span>
          </button>
        </div>
      </div>

      {/* Sync status notice if settings/myanmar_locations hasn't been written yet */}
      {!masterRegionsSynced && (
        <div className="bg-[#F5EFE6] border border-[#C5A059] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Database size={18} className="text-[#9E7B36] shrink-0 mt-0.5" />
            <div className="text-xs text-[#0C0D0E] leading-relaxed">
              <p className="font-semibold">
                Built-in မြန်မာနိုင်ငံ မြို့နယ် (၃၃၀) စာရင်းကို အသင့်ပြင်ဆင်ထားပြီး ဖြစ်ပါသည်။
              </p>
              <p className="text-[#5C564E] mt-0.5">
                Database (Firestore) ထဲတွင် တရားဝင်သိမ်းဆည်းထားရန် ညာဘက်ရှိ Sync ခလုတ်ကို တစ်ချက်နှိပ်ပေးနိုင်ပါသည်။
                (မနှိပ်ရသေးလျှင်လည်း Web နှင့် Telegram Bot တွင် ဤ ၃၃၀ စာရင်းအတိုင်း အလိုအလျောက် ပြသနေပါမည်။)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending User Location Requests Queue */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EFECE6] flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-[#9E7B36]" />
            <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#0C0D0E]">
              User များမှ အသစ် Request လုပ်ထားသော မြို့/မြို့နယ်များ ({pendingLocations.length})
            </h3>
          </div>
          <span className="text-xs text-[#6E675F]">
            List ထဲတွင် မရှိသဖြင့် &quot;အခြား&quot; မှတဆင့် တောင်းဆိုထားသော စာရင်းများ
          </span>
        </div>

        {pendingLocations.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#787167]">
            လောလောဆယ် အတည်ပြုရန် စောင့်ဆိုင်းနေသော မြို့/မြို့နယ် Request အသစ် မရှိသေးပါ။
          </div>
        ) : (
          <div className="divide-y divide-[#EFECE6]">
            {pendingLocations.map((req) => {
              const isEditingReq = editingPendingId === req.id;
              return (
                <div
                  key={req.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAF8F5]/60 transition-colors"
                >
                  {isEditingReq ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6E675F] mb-1">
                          မြို့ / တိုင်းဒေသကြီး (စာလုံးပေါင်း ပြင်ရန်)
                        </label>
                        <input
                          type="text"
                          value={pendingCityDraft}
                          onChange={(e) => setPendingCityDraft(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#C5A059] rounded-lg text-xs text-[#0C0D0E] outline-none"
                          placeholder="City..."
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6E675F] mb-1">
                          မြို့နယ် (စာလုံးပေါင်း ပြင်ရန်)
                        </label>
                        <input
                          type="text"
                          value={pendingTownshipDraft}
                          onChange={(e) => setPendingTownshipDraft(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#C5A059] rounded-lg text-xs text-[#0C0D0E] outline-none"
                          placeholder="Township..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-[#0C0D0E]">
                          {req.township || '-'}
                        </span>
                        <span className="text-xs text-[#787167]">·</span>
                        <span className="text-xs font-medium text-[#5C564E]">{req.city || '-'}</span>
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {req.requestedVia === 'telegram_bot'
                            ? 'Telegram Bot'
                            : req.requestedVia === 'web_register'
                              ? 'Web Register'
                              : 'User Request'}
                        </span>
                      </div>
                      <p className="text-xs text-[#787167]">
                        တောင်းဆိုသူ: <span className="text-[#0C0D0E] font-medium">{req.requestedBy || 'Date Boy Applicant'}</span>
                        {req.requestedPhone ? ` · ဖုန်း: ${req.requestedPhone}` : ''}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isEditingReq ? (
                      <>
                        <button
                          type="button"
                          disabled={isSavingLocations}
                          onClick={() => saveAndApprovePending(req)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0C0D0E] text-[#FAF8F5] text-xs font-semibold hover:bg-[#1E2126] cursor-pointer"
                        >
                          <Check size={13} className="text-amber-400" />
                          <span>ပြင်ဆင်ပြီး Approve မည်</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPendingId(null)}
                          className="px-3 py-2 rounded-lg bg-white border border-[#E6DFD3] text-xs font-semibold text-[#5C564E] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditPending(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F5EFE6] border border-[#E6DFD3] text-xs font-semibold text-[#0C0D0E] cursor-pointer"
                        >
                          <Pencil size={12} />
                          <span>စာလုံးပေါင်းပြင်မည်</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingLocations}
                          onClick={() => onApprovePendingRequest(req, req.city, req.township)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0C0D0E] hover:bg-[#1E2126] text-[#FAF8F5] text-xs font-semibold cursor-pointer"
                        >
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>Approve &amp; List ထဲထည့်မည်</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingLocations}
                          onClick={() => onRejectPendingRequest(req.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-700 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Unique City / Township Form */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6DFD3]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[#EFECE6] pb-4">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#0C0D0E] flex items-center gap-2">
              <Plus size={17} className="text-[#9E7B36]" />
              <span>မြို့ သို့မဟုတ် မြို့နယ်အသစ် ထပ်တိုးရန် (Unique Validation)</span>
            </h3>
            <p className="text-xs text-[#6E675F] mt-0.5">
              ရှိပြီးသား မြို့နယ်အမည် ထပ်တူမဖြစ်စေရန် အလိုအလျောက် စစ်ဆေးပေးပါသည်။
            </p>
          </div>
          <div className="inline-flex bg-[#FAF8F5] p-1 rounded-lg border border-[#E6DFD3]">
            <button
              type="button"
              onClick={() => setAddMode('existing_city')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                addMode === 'existing_city'
                  ? 'bg-[#0C0D0E] text-[#FAF8F5]'
                  : 'text-[#5C564E] hover:text-[#0C0D0E]'
              }`}
            >
              ရှိပြီးသား တိုင်း/မြို့ ထဲသို့
            </button>
            <button
              type="button"
              onClick={() => setAddMode('new_city')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                addMode === 'new_city'
                  ? 'bg-[#0C0D0E] text-[#FAF8F5]'
                  : 'text-[#5C564E] hover:text-[#0C0D0E]'
              }`}
            >
              မြို့ / ဒေသ အသစ်ဖန်တီးမည်
            </button>
          </div>
        </div>

        <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-[#0C0D0E] mb-1.5">
              {addMode === 'existing_city' ? 'တိုင်းဒေသကြီး / ပြည်နယ် / မြို့ ရွေးရန်' : 'မြို့ / ဒေသ အသစ်အမည်'}
            </label>
            {addMode === 'existing_city' ? (
              <select
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl text-xs sm:text-sm text-[#0C0D0E] outline-none focus:bg-white focus:border-[#0C0D0E]"
                required
              >
                <option value="">-- မြို့ / တိုင်းဒေသကြီး ရွေးချယ်ပါ --</option>
                {locationCatalog.map((region) => (
                  <option key={region.city} value={region.city}>
                    {region.city} ({region.townships.length} မြို့နယ်)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formCustomCity}
                onChange={(e) => setFormCustomCity(e.target.value)}
                placeholder="ဥပမာ - ပြင်ဦးလွင် (Pyin Oo Lwin)"
                className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl text-xs sm:text-sm text-[#0C0D0E] outline-none focus:bg-white focus:border-[#0C0D0E]"
                required
              />
            )}
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-[#0C0D0E] mb-1.5">
              မြို့နယ်အမည် (Township Name)
            </label>
            <input
              type="text"
              value={formTownship}
              onChange={(e) => setFormTownship(e.target.value)}
              placeholder="ဥပမာ - ရပ်ကွက်ကြီး (၁) / မြို့နယ်အသစ်"
              className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl text-xs sm:text-sm text-[#0C0D0E] outline-none focus:bg-white focus:border-[#0C0D0E]"
              required
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSavingLocations}
              className="w-full py-3 px-4 rounded-xl bg-[#0C0D0E] hover:bg-[#C5A059] hover:text-[#0C0D0E] text-[#FAF8F5] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Plus size={15} />
              <span>ထည့်သွင်းမည်</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2-Column Master Catalog Explorer: Regions/Cities (Left) & Townships (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Regions / Cities List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6DFD3] overflow-hidden">
          <div className="p-4 border-b border-[#EFECE6] bg-[#FAF8F5] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#0C0D0E] flex items-center gap-2">
                <Building2 size={15} className="text-[#9E7B36]" />
                <span>တိုင်းဒေသကြီး / ပြည်နယ် / မြို့များ ({filteredRegions.length})</span>
              </h3>
            </div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787167]"
              />
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="မြို့ သို့မဟုတ် မြို့နယ်အမည်ဖြင့် ရှာရန်..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-[#E6DFD3] rounded-lg text-xs text-[#0C0D0E] outline-none focus:border-[#0C0D0E]"
              />
              {citySearch && (
                <button
                  type="button"
                  onClick={() => setCitySearch('')}
                  aria-label="Clear city search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#787167] hover:text-[#0C0D0E]"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[540px] overflow-y-auto divide-y divide-[#EFECE6]">
            {filteredRegions.map((region) => {
              const isSelected =
                activeRegion &&
                normalizeLocationKey(activeRegion.city) === normalizeLocationKey(region.city);
              const isRenaming = renamingCityKey === normalizeLocationKey(region.city);
              const isConfirmingDelete = confirmDeleteCity === region.city;

              return (
                <div
                  key={region.city}
                  className={`px-4 py-3 transition-colors ${
                    isSelected ? 'bg-[#F5EFE6]' : 'bg-white hover:bg-[#FAF8F5]'
                  }`}
                >
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameCityDraft}
                        onChange={(e) => setRenameCityDraft(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-[#0C0D0E] rounded text-xs"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!renameCityDraft.trim()) return;
                          await onRenameCity(region.city, renameCityDraft.trim());
                          setSelectedCity(renameCityDraft.trim());
                          setRenamingCityKey(null);
                        }}
                        className="p-1.5 rounded bg-[#0C0D0E] text-amber-400 cursor-pointer"
                        aria-label="Save city name"
                      >
                        <Save size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingCityKey(null)}
                        className="p-1.5 rounded bg-white border border-[#E6DFD3] text-[#5C564E] cursor-pointer"
                        aria-label="Cancel rename"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : isConfirmingDelete ? (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-rose-700 font-semibold">
                        &quot;{region.city}&quot; နှင့် မြို့နယ် ({region.townships.length}) ခုလုံး ဖျက်မလား?
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteCity(region.city);
                            setConfirmDeleteCity(null);
                          }}
                          className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold cursor-pointer"
                        >
                          ဖျက်မည်
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCity(null)}
                          className="px-2.5 py-1 rounded bg-white border border-[#E6DFD3] text-[#5C564E] font-semibold cursor-pointer"
                        >
                          မဖျက်ပါ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCity(region.city);
                          setTownshipSearch('');
                        }}
                        className="flex-1 text-left flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span
                          className={`text-xs sm:text-sm ${
                            isSelected ? 'font-bold text-[#0C0D0E]' : 'font-medium text-[#2A2622]'
                          }`}
                        >
                          {region.city}
                        </span>
                        <span
                          className={`font-mono text-[11px] tabular-nums px-2 py-0.5 rounded ${
                            isSelected
                              ? 'bg-[#0C0D0E] text-amber-400 font-semibold'
                              : 'bg-[#FAF8F5] text-[#6E675F] border border-[#E6DFD3]'
                          }`}
                        >
                          {region.townships.length}
                        </span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingCityKey(normalizeLocationKey(region.city));
                            setRenameCityDraft(region.city);
                          }}
                          aria-label={`Rename ${region.city}`}
                          className="p-1.5 rounded text-[#787167] hover:text-[#0C0D0E] hover:bg-white cursor-pointer"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCity(region.city)}
                          aria-label={`Delete ${region.city}`}
                          className="p-1.5 rounded text-[#787167] hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Townships of Selected Region */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E6DFD3] overflow-hidden">
          {activeRegion ? (
            <>
              <div className="p-4 sm:p-5 border-b border-[#EFECE6] bg-[#FAF8F5] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] text-[#9E7B36] font-semibold">
                      SELECTED REGION / CITY
                    </p>
                    <h3 className="font-serif text-xl font-semibold text-[#0C0D0E] flex items-center gap-2">
                      <MapPin size={16} className="text-[#9E7B36]" />
                      <span>{activeRegion.city}</span>
                      <span className="font-mono text-xs font-semibold text-[#6E675F] tabular-nums">
                        ({activeRegion.townships.length} မြို့နယ်)
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787167]"
                    />
                    <input
                      type="text"
                      value={townshipSearch}
                      onChange={(e) => setTownshipSearch(e.target.value)}
                      placeholder={`${activeRegion.city} အတွင်း မြို့နယ်ရှာရန်...`}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-[#E6DFD3] rounded-lg text-xs text-[#0C0D0E] outline-none focus:border-[#0C0D0E]"
                    />
                    {townshipSearch && (
                      <button
                        type="button"
                        onClick={() => setTownshipSearch('')}
                        aria-label="Clear township search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#787167] hover:text-[#0C0D0E]"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleQuickAddTownship} className="flex gap-1.5">
                    <input
                      type="text"
                      value={quickTownship}
                      onChange={(e) => setQuickTownship(e.target.value)}
                      placeholder="ဤမြို့ထဲသို့ မြို့နယ်အသစ်ထည့်ရန်..."
                      className="flex-1 px-3 py-2 bg-white border border-[#E6DFD3] rounded-lg text-xs text-[#0C0D0E] outline-none focus:border-[#0C0D0E]"
                    />
                    <button
                      type="submit"
                      disabled={isSavingLocations || !quickTownship.trim()}
                      className="px-3 py-2 rounded-lg bg-[#0C0D0E] text-[#FAF8F5] text-xs font-semibold hover:bg-[#1E2126] disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus size={13} />
                      <span>ထည့်မည်</span>
                    </button>
                  </form>
                </div>
              </div>

              <div className="p-4 sm:p-5 max-h-[500px] overflow-y-auto">
                {filteredTownships.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#787167] flex flex-col items-center gap-2">
                    <AlertCircle size={18} className="text-[#9E7B36]" />
                    <span>ရှာဖွေထားသော မြို့နယ်အမည် မတွေ့ရှိပါ။</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredTownships.map((township, idx) => {
                      const tKey = `${normalizeLocationKey(activeRegion.city)}::${normalizeLocationKey(township)}`;
                      const isRenamingT = renamingTownshipKey === tKey;

                      return (
                        <div
                          key={tKey}
                          className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6DFD3] hover:border-[#C5A059] transition-colors"
                        >
                          {isRenamingT ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={renameTownshipDraft}
                                onChange={(e) => setRenameTownshipDraft(e.target.value)}
                                className="flex-1 px-2 py-1 bg-white border border-[#0C0D0E] rounded text-xs"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!renameTownshipDraft.trim()) return;
                                  await onRenameTownship(
                                    activeRegion.city,
                                    township,
                                    renameTownshipDraft.trim()
                                  );
                                  setRenamingTownshipKey(null);
                                }}
                                className="p-1.5 rounded bg-[#0C0D0E] text-amber-400 cursor-pointer"
                                aria-label="Save township name"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenamingTownshipKey(null)}
                                className="p-1.5 rounded bg-white border border-[#E6DFD3] text-[#5C564E] cursor-pointer"
                                aria-label="Cancel township rename"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] text-[#787167] tabular-nums w-5 shrink-0">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                <span className="text-xs font-semibold text-[#0C0D0E] truncate">
                                  {township}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingTownshipKey(tKey);
                                    setRenameTownshipDraft(township);
                                  }}
                                  aria-label={`Rename ${township}`}
                                  className="p-1.5 rounded text-[#787167] hover:text-[#0C0D0E] hover:bg-white cursor-pointer"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingLocations}
                                  onClick={() => onDeleteTownship(activeRegion.city, township)}
                                  aria-label={`Delete ${township}`}
                                  className="p-1.5 rounded text-[#787167] hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-[#787167]">
              ဘယ်ဘက်မှ တိုင်းဒေသကြီး သို့မဟုတ် မြို့ တစ်ခုကို ရွေးချယ်ပါ။
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
