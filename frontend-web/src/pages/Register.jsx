import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
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
import { validateRegistrationForm } from '../utils/catalogLogic';

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
  });
  const [customCity, setCustomCity] = useState('');
  const [customTownship, setCustomTownship] = useState('');

  const [locations, setLocations] = useState([]);

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
        const snap = await getDocs(collection(db, 'locations'));
        setLocations(snap.docs.map((doc) => doc.data()));
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };
    fetchLocations();
  }, []);

  const activeLocations = locations.filter((l) => l.status !== 'pending');
  const cities = [...new Set(['Yangon', 'Mandalay', ...activeLocations.map((l) => l.city).filter(Boolean)])];
  const townships = [
    ...new Set(
      activeLocations
        .filter((l) => l.city === formData.city)
        .map((l) => l.township)
        .filter(Boolean)
    ),
  ];

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
    });

    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    const { finalCity, finalTownship } = validation;

    setIsSubmitting(true);
    try {
      if (formData.city === 'other' || formData.township === 'other') {
        const isExist = locations.find(
          (l) => l.city === finalCity && l.township === finalTownship
        );
        if (!isExist) {
          await addDoc(collection(db, 'locations'), {
            city: finalCity,
            township: finalTownship,
            status: 'pending',
          });
        }
      }

      await addDoc(collection(db, 'dateboys'), {
        ...formData,
        city: finalCity,
        township: finalTownship,
        publicPhotos,
        publicPhoto: publicPhotos[0] || '',
        privatePhotos,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
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
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-8 sm:p-12 space-y-6">
          <div className="w-16 h-16 bg-[#F5EFE6] border border-[#C5A059] rounded-full flex items-center justify-center mx-auto text-[#9E7B36]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-[#9E7B36] font-semibold">
              DOSSIER REGISTERED FOR EXECUTIVE REVIEW
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0C0D0E]">
              လျှောက်ထားမှု အောင်မြင်ပါသည်
            </h1>
            <p className="text-[#5C564E] text-sm leading-relaxed max-w-md mx-auto">
              သင့်အချက်အလက်နှင့် ဓာတ်ပုံများကို WE LINK Management မှ လက်ခံရရှိပြီးပါပြီ။ စစ်ဆေးအတည်ပြုပြီးပါက ဆက်သွယ်ပေးပါမည်။
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#0C0D0E] text-[#FAF8F5] text-xs sm:text-sm font-semibold hover:bg-[#1E2126] transition-colors"
            >
              <ArrowLeft size={15} />
              <span>Return to Companion Directory</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <div className="bg-white rounded-2xl border border-[#E6DFD3] overflow-hidden">
        {/* Luxury Editorial Header */}
        <div className="bg-[#0C0D0E] text-[#FAF8F5] p-8 sm:p-12 border-b border-[#262420]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="font-mono text-xs tracking-[0.2em] text-[#C5A059] font-semibold">
                CONFIDENTIAL TALENT ONBOARDING
              </p>
              <h1 className="font-serif text-3xl sm:text-5xl font-medium text-[#FAF8F5]">
                Companion Application Dossier
              </h1>
              <p className="text-[#B8B2A6] text-xs sm:text-sm max-w-xl leading-relaxed">
                WE LINK ၏ Date Boy အဖြစ် ပါဝင်လိုသူများအတွက် လျှို့ဝှက်လျှောက်လွှာ။ Public ပုံ နှင့် Private ပုံ အနည်းဆုံး (၃) ပုံစီ တင်ပေးရန် လိုအပ်ပါသည်။
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-xs text-[#C5A059] font-mono">
              <Lock size={14} />
              <span>ENCRYPTED SUBMISSION</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-10 lg:p-12 space-y-10">
          {/* Section 01: Personal & Physical Dossier */}
          <section className="space-y-5">
            <div className="border-b border-[#E6DFD3] pb-3">
              <h2 className="font-serif text-2xl font-semibold text-[#0C0D0E]">
                01. Personal & Physical Specifications
              </h2>
              <p className="text-xs text-[#6E675F] mt-0.5">
                Provide accurate measurements and contact credentials for concierge verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-[#0C0D0E] mb-1.5"
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
                  className="w-full px-4 py-3 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3] focus:border-[#0C0D0E] focus:bg-white outline-none text-sm transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-age"
                  className="block text-xs font-semibold text-[#0C0D0E] mb-1.5"
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
                  className="w-full px-4 py-3 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3] focus:border-[#0C0D0E] focus:bg-white outline-none text-sm font-mono tabular-nums transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-height"
                  className="block text-xs font-semibold text-[#0C0D0E] mb-1.5"
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
                  className="w-full px-4 py-3 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3] focus:border-[#0C0D0E] focus:bg-white outline-none text-sm font-mono transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-cocksize"
                  className="block text-xs font-semibold text-[#0C0D0E] mb-1.5"
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
                  className="w-full px-4 py-3 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3] focus:border-[#0C0D0E] focus:bg-white outline-none text-sm font-mono transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-semibold text-[#0C0D0E] mb-1.5"
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
                  className="w-full px-4 py-3 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3] focus:border-[#0C0D0E] focus:bg-white outline-none text-sm font-mono tabular-nums transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Section 02: Residency & Service Jurisdiction */}
          <section className="space-y-5">
            <div className="border-b border-[#E6DFD3] pb-3">
              <h2 className="font-serif text-2xl font-semibold text-[#0C0D0E]">
                02. Residency & Service Jurisdiction
              </h2>
              <p className="text-xs text-[#6E675F] mt-0.5">
                Select your primary city and township. Exact residential addresses remain strictly private.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-[#FAF8F5] p-5 rounded-xl border border-[#E6DFD3]">
              <div>
                <label
                  htmlFor="reg-city"
                  className="block text-xs font-semibold text-[#0C0D0E] mb-1.5"
                >
                  City / မြို့ ရွေးချယ်ရန် *
                </label>
                <select
                  id="reg-city"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#E6DFD3] focus:border-[#0C0D0E] outline-none text-sm cursor-pointer"
                >
                  <option value="">-- မြို့ရွေးပါ --</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="other">+ အခြား (မြို့အမည် အသစ်ထည့်မည်)</option>
                </select>
                {formData.city === 'other' && (
                  <input
                    type="text"
                    aria-label="New City Name"
                    placeholder="မြို့အမည် အသစ် ရိုက်ထည့်ပါ..."
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    className="w-full px-4 py-3 mt-3 rounded-lg bg-white border border-[#C5A059] outline-none text-sm"
                  />
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-township"
                  className="block text-xs font-semibold text-[#0C0D0E] mb-1.5"
                >
                  Township / မြို့နယ် ရွေးချယ်ရန် *
                </label>
                {formData.city === 'other' ? (
                  <input
                    id="reg-township"
                    type="text"
                    placeholder="မြို့နယ်အမည် အသစ် ရိုက်ထည့်ပါ..."
                    required
                    value={customTownship}
                    onChange={(e) => setCustomTownship(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white border border-[#C5A059] outline-none text-sm"
                  />
                ) : (
                  <>
                    <select
                      id="reg-township"
                      name="township"
                      required
                      value={formData.township}
                      onChange={handleChange}
                      disabled={!formData.city}
                      className="w-full px-4 py-3 rounded-lg bg-white border border-[#E6DFD3] focus:border-[#0C0D0E] outline-none text-sm cursor-pointer disabled:opacity-50"
                    >
                      <option value="">
                        {formData.city ? '-- မြို့နယ်ရွေးပါ --' : 'အရင်ဆုံး မြို့ကိုရွေးပါ'}
                      </option>
                      {townships.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      {formData.city && (
                        <option value="other">+ အခြား (မြို့နယ်အသစ်ထည့်မည်)</option>
                      )}
                    </select>
                    {formData.township === 'other' && (
                      <input
                        type="text"
                        aria-label="New Township Name"
                        placeholder="မြို့နယ်အမည် အသစ် ရိုက်ထည့်ပါ..."
                        required
                        value={customTownship}
                        onChange={(e) => setCustomTownship(e.target.value)}
                        className="w-full px-4 py-3 mt-3 rounded-lg bg-white border border-[#C5A059] outline-none text-sm"
                      />
                    )}
                  </>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="reg-address"
                  className="block text-xs font-semibold text-[#0C0D0E] mb-1.5"
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
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#E6DFD3] focus:border-[#0C0D0E] outline-none text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="reg-bio"
                  className="block text-xs font-semibold text-[#0C0D0E] mb-1.5"
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
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#E6DFD3] focus:border-[#0C0D0E] outline-none text-sm"
                />
              </div>
            </div>
          </section>

          {/* Section 03: Visual Portfolio Uploaders */}
          <section className="space-y-5">
            <div className="border-b border-[#E6DFD3] pb-3">
              <h2 className="font-serif text-2xl font-semibold text-[#0C0D0E]">
                03. Visual Portfolio & Verification Media
              </h2>
              <p className="text-xs text-[#6E675F] mt-0.5">
                Upload a minimum of 3 Public Portraits and 3 Private Verification Photos. Images are automatically optimized on-device.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Public Portraits Upload Box */}
              <div className="bg-[#FAF8F5] rounded-xl border border-[#E6DFD3] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0C0D0E]">
                      Public Directory Portraits
                    </h3>
                    <p className="text-xs text-[#6E675F]">
                      မျက်နှာနှင့် စတိုင်လ် သေချာမြင်ရသော အလှပုံ (အနည်းဆုံး ၃ ပုံ)
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#0C0D0E] tabular-nums">
                    {publicPhotos.length} / 3 Min
                  </span>
                </div>

                <label className="block border border-dashed border-[#C5A059] bg-white hover:bg-[#F5EFE6]/60 transition-colors rounded-lg p-6 text-center cursor-pointer">
                  <UploadCloud className="w-7 h-7 text-[#9E7B36] mx-auto mb-2" />
                  <span className="block text-xs font-semibold text-[#0C0D0E]">
                    {compressingType === 'public'
                      ? 'Optimizing Portraits...'
                      : 'Select Public Portraits (Multiple Allowed)'}
                  </span>
                  <span className="block text-[11px] text-[#787167] mt-1">
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
                        className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#141619] border border-[#E6DFD3] group"
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
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#0C0D0E]/80 text-[#FAF8F5] flex items-center justify-center hover:bg-rose-600 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Private Verification Photos Upload Box */}
              <div className="bg-[#FAF8F5] rounded-xl border border-[#E6DFD3] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0C0D0E] flex items-center gap-1.5">
                      <Lock size={13} className="text-[#9E7B36]" />
                      <span>Private Verification Gallery</span>
                    </h3>
                    <p className="text-xs text-[#6E675F]">
                      Admin နှင့် VIP Client ID များသာ ကြည့်ရှုနိုင်သော Private ပုံ (အနည်းဆုံး ၃ ပုံ)
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#0C0D0E] tabular-nums">
                    {privatePhotos.length} / 3 Min
                  </span>
                </div>

                <label className="block border border-dashed border-[#0C0D0E]/40 bg-white hover:bg-[#F5EFE6]/60 transition-colors rounded-lg p-6 text-center cursor-pointer">
                  <UploadCloud className="w-7 h-7 text-[#0C0D0E] mx-auto mb-2" />
                  <span className="block text-xs font-semibold text-[#0C0D0E]">
                    {compressingType === 'private'
                      ? 'Encrypting & Optimizing...'
                      : 'Select Private Verification Photos'}
                  </span>
                  <span className="block text-[11px] text-[#787167] mt-1">
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
                        className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#141619] border border-[#E6DFD3] group"
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
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#0C0D0E]/80 text-[#FAF8F5] flex items-center justify-center hover:bg-rose-600 transition-colors"
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
          <section className="bg-[#FAF8F5] rounded-xl border border-[#E6DFD3] p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0C0D0E] mb-1">
              <ShieldCheck size={16} className="text-[#9E7B36]" />
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
                className="mt-1 w-4 h-4 accent-[#0C0D0E] rounded"
              />
              <span className="text-xs sm:text-sm text-[#4A453E]">
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
                className="mt-1 w-4 h-4 accent-[#0C0D0E] rounded"
              />
              <span className="text-xs sm:text-sm text-[#4A453E]">
                Data Privacy & Confidentiality Policy အရ Public ပုံများကို Directory တွင် ပြသရန်နှင့် Private ပုံများကို VIP Client စိစစ်မှုတွင် အသုံးပြုရန် သဘောတူပါသည်။
              </span>
            </label>
          </section>

          {/* Inline Validation Banner (Replaces window.alert) */}
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
            className="w-full bg-[#0C0D0E] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0C0D0E] font-semibold py-4 px-6 rounded-xl transition-colors text-sm sm:text-base tracking-wide disabled:opacity-50"
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
