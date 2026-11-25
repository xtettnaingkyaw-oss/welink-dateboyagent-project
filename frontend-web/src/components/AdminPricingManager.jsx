import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Clock,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  Eye,
  EyeOff,
  Wallet,
  KeyRound,
  Lock,
  Sparkles,
  Copy,
  Check,
  Smartphone,
} from 'lucide-react';
import {
  normalizePricingConfig,
  serializePricingConfigForFirestore,
  calculatePackageDeposit,
  formatKyats,
  DURATION_QUICK_PRESETS,
  PAYMENT_METHOD_PRESETS,
} from '../utils/catalogLogic';

const PACKAGE_ICONS = ['🕒', '☀️', '🌙', '✨', '👑', '💎', '🥂', '✈️'];

export default function AdminPricingManager({
  appConfig,
  onSavePricingConfig,
  isSaving = false,
}) {
  const normalizedCommitted = useMemo(() => normalizePricingConfig(appConfig), [appConfig]);
  const [draft, setDraft] = useState(() => normalizePricingConfig(appConfig));
  const [hasLocalEdits, setHasLocalEdits] = useState(false);
  const [copiedPreviewAcc, setCopiedPreviewAcc] = useState('');
  const [previewSelectedPkgId, setPreviewSelectedPkgId] = useState('sec');

  useEffect(() => {
    if (!hasLocalEdits) {
      setDraft(normalizePricingConfig(appConfig));
    }
  }, [appConfig, hasLocalEdits]);

  const updateDraft = (updater) => {
    setDraft((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return normalizePricingConfig(next);
    });
    setHasLocalEdits(true);
  };

  const handlePackageChange = (pkgId, field, value) => {
    updateDraft((prev) => ({
      ...prev,
      datingPackages: prev.datingPackages.map((pkg) =>
        pkg.id === pkgId ? { ...pkg, [field]: value } : pkg
      ),
    }));
  };

  const handleAddPackage = () => {
    const newId = `pkg_${Date.now().toString(36)}`;
    updateDraft((prev) => ({
      ...prev,
      datingPackages: [
        ...prev.datingPackages,
        {
          id: newId,
          icon: '✨',
          title: 'VIP Custom',
          nameMm: 'VIP Special Package',
          duration: '၂၄ နာရီ (Full Day & Overnight VIP)',
          price: 500000,
          description: 'အထူးသီးသန့် အချိန်ပြည့် VIP အဖော်လိုက်ပေးခြင်း',
          badge: 'VIP',
          enabled: true,
        },
      ],
    }));
    setPreviewSelectedPkgId(newId);
  };

  const handleRemovePackage = (pkgId) => {
    if (['sec', 'day', 'night'].includes(pkgId)) {
      // Core packages can be toggled hidden rather than deleted
      handlePackageChange(pkgId, 'enabled', false);
      return;
    }
    updateDraft((prev) => ({
      ...prev,
      datingPackages: prev.datingPackages.filter((pkg) => pkg.id !== pkgId),
    }));
  };

  const handleAccountChange = (accId, field, value) => {
    updateDraft((prev) => ({
      ...prev,
      paymentAccounts: prev.paymentAccounts.map((acc) =>
        acc.id === accId ? { ...acc, [field]: value } : acc
      ),
    }));
  };

  const handleAddAccount = () => {
    const newId = `acc_${Date.now().toString(36)}`;
    updateDraft((prev) => ({
      ...prev,
      paymentAccounts: [
        ...prev.paymentAccounts,
        {
          id: newId,
          method: 'WavePay',
          accountNumber: '',
          accountName: '',
          enabled: true,
        },
      ],
    }));
  };

  const handleRemoveAccount = (accId) => {
    updateDraft((prev) => {
      const remaining = prev.paymentAccounts.filter((acc) => acc.id !== accId);
      return {
        ...prev,
        paymentAccounts:
          remaining.length > 0
            ? remaining
            : [
                {
                  id: 'acc_default_1',
                  method: 'KBZPay (KPay)',
                  accountNumber: '',
                  accountName: '',
                  enabled: true,
                },
              ],
      };
    });
  };

  const handleReset = () => {
    setDraft(normalizedCommitted);
    setHasLocalEdits(false);
  };

  const handleSave = async () => {
    const payload = serializePricingConfigForFirestore(draft);
    await onSavePricingConfig(payload);
    setHasLocalEdits(false);
  };

  const copyAccountNumber = (num) => {
    if (!num) return;
    navigator.clipboard?.writeText(num);
    setCopiedPreviewAcc(num);
    setTimeout(() => setCopiedPreviewAcc(''), 2000);
  };

  const activePackages = draft.datingPackages.filter((p) => p.enabled !== false);
  const activeAccounts = draft.paymentAccounts.filter(
    (a) => a.enabled !== false && String(a.accountNumber || '').trim()
  );
  const selectedPreviewPkg =
    activePackages.find((p) => p.id === previewSelectedPkgId) ||
    activePackages[0] ||
    draft.datingPackages[0];

  return (
    <div className="space-y-8">
      {/* Top Action Header */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E6DFD3]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-[#EFECE6]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#9E7B36]">
              <span>PRICING & TELEGRAM MENU CARDS</span>
              <span aria-hidden="true">·</span>
              <span>LIVE SYNC WITH BOT & WEBSITE</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C0D0E]">
              ငွေပေးချေမှုနှင့် ဈေးနှုန်းသတ်မှတ်ချက်များ စီမံခန့်ခွဲရန်
            </h2>
            <p className="text-xs sm:text-sm text-[#5C564E] max-w-2xl leading-relaxed">
              Package တစ်ခုချင်းစီ၏ ဈေးနှုန်း၊ သတ်မှတ်ကြာချိန် (နာရီ)၊ စရံငွေ ရာခိုင်နှုန်း နှင့် ငွေလွှဲအကောင့်များကို လွယ်ကူရှင်းလင်းစွာ ပြင်ဆင်နိုင်ပါသည်။ ပြင်ဆင်သိမ်းဆည်းလိုက်သည်နှင့် Telegram Bot ရှိ Menu Card များနှင့် Website တွင် ချက်ချင်း ပြောင်းလဲသက်ရောက်ပါမည်။
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {hasLocalEdits && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F5EFE6] text-[#5C564E] border border-[#E6DFD3] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw size={14} />
                <span>မူလအတိုင်း ပြန်ထားမည်</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-5 py-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                hasLocalEdits
                  ? 'bg-[#0C0D0E] text-[#FAF8F5] hover:bg-[#9E7B36] shadow-sm'
                  : 'bg-[#1E2126] text-[#FAF8F5] hover:bg-[#0C0D0E]'
              }`}
            >
              <Save size={15} />
              <span>
                {isSaving
                  ? 'သိမ်းဆည်းနေပါသည်...'
                  : hasLocalEdits
                    ? 'ပြင်ဆင်ချက်များ သိမ်းဆည်းမည် (Save Changes)'
                    : 'ဈေးနှုန်းများ သိမ်းဆည်းမည် (Save Pricing)'}
              </span>
            </button>
          </div>
        </div>

        {/* High-Density KPI Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3]">
            <span className="text-xs text-[#6E675F] block">Active Dating Menu Cards</span>
            <span className="font-mono text-xl font-bold text-[#0C0D0E] tabular-nums mt-1 block">
              {activePackages.length} / {draft.datingPackages.length} Cards
            </span>
            <span className="text-[11px] text-[#787167] mt-0.5 block">
              Bot တွင် သီးသန့် Card တစ်ခုချင်း ပြသမည်
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3]">
            <span className="text-xs text-[#6E675F] block">Booking စရံငွေ သတ်မှတ်ချက်</span>
            <span className="font-mono text-xl font-bold text-[#9E7B36] tabular-nums mt-1 block">
              {draft.depositPercent}% Deposit
            </span>
            <span className="text-[11px] text-[#787167] mt-0.5 block">
              Package ဈေးနှုန်းမှ အလိုအလျောက် တွက်ချက်သည်
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3]">
            <span className="text-xs text-[#6E675F] block">Client ID / Private Photo ကြေး</span>
            <span className="font-mono text-base sm:text-lg font-bold text-[#0C0D0E] tabular-nums mt-1 block">
              {formatKyats(draft.clientIdFee)} · {formatKyats(draft.privFee)} Ks
            </span>
            <span className="text-[11px] text-[#787167] mt-0.5 block">
              VIP Pass နှင့် Private ပုံ/Video ကြည့်ရှုခ
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3]">
            <span className="text-xs text-[#6E675F] block">ငွေလက်ခံသည့် အကောင့်များ</span>
            <span className="font-mono text-xl font-bold text-emerald-700 tabular-nums mt-1 block">
              {activeAccounts.length} Account{activeAccounts.length === 1 ? '' : 's'}
            </span>
            <span className="text-[11px] text-[#787167] mt-0.5 block truncate">
              {activeAccounts[0]
                ? `${activeAccounts[0].method}: ${activeAccounts[0].accountNumber}`
                : 'အကောင့် ထည့်သွင်းပါ'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 01: Dating Package Menu Cards Editor */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E6DFD3] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#EFECE6]">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#0C0D0E]">
              01. Dating Package Menu Cards (ဈေးနှုန်းနှင့် သတ်မှတ်ကြာချိန် ကတ်များ)
            </h3>
            <p className="text-xs text-[#5C564E] mt-1">
              Telegram Bot နှင့် Website တွင် ဧည့်သည်များ တစ်ခုချင်းစီ ကြည့်ရှုရွေးချယ်နိုင်မည့် Menu Card များ ဖြစ်ပါသည်။ ဈေးနှုန်းနှင့် သတ်မှတ်ကြာချိန် (နာရီ) ကို တိုက်ရိုက် ပြင်ဆင်နိုင်ပါသည်။
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddPackage}
            className="px-4 py-2.5 rounded-lg bg-[#0C0D0E] text-[#FAF8F5] hover:bg-[#9E7B36] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Plus size={15} />
            <span>Menu Card အသစ်ထည့်မည်</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {draft.datingPackages.map((pkg, idx) => {
            const dep = calculatePackageDeposit(pkg.price, draft.depositPercent);
            const isCore = ['sec', 'day', 'night'].includes(pkg.id);

            return (
              <div
                key={pkg.id}
                className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                  pkg.enabled !== false
                    ? 'bg-[#FAF8F5] border-[#E6DFD3]'
                    : 'bg-[#FAF8F5]/50 border-dashed border-[#D5CEC2] opacity-75'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Top Bar: Index, Icon Picker, Visibility Toggle */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6DFD3]">
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Package ${idx + 1} Icon`}
                        value={pkg.icon}
                        onChange={(e) => handlePackageChange(pkg.id, 'icon', e.target.value)}
                        className="bg-white border border-[#E6DFD3] rounded-lg px-2 py-1.5 text-base cursor-pointer outline-none focus:border-[#0C0D0E]"
                      >
                        {PACKAGE_ICONS.map((ic) => (
                          <option key={ic} value={ic}>
                            {ic}
                          </option>
                        ))}
                      </select>
                      <div>
                        <span className="font-mono text-[11px] font-semibold text-[#9E7B36] block">
                          MENU CARD 0{idx + 1} · {pkg.id.toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-[#0C0D0E]">
                          {pkg.nameMm || pkg.title}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handlePackageChange(pkg.id, 'enabled', pkg.enabled === false)
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer whitespace-nowrap ${
                          pkg.enabled !== false
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-white text-[#787167] border-[#E6DFD3]'
                        }`}
                      >
                        {pkg.enabled !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                        <span>{pkg.enabled !== false ? 'Active' : 'Hidden'}</span>
                      </button>

                      {!isCore && (
                        <button
                          type="button"
                          onClick={() => handleRemovePackage(pkg.id)}
                          aria-label={`Delete ${pkg.title}`}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Package Name & Highlight Label */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#0C0D0E] mb-1">
                        Package အမည် (Menu Title) *
                      </label>
                      <input
                        type="text"
                        value={pkg.nameMm}
                        onChange={(e) => {
                          handlePackageChange(pkg.id, 'nameMm', e.target.value);
                          if (!isCore) {
                            handlePackageChange(pkg.id, 'title', e.target.value);
                          }
                        }}
                        placeholder="ဥပမာ — Section (အချိန်ပိုင်း)"
                        className="w-full px-3 py-2.5 bg-white border border-[#E6DFD3] rounded-lg text-xs sm:text-sm font-semibold text-[#0C0D0E] outline-none focus:border-[#0C0D0E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6E675F] mb-1">
                        Highlight စာသား
                      </label>
                      <input
                        type="text"
                        value={pkg.badge || ''}
                        onChange={(e) => handlePackageChange(pkg.id, 'badge', e.target.value)}
                        placeholder="Popular / VIP"
                        className="w-full px-3 py-2.5 bg-white border border-[#E6DFD3] rounded-lg text-xs text-[#9E7B36] font-semibold outline-none focus:border-[#0C0D0E]"
                      />
                    </div>
                  </div>

                  {/* Duration / Time Hours (သတ်မှတ်ကြာချိန်) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0C0D0E] mb-1 flex items-center gap-1.5">
                      <Clock size={13} className="text-[#9E7B36]" />
                      <span>သတ်မှတ်ကြာချိန် / အချိန်ပိုင်း (Duration / Hours) *</span>
                    </label>
                    <input
                      type="text"
                      value={pkg.duration}
                      onChange={(e) => handlePackageChange(pkg.id, 'duration', e.target.value)}
                      placeholder="ဥပမာ — ၂ နာရီ ~ ၃ နာရီ (1 Session)"
                      className="w-full px-3 py-2.5 bg-white border border-[#E6DFD3] rounded-lg text-xs sm:text-sm text-[#0C0D0E] font-medium outline-none focus:border-[#0C0D0E]"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {DURATION_QUICK_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handlePackageChange(pkg.id, 'duration', preset)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                            pkg.duration === preset
                              ? 'bg-[#0C0D0E] text-[#FAF8F5] border-[#0C0D0E]'
                              : 'bg-white text-[#5C564E] border-[#E6DFD3] hover:bg-[#F5EFE6]'
                          }`}
                        >
                          {preset.split(' (')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price in Kyats + Quick Adjusters + Auto Deposit Calculation */}
                  <div className="p-3.5 rounded-lg bg-white border border-[#E6DFD3] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#0C0D0E]">
                        သတ်မှတ်ဈေးနှုန်း (Price in Ks) *
                      </label>
                      <span className="font-mono text-xs font-bold text-[#9E7B36] tabular-nums">
                        {formatKyats(pkg.price)} ကျပ်
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={pkg.price}
                        onChange={(e) =>
                          handlePackageChange(
                            pkg.id,
                            'price',
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        }
                        className="w-full pl-3.5 pr-12 py-2.5 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg font-mono text-base font-bold text-[#0C0D0E] tabular-nums outline-none focus:bg-white focus:border-[#0C0D0E]"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-[#6E675F]">
                        Ks
                      </span>
                    </div>

                    {/* Quick Price Stepper Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: '-10,000', delta: -10000 },
                        { label: '+10,000', delta: 10000 },
                        { label: '+50,000', delta: 50000 },
                      ].map((step) => (
                        <button
                          key={step.label}
                          type="button"
                          onClick={() =>
                            handlePackageChange(
                              pkg.id,
                              'price',
                              Math.max(0, Number(pkg.price || 0) + step.delta)
                            )
                          }
                          className="px-2.5 py-1 rounded bg-[#FAF8F5] hover:bg-[#F5EFE6] border border-[#E6DFD3] font-mono text-[11px] font-semibold text-[#0C0D0E] tabular-nums cursor-pointer"
                        >
                          {step.label}
                        </button>
                      ))}
                    </div>

                    {/* Live Deposit & Balance Breakdown */}
                    <div className="pt-2.5 border-t border-[#EFECE6] flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-[#5C564E]">
                        စရံ ({dep.depositPercent}%):{' '}
                        <strong className="text-emerald-700">
                          {formatKyats(dep.depositAmount)} Ks
                        </strong>
                      </span>
                      <span className="text-[#787167]">
                        ကျန်ငွေ: {formatKyats(dep.remainingAmount)} Ks
                      </span>
                    </div>
                  </div>

                  {/* Description / Service Note */}
                  <div>
                    <label className="block text-xs font-semibold text-[#6E675F] mb-1">
                      ဝန်ဆောင်မှု အသေးစိတ် မှတ်ချက် (Bot Card တွင် ပြသမည့် စာသား)
                    </label>
                    <input
                      type="text"
                      value={pkg.description || ''}
                      onChange={(e) => handlePackageChange(pkg.id, 'description', e.target.value)}
                      placeholder="ဥပမာ — အချိန်တို သီးသန့်တွေ့ဆုံမှု / Private Session"
                      className="w-full px-3 py-2 bg-white border border-[#E6DFD3] rounded-lg text-xs text-[#0C0D0E] outline-none focus:border-[#0C0D0E]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 02 & 03: Deposit %, Service Fees & Payment Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Deposit Policy & Client ID / Private Media Fees */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-xl border border-[#E6DFD3] space-y-6">
          <div className="pb-4 border-b border-[#EFECE6]">
            <h3 className="font-serif text-xl font-semibold text-[#0C0D0E]">
              02. စရံငွေ ရာခိုင်နှုန်း နှင့် Member ဝန်ဆောင်ခများ
            </h3>
            <p className="text-xs text-[#5C564E] mt-1">
              Booking စရံငွေ ရာခိုင်နှုန်း၊ Client ID ဝယ်ယူခ နှင့် Private ပုံ/Video ကြည့်ရှုခများကို သတ်မှတ်ပါ။
            </p>
          </div>

          {/* Booking Deposit Percentage */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6DFD3] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#0C0D0E]">
                Booking စရံငွေ ရာခိုင်နှုန်း (Deposit %)
              </label>
              <span className="font-mono text-sm font-bold text-[#9E7B36] tabular-nums">
                {draft.depositPercent}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[30, 50, 70, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => updateDraft({ depositPercent: pct })}
                  className={`py-2 px-3 rounded-lg font-mono text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                    draft.depositPercent === pct
                      ? 'bg-[#0C0D0E] text-[#FAF8F5] border-[#0C0D0E]'
                      : 'bg-white text-[#0C0D0E] border-[#E6DFD3] hover:bg-[#F5EFE6]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Client ID Fee */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6DFD3] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#0C0D0E] flex items-center gap-1.5">
                <KeyRound size={14} className="text-[#9E7B36]" />
                <span>Client ID ဝယ်ယူခ (VIP Pass Fee)</span>
              </label>
              <span className="font-mono text-xs font-bold text-[#0C0D0E] tabular-nums">
                {formatKyats(draft.clientIdFee)} Ks
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={1000}
                value={draft.clientIdFee}
                onChange={(e) =>
                  updateDraft({ clientIdFee: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full pl-3.5 pr-12 py-2.5 bg-white border border-[#E6DFD3] rounded-lg font-mono text-sm font-bold text-[#0C0D0E] tabular-nums outline-none focus:border-[#0C0D0E]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#6E675F]">
                Ks
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[5000, 10000, 15000, 20000, 30000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => updateDraft({ clientIdFee: val })}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold border cursor-pointer tabular-nums ${
                    draft.clientIdFee === val
                      ? 'bg-[#0C0D0E] text-[#FAF8F5] border-[#0C0D0E]'
                      : 'bg-white text-[#5C564E] border-[#E6DFD3] hover:bg-[#F5EFE6]'
                  }`}
                >
                  {formatKyats(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Private Photo & Video Fee */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6DFD3] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#0C0D0E] flex items-center gap-1.5">
                <Lock size={14} className="text-[#9E7B36]" />
                <span>Private Photo & Video ကြည့်ရှုခ</span>
              </label>
              <span className="font-mono text-xs font-bold text-[#0C0D0E] tabular-nums">
                {formatKyats(draft.privFee)} Ks
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={1000}
                value={draft.privFee}
                onChange={(e) =>
                  updateDraft({ privFee: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full pl-3.5 pr-12 py-2.5 bg-white border border-[#E6DFD3] rounded-lg font-mono text-sm font-bold text-[#0C0D0E] tabular-nums outline-none focus:border-[#0C0D0E]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#6E675F]">
                Ks
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[5000, 10000, 15000, 20000, 30000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => updateDraft({ privFee: val })}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold border cursor-pointer tabular-nums ${
                    draft.privFee === val
                      ? 'bg-[#0C0D0E] text-[#FAF8F5] border-[#0C0D0E]'
                      : 'bg-white text-[#5C564E] border-[#E6DFD3] hover:bg-[#F5EFE6]'
                  }`}
                >
                  {formatKyats(val)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Structured Payment Accounts Manager */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-xl border border-[#E6DFD3] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EFECE6]">
            <div>
              <h3 className="font-serif text-xl font-semibold text-[#0C0D0E]">
                03. ငွေလွှဲလက်ခံမည့် အကောင့်များ (Payment Accounts)
              </h3>
              <p className="text-xs text-[#5C564E] mt-1">
                KPay, WavePay, AYA Pay, CB Pay သို့မဟုတ် ဘဏ်အကောင့်များကို တစ်ခုထက်မက ထည့်သွင်းထားနိုင်ပါသည်။ Bot တွင် ဧည့်သည်များ အကောင့်နံပါတ်ကို တစ်ချက်နှိပ်ရုံဖြင့် Copy ကူးယူနိုင်ပါမည်။
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddAccount}
              className="px-3.5 py-2 rounded-lg bg-[#0C0D0E] text-[#FAF8F5] hover:bg-[#9E7B36] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
            >
              <Plus size={14} />
              <span>အကောင့် အသစ်ထည့်မည်</span>
            </button>
          </div>

          <div className="space-y-4">
            {draft.paymentAccounts.map((acc, index) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6DFD3] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-[#9E7B36]">
                    PAYMENT ACCOUNT 0{index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleAccountChange(acc.id, 'enabled', acc.enabled === false)
                      }
                      className={`px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer ${
                        acc.enabled !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-white text-[#787167] border-[#E6DFD3]'
                      }`}
                    >
                      {acc.enabled !== false ? 'Active' : 'Disabled'}
                    </button>
                    {draft.paymentAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAccount(acc.id)}
                        className="p-1.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                        aria-label="Remove payment account"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#6E675F] mb-1">
                      ငွေပေးချေမှု အမျိုးအစား (Method)
                    </label>
                    <input
                      type="text"
                      list={`payment-methods-${acc.id}`}
                      value={acc.method}
                      onChange={(e) => handleAccountChange(acc.id, 'method', e.target.value)}
                      placeholder="KBZPay (KPay)"
                      className="w-full px-3 py-2.5 bg-white border border-[#E6DFD3] rounded-lg text-xs sm:text-sm font-semibold text-[#0C0D0E] outline-none focus:border-[#0C0D0E]"
                    />
                    <datalist id={`payment-methods-${acc.id}`}>
                      {PAYMENT_METHOD_PRESETS.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6E675F] mb-1">
                      ဖုန်းနံပါတ် / အကောင့်နံပါတ် *
                    </label>
                    <input
                      type="text"
                      value={acc.accountNumber}
                      onChange={(e) =>
                        handleAccountChange(acc.id, 'accountNumber', e.target.value)
                      }
                      placeholder="09xxxxxxxxx"
                      className="w-full px-3 py-2.5 bg-white border border-[#E6DFD3] rounded-lg font-mono text-xs sm:text-sm font-bold text-[#0C0D0E] tabular-nums outline-none focus:border-[#0C0D0E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6E675F] mb-1">
                      အကောင့်ပိုင်ရှင် အမည် (Account Name)
                    </label>
                    <input
                      type="text"
                      value={acc.accountName}
                      onChange={(e) => handleAccountChange(acc.id, 'accountName', e.target.value)}
                      placeholder="ဥပမာ — U Mya / Daw Hla"
                      className="w-full px-3 py-2.5 bg-white border border-[#E6DFD3] rounded-lg text-xs sm:text-sm text-[#0C0D0E] outline-none focus:border-[#0C0D0E]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Combined Payment Info Summary Box */}
          <div className="p-4 rounded-xl bg-[#F5EFE6] border border-[#E6DFD3] space-y-1.5">
            <span className="text-xs font-semibold text-[#9E7B36] block">
              Bot တွင် ပြသမည့် ငွေလွှဲအကောင့် စာသား (Auto-Formatted Payment Summary)
            </span>
            <pre className="font-mono text-xs sm:text-sm font-semibold text-[#0C0D0E] whitespace-pre-wrap">
              {draft.paymentInfo || 'အကောင့်နံပါတ် ထည့်သွင်းပေးပါ'}
            </pre>
          </div>
        </div>
      </div>

      {/* Section 04: Interactive Live Telegram Bot Menu Cards Preview */}
      <div className="bg-slate-950 text-slate-100 p-6 sm:p-8 rounded-xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <Smartphone size={14} />
              <span>LIVE TELEGRAM BOT INTERACTIVE MENU CARDS PREVIEW</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white mt-1">
              04. Telegram Bot တွင် ဧည့်သည်မြင်ရမည့် Menu Card ပုံစံ နမူနာ
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ယခင်ကဲ့သို့ စာတစ်စောင်တည်း ရောထွေးပြသမည့်အစား အောက်ပါအတိုင်း Menu Card တစ်ခုချင်းစီကို ဈေးနှုန်း၊ သတ်မှတ်ကြာချိန်၊ စရံငွေ နှင့် ရွေးချယ်ရန် ခလုတ်တို့ဖြင့် သီးသန့်စီ ပြသပေးပါမည်။
            </p>
          </div>
        </div>

        {/* Simulated Telegram Chat Menu Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {activePackages.map((pkg, idx) => {
            const dep = calculatePackageDeposit(pkg.price, draft.depositPercent);
            const isPreviewSelected = selectedPreviewPkg?.id === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                  isPreviewSelected
                    ? 'bg-slate-900 border-amber-500/70'
                    : 'bg-slate-900/75 border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  {/* Telegram Message Bubble Header */}
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2.5">
                    <span className="font-mono font-bold text-amber-400">
                      {pkg.icon} MENU CARD 0{idx + 1} · {pkg.title.toUpperCase()}
                    </span>
                    {pkg.badge && (
                      <span className="font-mono text-[11px] text-emerald-400">
                        ★ {pkg.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs leading-relaxed">
                    <p className="text-white font-semibold text-sm">
                      💎 Package: {pkg.nameMm || pkg.title}
                    </p>
                    <p className="text-slate-300">
                      ⏱️ <span className="text-slate-400">သတ်မှတ်ကြာချိန်:</span>{' '}
                      <strong className="text-amber-300">{pkg.duration}</strong>
                    </p>
                    <p className="text-slate-300 font-mono tabular-nums">
                      💰 <span className="text-slate-400 font-sans">သတ်မှတ်ဈေးနှုန်း:</span>{' '}
                      <strong className="text-white text-sm">{formatKyats(pkg.price)} ကျပ်</strong>
                    </p>
                    <p className="text-slate-300 font-mono tabular-nums">
                      💳{' '}
                      <span className="text-slate-400 font-sans">
                        ပေးသွင်းရမည့် စရံ ({dep.depositPercent}%):
                      </span>{' '}
                      <strong className="text-emerald-400">
                        {formatKyats(dep.depositAmount)} ကျပ်
                      </strong>
                    </p>
                    {pkg.description && (
                      <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-800/80">
                        📝 {pkg.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Simulated Telegram Inline Keyboard Button under each Menu Card */}
                <button
                  type="button"
                  onClick={() => setPreviewSelectedPkgId(pkg.id)}
                  className={`mt-4 w-full py-2.5 px-3 rounded-lg font-semibold text-xs text-center transition-colors cursor-pointer border ${
                    isPreviewSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800/90 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  ✅ {pkg.title} ရွေးချယ်မည် ({formatKyats(pkg.price)} Ks · စရံ{' '}
                  {formatKyats(dep.depositAmount)} Ks)
                </button>
              </div>
            );
          })}
        </div>

        {/* Simulated Follow-up Invoice Message when Client clicks a Menu Card in Bot */}
        {selectedPreviewPkg && (() => {
          const dep = calculatePackageDeposit(selectedPreviewPkg.price, draft.depositPercent);
          return (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                <span>
                  STEP 2 &amp; 3 PREVIEW — ဧည့်သည်မှ &quot;{selectedPreviewPkg.title}&quot; Card ကို ရွေးပြီး Calendar Date Picker &amp; Time Picker ဖြင့် နေ့ရက်/အချိန် ရွေးချယ်ပြီးချိန် ပေါ်လာမည့် ငွေလွှဲ Invoice
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5 text-slate-200 leading-relaxed">
                  <p className="font-semibold text-white">
                    🧾 Booking အချက်အလက် အတည်ပြုချက် (Booking Summary &amp; Invoice)
                  </p>
                  <p>
                    📦 <strong>Package:</strong> {selectedPreviewPkg.icon}{' '}
                    {selectedPreviewPkg.nameMm}
                  </p>
                  <p>
                    ⏱️ <strong>သတ်မှတ်ကြာချိန်:</strong> {selectedPreviewPkg.duration}
                  </p>
                  <p className="text-amber-300">
                    📅 <strong>ခေါ်ယူလိုသည့် နေ့ရက် (Date Picker):</strong> ယနေ့ / မနက်ဖြန် / ရွေးချယ်ထားသော ရက်စွဲ
                  </p>
                  <p className="text-amber-300">
                    ⏰ <strong>ခေါ်ယူလိုသည့် အချိန် (Time Picker):</strong> 08:00 PM (ညပိုင်း)
                  </p>
                  <p className="font-mono tabular-nums">
                    💰 <strong>စုစုပေါင်း ကျသင့်ငွေ:</strong>{' '}
                    {formatKyats(selectedPreviewPkg.price)} ကျပ်
                  </p>
                  <p className="font-mono tabular-nums text-emerald-400">
                    💳 <strong>ယခုလွှဲရမည့် စရံငွေ ({dep.depositPercent}%):</strong>{' '}
                    {formatKyats(dep.depositAmount)} ကျပ်
                  </p>
                  <p className="font-mono tabular-nums text-slate-400">
                    💵 <strong>တွေ့ဆုံချိန် ကျန်ငွေ:</strong>{' '}
                    {formatKyats(dep.remainingAmount)} ကျပ်
                  </p>
                </div>

                <div className="space-y-2 bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
                  <p className="text-amber-400 font-semibold">
                    🏦 ငွေလွှဲရန် အကောင့်များ (နှိပ်၍ Copy ကူးနိုင်သည်) -
                  </p>
                  {activeAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded border border-slate-800"
                    >
                      <span className="font-mono text-xs text-slate-200">
                        {acc.method}: <strong className="text-amber-300">{acc.accountNumber}</strong>
                        {acc.accountName ? ` (${acc.accountName})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyAccountNumber(acc.accountNumber)}
                        className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPreviewAcc === acc.accountNumber ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400 pt-1">
                    📸 ငွေလွှဲပြီးပါက ငွေလွှဲပြေစာ (Screenshot) ကို ယခု Chat ထဲသို့ ပေးပို့ပေးပါ။
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Bottom Save Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            {hasLocalEdits
              ? '⚠️ မသိမ်းဆည်းရသေးသော ပြင်ဆင်ချက်များ ရှိနေပါသည်။ Save နှိပ်၍ အတည်ပြုပေးပါ။'
              : '✅ လက်ရှိ ဈေးနှုန်းများနှင့် Menu Card များသည် Telegram Bot နှင့် ချိတ်ဆက်ပြီး ဖြစ်ပါသည်။'}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-lg welink-brand-gradient text-slate-950 font-bold text-xs sm:text-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save size={15} />
            <span>
              {isSaving
                ? 'သိမ်းဆည်းနေပါသည်...'
                : 'ပြင်ဆင်ထားသော ဈေးနှုန်းနှင့် Menu Card များကို သိမ်းဆည်းမည်'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
