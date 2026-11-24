import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, doc, getDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import {
  CheckCircle2,
  UploadCloud,
  X,
  ShieldCheck,
  AlertCircle,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import {
  BRAND_LOGO_URL,
  CLIENT_PREFERENCE_OPTIONS,
  GIRL_ONLY_REMINDER_MESSAGE,
  validateRegistrationForm,
} from '../utils/catalogLogic';
import {
  buildUnifiedLocationCatalog,
  getCitiesFromCatalog,
  getTownshipsForCity,
  locationExistsInCatalog,
  normalizeLocationKey,
} from '../utils/myanmarLocations';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    city: '',
    township: '',
    height: '',
    cockSize: '',
    address: '',
    bio: '',
    clientPreference: '',
  });
  const [girlOnlyConfirmed, setGirlOnlyConfirmed] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [customTownship, setCustomTownship] = useState('');

  const [locations, setLocations] = useState([]);
  const [masterRegions, setMasterRegions] = useState(null);

  const [publicPhotos, setPublicPhotos] = useState([]);
  const [privatePhotos, setPrivatePhotos] = useState([]);
  const [compressingType, setCompressingType] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const [masterSnap, locsSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'myanmar_locations')),
          getDocs(collection(db, 'locations')),
        ]);
        if (masterSnap.exists() && Array.isArray(masterSnap.data().regions)) {
          setMasterRegions(masterSnap.data().regions);
        }
        setLocations(locsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };
    fetchLocations();
  }, []);

  const locationCatalog = buildUnifiedLocationCatalog(masterRegions, locations);
  const cities = getCitiesFromCatalog(locationCatalog);
  const townships = getTownshipsForCity(locationCatalog, formData.city);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValidationError(null);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'city' ? { township: '' } : {}),
    }));
    if (name === 'city') {
      setCustomTownship('');
    }
    if (name === 'clientPreference' && value !== 'girl_only') {
      setGirlOnlyConfirmed(true);
    }
  };

  const handleSelectPreference = (prefId) => {
    setValidationError(null);
    setFormData((prev) => ({ ...prev, clientPreference: prefId }));
    if (prefId === 'girl_only') {
      setGirlOnlyConfirmed(false);
    } else {
      setGirlOnlyConfirmed(true);
    }
  };

  const handleMultipleImages = async (e, setPhotoListState, typeKey) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setValidationError(null);
    setCompressingType(typeKey);
    const compressedImages = [];

    for (const file of files) {
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(compressedFile);
          reader.onloadend = () => resolve(reader.result);
        });
        compressedImages.push(base64);
      } catch (error) {
        console.error('Compression error:', error);
      }
    }

    setPhotoListState((prev) => [...prev, ...compressedImages]);
    setCompressingType('');
    e.target.value = '';
  };

  const removePhotoAt = (setPhotoListState, index) => {
    setPhotoListState((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);

    const validation = validateRegistrationForm({
      formData,
      customCity,
      customTownship,
      publicPhotos,
      privatePhotos,
      agreeTerms,
      agreePrivacy,
      requireClientPreference: true,
      girlOnlyConfirmed,
    });

    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    const { finalCity, finalTownship, finalClientPreference } = validation;

    setIsSubmitting(true);
    try {
      const isCustomLocationRequest = formData.city === 'other' || formData.township === 'other';
      let locationRequestId = null;

      if (
        isCustomLocationRequest &&
        !locationExistsInCatalog(locationCatalog, finalCity, finalTownship)
      ) {
        const isPendingExist = locations.find(
          (l) =>
            normalizeLocationKey(l.city) === normalizeLocationKey(finalCity) &&
            normalizeLocationKey(l.township) === normalizeLocationKey(finalTownship)
        );
        if (!isPendingExist) {
          const locDocRef = await addDoc(collection(db, 'locations'), {
            city: finalCity,
            township: finalTownship,
            status: 'pending',
            requestedBy: formData.name.trim(),
            requestedPhone: formData.phone.trim(),
            requestedVia: 'web_register',
            createdAt: serverTimestamp(),
          });
          locationRequestId = locDocRef.id;
        } else {
          locationRequestId = isPendingExist.id || null;
        }
      }

      const docRef = await addDoc(collection(db, 'dateboys'), {
        ...formData,
        city: finalCity,
        township: finalTownship,
        clientPreference: finalClientPreference,
        publicPhotos,
        publicPhoto: publicPhotos[0] || '',
        privatePhotos,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_action: 'web_new_registration',
          boyId: docRef.id,
          name: formData.name,
          age: formData.age,
          height: formData.height,
          cockSize: formData.cockSize,
          phone: formData.phone,
          city: finalCity,
          township: finalTownship,
          address: formData.address,
          clientPreference: finalClientPreference,
          isCustomLocationRequest,
          locationRequestId,
        }),
      }).catch((e) => console.error('Admin bot notification error:', e));

      setIsSuccess(true);
    } catch (error) {
      console.error('Submission error:', error);
      setValidationError(
        'ဆာဗာသို့ ပေးပို့ရာတွင် အခက်အခဲဖြစ်ပေါ်နေပါသည်။ ခေတ္တစောင့်ဆိုင်းပြီး ပြန်လည်ကြိုးစားကြည့်ပါ။'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1.5 w-full welink-spectrum-bar" />
          <div className="p-8 sm:p-12 space-y-6">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <p className="font-mono text-xs tracking-widest text-emerald-700 font-semibold">
                DOSSIER REGISTERED FOR EXECUTIVE REVIEW
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900">
                လျှောက်ထားမှု အောင်မြင်ပါသည်
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                သင့်အချက်အလက်နှင့် ဓာတ်ပုံများကို WE LINK Management မှ လက်ခံရရှိပြီးပါပြီ။ စစ်ဆေးအတည်ပြုပြီးပါက ဆက်သွယ်ပေးပါမည်။
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl welink-brand-gradient text-slate-950 text-xs sm:text-sm font-bold hover:opacity-95 transition-opacity"
              >
                <ArrowLeft size={15} />
                <span>Return to Companion Directory</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="h-1.5 w-full welink-spectrum-bar" />
        {/* Luxury Brand Header */}
        <div className="bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#062E22] text-white p-8 sm:p-12 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <p className="font-mono text-xs tracking-[0.2em] text-amber-300 font-semibold">
                WE LINK · ALL OF YOU · TALENT ONBOARDING
              </p>
              <h1 className="font-serif text-3xl sm:text-5xl font-medium text-white">
                Companion Application Dossier
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                WE LINK ၏ Date Boy အဖြစ် ပါဝင်လိုသူများအတွက် လျှို့ဝှက်လျှောက်လွှာ။ Public ပုံ နှင့် Private ပုံ အနည်းဆုံး (၃) ပုံစီ တင်ပေးရန် လိုအပ်ပါသည်။
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 p-2.5 rounded-2xl self-start">
              <img
                src={BRAND_LOGO_URL}
                alt="WE LINK All Of You Logo"
                className="w-14 h-14 object-contain rounded-xl bg-white p-1 shadow-sm"
              />
              <div className="pr-2 hidden sm:block">
                <span className="font-serif text-base font-bold tracking-widest text-white block">
                  WE LINK
                </span>
                <span className="font-mono text-[10px] tracking-[0.18em] text-emerald-300 block">
                  ALL OF YOU
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-10 lg:p-12 space-y-10">
          {/* Section 01: Personal & Physical Dossier */}
          <section className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="font-serif text-2xl font-semibold text-slate-900">
                01. Personal & Physical Specifications
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide accurate measurements and contact credentials for concierge verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Stage Name or Full Name (အမည်) *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  placeholder="ဥပမာ — Julian / အောင်အောင်"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-age"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Age (အသက်) *
                </label>
                <input
                  id="reg-age"
                  type="number"
                  name="age"
                  min="18"
                  max="60"
                  required
                  value={formData.age}
                  placeholder="25"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm font-mono tabular-nums transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-height"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Height (အရပ်အမြင့်) *
                </label>
                <input
                  id="reg-height"
                  type="text"
                  name="height"
                  required
                  value={formData.height}
                  placeholder="5' 11&quot;"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm font-mono transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-cocksize"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Private Measurement / Size (လက်မဖြင့်)
                </label>
                <input
                  id="reg-cocksize"
                  type="text"
                  name="cockSize"
                  value={formData.cockSize}
                  placeholder="6.5&quot; (Admin စစ်ဆေးရန်)"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm font-mono transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Direct Phone / Telegram Contact (ဆက်သွယ်ရန် ဖုန်းနံပါတ်) *
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  placeholder="09xxxxxxxxx"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white outline-none text-sm font-mono tabular-nums transition-colors"
                />
              </div>

              {/* Client Preference Selection (Girl Only / LGBT Only / Both) */}
              <div className="sm:col-span-2 pt-2">
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-900">
                    Client Preference / လက်ခံလိုသော ဧည့်သည်အမျိုးအစား ရွေးချယ်ရန် *
                  </label>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Girl Only ပဲ လိုက်ချင်တာလား၊ LGBT Only ပဲ လိုက်ချင်တာလား၊ နှစ်ခုလုံး ဘာဖြစ်ဖြစ် အဆင်ပြေတာလားဆိုတာ တစ်ခါတည်း ရွေးချယ်ပေးပါ။
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {CLIENT_PREFERENCE_OPTIONS.map((opt) => {
                    const isSelected = formData.clientPreference === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectPreference(opt.id)}
                        className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? opt.id === 'girl_only'
                              ? 'bg-amber-950 text-white border-amber-500 shadow-sm'
                              : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100/80 text-slate-900 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span
                              className={`font-mono text-[11px] font-bold tracking-wider uppercase ${
                                isSelected ? 'text-amber-300' : 'text-emerald-700'
                              }`}
                            >
                              {opt.shortLabel}
                            </span>
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-amber-400 bg-amber-400 text-slate-950'
                                  : 'border-slate-400'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                            </span>
                          </div>
                          <p
                            className={`text-xs sm:text-sm font-semibold leading-snug ${
                              isSelected ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </p>
                        </div>
                        <p
                          className={`text-[11px] mt-2 leading-relaxed ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Girl Only Low-Demand Reminder & Explicit Confirmation */}
                {formData.clientPreference === 'girl_only' && (
                  <div
                    role="region"
                    aria-label="Girl Only Client Volume Reminder"
                    className="mt-4 p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
                        <p className="font-bold text-amber-950">
                          ⚠️ အထူးသတိပေးချက် (Girl Only ရွေးချယ်ထားသူများအတွက်)
                        </p>
                        <p className="text-amber-900">{GIRL_ONLY_REMINDER_MESSAGE}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="flex items-start sm:items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={girlOnlyConfirmed}
                          onChange={(e) => {
                            setGirlOnlyConfirmed(e.target.checked);
                            setValidationError(null);
                          }}
                          className="mt-0.5 sm:mt-0 w-4 h-4 accent-amber-600 rounded shrink-0"
                        />
                        <span className="text-xs font-semibold text-amber-950">
                          Girl Only ရွေးချယ်ပါက ဧည့်သည်ရရှိမှု နည်းပါးနိုင်ကြောင်း သိရှိနားလည်ပြီး Girl Only ဖြင့်သာ ဆက်လက်လျှောက်ထားလိုပါသည်။ *
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleSelectPreference('both')}
                        className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        နှစ်ခုလုံး (Girl &amp; LGBT) သို့ ပြောင်းရွေးမည်
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 02: Residency & Service Jurisdiction */}
          <section className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="font-serif text-2xl font-semibold text-slate-900">
                02. Residency & Service Jurisdiction
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your primary city and township. Exact residential addresses remain strictly private.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50/90 p-5 rounded-xl border border-slate-200/80">
              <div>
                <label
                  htmlFor="reg-city"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  City / မြို့ ရွေးချယ်ရန် *
                </label>
                <select
                  id="reg-city"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-amber-500 outline-none text-sm cursor-pointer"
                >
                  <option value="">-- မြို့ / တိုင်းဒေသကြီး ရွေးချယ်ပါ --</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="other">+ အခြား (List ထဲတွင် မရှိပါက Request လုပ်မည်)</option>
                </select>
                {formData.city === 'other' && (
                  <div className="mt-3 space-y-1.5">
                    <input
                      type="text"
                      aria-label="Request New City Name"
                      placeholder="Request လုပ်လိုသော မြို့အမည် ရိုက်ထည့်ပါ..."
                      required
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-amber-400 outline-none text-sm"
                    />
                    <p className="text-[11px] text-amber-700 font-medium">
                      Admin ထံသို့ မြို့အသစ် Request အဖြစ် ပေးပို့ပေးပါမည်။
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-township"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Township / မြို့နယ် ရွေးချယ်ရန် *
                </label>
                {formData.city === 'other' ? (
                  <div className="space-y-1.5">
                    <input
                      id="reg-township"
                      type="text"
                      placeholder="Request လုပ်လိုသော မြို့နယ်အမည် ရိုက်ထည့်ပါ..."
                      required
                      value={customTownship}
                      onChange={(e) => setCustomTownship(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-amber-400 outline-none text-sm"
                    />
                    <p className="text-[11px] text-amber-700 font-medium">
                      Admin ထံသို့ မြို့နယ်အသစ် Request အဖြစ် ပေးပို့ပေးပါမည်။
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      id="reg-township"
                      name="township"
                      required
                      value={formData.township}
                      onChange={handleChange}
                      disabled={!formData.city}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-emerald-500 outline-none text-sm cursor-pointer disabled:opacity-50"
                    >
                      <option value="">
                        {formData.city ? '-- မြို့နယ် ရွေးချယ်ပါ --' : 'အရင်ဆုံး မြို့ကိုရွေးပါ'}
                      </option>
                      {townships.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      {formData.city && (
                        <option value="other">+ အခြား (List ထဲတွင် မရှိပါက Request လုပ်မည်)</option>
                      )}
                    </select>
                    {formData.township === 'other' && (
                      <div className="mt-3 space-y-1.5">
                        <input
                          type="text"
                          aria-label="Request New Township Name"
                          placeholder="Request လုပ်လိုသော မြို့နယ်အမည် ရိုက်ထည့်ပါ..."
                          required
                          value={customTownship}
                          onChange={(e) => setCustomTownship(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-amber-400 outline-none text-sm"
                        />
                        <p className="text-[11px] text-amber-700 font-medium">
                          Admin ထံသို့ မြို့နယ်အသစ် Request အဖြစ် ပေးပို့ပေးပါမည်။
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="reg-address"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Confidential Residential Address (လိပ်စာအပြည့်အစုံ — Admin သာမြင်ရပါမည်) *
                </label>
                <input
                  id="reg-address"
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  placeholder="အမှတ်၊ လမ်း၊ ရပ်ကွက်..."
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-amber-500 outline-none text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="reg-bio"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Brief Companion Bio / Languages & Interests (မိတ်ဆက်အကျဉ်း)
                </label>
                <textarea
                  id="reg-bio"
                  name="bio"
                  rows={2}
                  value={formData.bio}
                  placeholder="ဥပမာ — English/Myanmar speaking, fitness enthusiast, available for dinner & social events..."
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-amber-500 outline-none text-sm"
                />
              </div>
            </div>
          </section>

          {/* Section 03: Visual Portfolio Uploaders */}
          <section className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="font-serif text-2xl font-semibold text-slate-900">
                03. Visual Portfolio & Verification Media
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload a minimum of 3 Public Portraits and 3 Private Verification Photos. Images are automatically optimized on-device.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Public Portraits Upload Box */}
              <div className="bg-slate-50/90 rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Public Directory Portraits
                    </h3>
                    <p className="text-xs text-slate-500">
                      မျက်နှာနှင့် စတိုင်လ် သေချာမြင်ရသော အလှပုံ (အနည်းဆုံး ၃ ပုံ)
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-amber-600 tabular-nums">
                    {publicPhotos.length} / 3 Min
                  </span>
                </div>

                <label className="block border border-dashed border-amber-400 bg-white hover:bg-amber-50/40 transition-colors rounded-xl p-6 text-center cursor-pointer">
                  <UploadCloud className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                  <span className="block text-xs font-semibold text-slate-900">
                    {compressingType === 'public'
                      ? 'Optimizing Portraits...'
                      : 'Select Public Portraits (Multiple Allowed)'}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1">
                    JPG, PNG, WEBP · Auto-compressed
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMultipleImages(e, setPublicPhotos, 'public')}
                    className="hidden"
                  />
                </label>

                {publicPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    {publicPhotos.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-[3/4] rounded-lg overflow-hidden bg-slate-900 border border-slate-200 group"
                      >
                        <img
                          src={imgSrc}
                          alt={`Public preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhotoAt(setPublicPhotos, idx)}
                          aria-label={`Remove public photo ${idx + 1}`}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-950/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Private Verification Photos Upload Box */}
              <div className="bg-slate-50/90 rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <Lock size={13} className="text-emerald-600" />
                      <span>Private Verification Gallery</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Admin နှင့် VIP Client ID များသာ ကြည့်ရှုနိုင်သော Private ပုံ (အနည်းဆုံး ၃ ပုံ)
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-emerald-600 tabular-nums">
                    {privatePhotos.length} / 3 Min
                  </span>
                </div>

                <label className="block border border-dashed border-emerald-500/60 bg-white hover:bg-emerald-50/40 transition-colors rounded-xl p-6 text-center cursor-pointer">
                  <UploadCloud className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
                  <span className="block text-xs font-semibold text-slate-900">
                    {compressingType === 'private'
                      ? 'Encrypting & Optimizing...'
                      : 'Select Private Verification Photos'}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1">
                    Strictly Confidential · Never shown on public web
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMultipleImages(e, setPrivatePhotos, 'private')}
                    className="hidden"
                  />
                </label>

                {privatePhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    {privatePhotos.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-[3/4] rounded-lg overflow-hidden bg-slate-900 border border-slate-200 group"
                      >
                        <img
                          src={imgSrc}
                          alt={`Private preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhotoAt(setPrivatePhotos, idx)}
                          aria-label={`Remove private photo ${idx + 1}`}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-950/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 04: Governance & Discretion Consent */}
          <section className="bg-slate-50/90 rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-1">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>04. Agency Governance & Privacy Consent</span>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  setValidationError(null);
                }}
                className="mt-1 w-4 h-4 accent-emerald-600 rounded"
              />
              <span className="text-xs sm:text-sm text-slate-600">
                WE LINK Agency ၏ စည်းမျဉ်းစည်းကမ်းများ (Terms and Conditions) နှင့် အသက် ၁၈ နှစ်ပြည့်ပြီးကြောင်း အတည်ပြုသဘောတူပါသည်။
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => {
                  setAgreePrivacy(e.target.checked);
                  setValidationError(null);
                }}
                className="mt-1 w-4 h-4 accent-emerald-600 rounded"
              />
              <span className="text-xs sm:text-sm text-slate-600">
                Data Privacy & Confidentiality Policy အရ Public ပုံများကို Directory တွင် ပြသရန်နှင့် Private ပုံများကို VIP Client စိစစ်မှုတွင် အသုံးပြုရန် သဘောတူပါသည်။
              </span>
            </label>
          </section>

          {/* Inline Validation Banner */}
          {validationError && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium"
            >
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full welink-brand-gradient hover:opacity-95 text-slate-950 font-bold py-4 px-6 rounded-xl shadow-md transition-opacity text-sm sm:text-base tracking-wide disabled:opacity-50"
          >
            {isSubmitting
              ? 'Encrypting & Submitting Dossier...'
              : 'Submit Companion Application (လျှောက်လွှာတင်သွင်းမည်)'}
          </button>
        </form>
      </div>
    </div>
  );
}
