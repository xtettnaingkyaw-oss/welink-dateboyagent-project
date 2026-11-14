import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  where,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import {
  UserCheck,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Settings,
  Eye,
  Pencil,
  EyeOff,
  Save,
  X,
  CreditCard,
  FileText,
  KeyRound,
  Smartphone,
  MapPin,
  Ruler,
  Activity,
  Lock,
  Shield,
  LogOut,
  Ban,
  Unlock,
  Calendar,
  AlertCircle,
  ArrowLeft,
  UploadCloud,
  Send,
  Loader2,
  Search,
  ArrowUpDown,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import {
  FALLBACK_PORTRAITS,
  resolveMediaUrl,
  isLegacyExpiredProneTelegramMedia,
  formatCompanionDateBadge,
  computeAdminDateCounts,
  filterAndSortAdminCompanions,
  toLocalDateKey,
} from '../utils/catalogLogic';

const DateBoyCard = ({
  boy,
  isPending,
  editingBoyId,
  editBoyData,
  setEditBoyData,
  setEditingBoyId,
  saveEditedBoy,
  handleApprove,
  approvingBoyId,
  openRejectOrDeleteModal,
  handleToggleVisibility,
  startEditBoy,
  setModalImage,
  handleAdminPhotoUpload,
  isUploadingEditPhoto,
  requestTelegramMediaReupload,
  reuploadStatus,
}) => {
  const [brokenImgDetected, setBrokenImgDetected] = useState(false);

  const rawPubPhotos = Array.isArray(boy.publicPhotos)
    ? boy.publicPhotos
    : boy.publicPhoto
      ? [boy.publicPhoto]
      : [];
  const rawPubIds = Array.isArray(boy.publicFileIds) ? boy.publicFileIds : [];
  const pubCount = Math.max(rawPubPhotos.length, rawPubIds.length);
  const pPhotos = [];
  for (let i = 0; i < pubCount; i++) {
    const resolved = resolveMediaUrl(rawPubPhotos[i] || '', rawPubIds[i] || '', 'photo');
    if (resolved) pPhotos.push(resolved);
  }

  const rawPrivPhotos = Array.isArray(boy.privatePhotos)
    ? boy.privatePhotos
    : boy.privatePhotos
      ? [boy.privatePhotos]
      : [];
  const rawPrivIds = Array.isArray(boy.privateFileIds) ? boy.privateFileIds : [];
  const privCount = Math.max(rawPrivPhotos.length, rawPrivIds.length);
  const prPhotos = [];
  for (let i = 0; i < privCount; i++) {
    const resolved = resolveMediaUrl(rawPrivPhotos[i] || '', rawPrivIds[i] || '', 'photo');
    if (resolved) prPhotos.push(resolved);
  }

  const videoUrl = resolveMediaUrl(
    boy.privateVideo || '',
    boy.privateVideoFileId || '',
    'video'
  );

  const isEditing = editingBoyId === boy.id;
  const isApproving = approvingBoyId === boy.id;
  const boyCode = `WLDB-${boy.id.substring(0, 5).toUpperCase()}`;
  const hasLegacyLinks = isLegacyExpiredProneTelegramMedia(boy) || brokenImgDetected;
  const dateBadgeText = formatCompanionDateBadge(boy);
  const isTodaySubmission = dateBadgeText.startsWith('ယနေ့');
  const tgChatHref =
    boy.telegramProfileLink || (boy.telegramChatId ? `tg://user?id=${boy.telegramChatId}` : '');

  return (
    <div
      className={`bg-white border ${
        boy.status === 'hidden'
          ? 'border-[#D6CFC5] opacity-65'
          : isTodaySubmission && isPending
            ? 'border-emerald-500 ring-1 ring-emerald-500/20 shadow-sm'
            : isPending
              ? 'border-[#C5A059]'
              : 'border-[#E6DFD3]'
      } p-5 sm:p-6 rounded-xl flex flex-col justify-between relative transition-colors`}
    >
      {boy.status === 'hidden' && (
        <div className="absolute top-4 right-4 bg-[#0C0D0E] text-[#FAF8F5] text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1 z-10">
          <EyeOff size={12} />
          <span>Hidden</span>
        </div>
      )}

      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-3 mb-5 bg-[#FAF8F5] p-4 rounded-xl border border-[#E6DFD3]">
            <input
              type="text"
              value={editBoyData.name || ''}
              onChange={(e) => setEditBoyData({ ...editBoyData, name: e.target.value })}
              className="w-full p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E] font-semibold"
              placeholder="အမည်"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={editBoyData.age || ''}
                onChange={(e) => setEditBoyData({ ...editBoyData, age: e.target.value })}
                className="w-1/2 p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E] font-mono tabular-nums"
                placeholder="အသက်"
              />
              <input
                type="text"
                value={editBoyData.height || ''}
                onChange={(e) => setEditBoyData({ ...editBoyData, height: e.target.value })}
                className="w-1/2 p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E] font-mono"
                placeholder="အရပ်"
              />
            </div>
            <input
              type="text"
              value={editBoyData.cockSize || ''}
              onChange={(e) => setEditBoyData({ ...editBoyData, cockSize: e.target.value })}
              className="w-full p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E] font-mono"
              placeholder="Size (inches)"
            />
            <input
              type="text"
              value={editBoyData.phone || ''}
              onChange={(e) => setEditBoyData({ ...editBoyData, phone: e.target.value })}
              className="w-full p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E] font-mono tabular-nums"
              placeholder="ဖုန်း"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={editBoyData.city || ''}
                onChange={(e) => setEditBoyData({ ...editBoyData, city: e.target.value })}
                className="w-1/2 p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E]"
                placeholder="မြို့"
              />
              <input
                type="text"
                value={editBoyData.township || ''}
                onChange={(e) => setEditBoyData({ ...editBoyData, township: e.target.value })}
                className="w-1/2 p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E]"
                placeholder="မြို့နယ်"
              />
            </div>
            <input
              type="text"
              value={editBoyData.address || ''}
              onChange={(e) => setEditBoyData({ ...editBoyData, address: e.target.value })}
              className="w-full p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E]"
              placeholder="လိပ်စာ"
            />

            {/* Direct Public & Private Photo Replacement in Edit Mode */}
            <div className="pt-2 border-t border-[#E6DFD3] space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#0C0D0E] mb-1">
                  Public ပုံအသစ် လဲလှယ်ရန် ({(editBoyData.publicPhotos || []).length} ပုံ)
                </label>
                <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-white border border-dashed border-[#C5A059] rounded-lg text-xs font-semibold text-[#9E7B36] cursor-pointer hover:bg-[#F5EFE6] transition-colors">
                  <UploadCloud size={14} />
                  <span>
                    {isUploadingEditPhoto === 'public'
                      ? 'Compressing...'
                      : 'Public ပုံအသစ်များ ရွေးမည်'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAdminPhotoUpload(e, 'public')}
                  />
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#0C0D0E] mb-1">
                  Private ပုံအသစ် လဲလှယ်ရန် ({(editBoyData.privatePhotos || []).length} ပုံ)
                </label>
                <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-white border border-dashed border-[#C5A059] rounded-lg text-xs font-semibold text-[#9E7B36] cursor-pointer hover:bg-[#F5EFE6] transition-colors">
                  <UploadCloud size={14} />
                  <span>
                    {isUploadingEditPhoto === 'private'
                      ? 'Compressing...'
                      : 'Private ပုံအသစ်များ ရွေးမည်'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAdminPhotoUpload(e, 'private')}
                  />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                <p className="font-mono text-[11px] font-semibold text-[#9E7B36] tracking-wider tabular-nums">
                  {boyCode} {isPending ? '· PENDING' : '· APPROVED'}
                </p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold tabular-nums ${
                    isTodaySubmission
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-[#FAF8F5] text-[#6E675F] border border-[#E6DFD3]'
                  }`}
                >
                  <Clock size={10} className={isTodaySubmission ? 'text-emerald-600' : 'text-[#9E7B36]'} />
                  <span>{dateBadgeText}</span>
                </span>
              </div>
              <h4 className="font-serif text-2xl font-semibold text-[#0C0D0E] mt-0.5">
                {boy.name}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5C564E] mt-1.5 font-medium tabular-nums">
                <span className="text-[#0C0D0E] font-semibold">{boy.age} Yrs</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#0C0D0E] font-semibold">{boy.height}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#9E7B36] font-mono">Size: {boy.cockSize || 'N/A'}</span>
              </div>
            </div>

            {hasLegacyLinks && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-50/95 border border-amber-200/90 text-[11px] text-amber-950 space-y-2.5 shadow-sm">
                <p className="font-semibold leading-relaxed">
                  ⚠️ ယခင် Telegram (၁) နာရီသက်တမ်းကုန် Link အဟောင်း ဖြစ်နေပါသည်။ Edit နှိပ်၍ ပုံအသစ်တင်ပါ သို့မဟုတ် Date Boy ထံ ပုံပြန်တောင်းပါ။
                </p>
                <button
                  type="button"
                  disabled={reuploadStatus === 'sending'}
                  onClick={(e) => {
                    e.stopPropagation();
                    requestTelegramMediaReupload(boy);
                  }}
                  className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 select-none ${
                    reuploadStatus === 'sending'
                      ? 'bg-slate-900 text-amber-300 border border-amber-400/50 cursor-wait scale-[0.98] shadow-inner'
                      : reuploadStatus === 'sent'
                        ? 'bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white border border-emerald-500 shadow-md cursor-pointer'
                        : 'bg-gradient-to-r from-[#78350F] via-[#92400E] to-[#78350F] hover:from-[#92400E] hover:to-[#B45309] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 text-white shadow-sm cursor-pointer'
                  }`}
                >
                  {reuploadStatus === 'sending' ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-amber-400 shrink-0" />
                      <span>Telegram Bot သို့ ပေးပို့နေပါသည်...</span>
                    </>
                  ) : reuploadStatus === 'sent' ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-200 shrink-0" />
                      <span>ပို့ပြီးပါပြီ · ထပ်မံပို့ရန် နှိပ်ပါ</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} className="shrink-0" />
                      <span>Telegram မှ ပုံအသစ်ပြန်တောင်းမည်</span>
                    </>
                  )}
                </button>
                {reuploadStatus === 'sent' && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium leading-relaxed flex items-start gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Date Boy ထံသို့ ပုံပြန်တောင်းစာ ပို့ပြီးပါပြီ — Admin ၏ Telegram Bot တွင်လည်း Notification ပို့ထားပါသည်။
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#FAF8F5] p-3.5 rounded-lg text-xs mb-5 border border-[#E6DFD3] space-y-1.5">
              <p className="text-[#0C0D0E] font-medium flex items-center gap-2">
                <MapPin size={14} className="text-[#9E7B36] shrink-0" />
                <span>
                  {boy.township}, {boy.city}
                </span>
              </p>
              <p className="text-[#0C0D0E] font-mono tabular-nums flex items-center gap-2">
                <Smartphone size={14} className="text-[#6E675F] shrink-0" />
                <span>{boy.phone || '-'}</span>
              </p>
              <p
                className="text-[#787167] pt-1.5 border-t border-[#E6DFD3] truncate"
                title={boy.address}
              >
                {boy.address || 'No street address'}
              </p>
              {tgChatHref && (
                <div className="pt-2 border-t border-[#E6DFD3]">
                  <a
                    href={tgChatHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#0C0D0E] hover:bg-[#1E2126] text-[#FAF8F5] font-semibold text-[11px] transition-colors"
                  >
                    <MessageCircle size={13} className="text-amber-400 shrink-0" />
                    <span>Telegram Chat ဖြင့် တိုက်ရိုက်စကားပြောရန်</span>
                    <ExternalLink size={11} className="opacity-70 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </>
        )}

        <div className="mb-5 space-y-4">
          <div>
            <span className="font-mono text-[11px] font-semibold text-[#6E675F] block mb-2 tabular-nums">
              PUBLIC PORTRAITS ({pPhotos.length})
            </span>
            <div className="grid grid-cols-3 gap-2">
              {pPhotos.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setModalImage(img)}
                  aria-label={`Inspect public photo ${idx + 1} of ${boy.name}`}
                  className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden bg-[#141619] border border-[#E6DFD3]"
                >
                  <img
                    src={img}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      setBrokenImgDetected(true);
                      e.currentTarget.src = FALLBACK_PORTRAITS[idx % FALLBACK_PORTRAITS.length];
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-[#0C0D0E]/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <Eye size={15} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="font-mono text-[11px] font-semibold text-[#9E7B36] block mb-2 tabular-nums">
              PRIVATE VERIFICATION ({prPhotos.length})
            </span>
            <div className="grid grid-cols-3 gap-2">
              {prPhotos.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setModalImage(img)}
                  aria-label={`Inspect private photo ${idx + 1} of ${boy.name}`}
                  className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden bg-[#141619] border border-[#E6DFD3]"
                >
                  <img
                    src={img}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      setBrokenImgDetected(true);
                      e.currentTarget.src = FALLBACK_PORTRAITS[idx % FALLBACK_PORTRAITS.length];
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-[#0C0D0E]/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <Eye size={15} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {videoUrl && (
          <div className="mb-5">
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs bg-[#F5EFE6] text-[#0C0D0E] px-3.5 py-2 rounded-lg font-semibold border border-[#E6DFD3] hover:bg-[#E6DFD3] transition-colors"
            >
              <Eye size={14} />
              <span>Inspect Verification Video</span>
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-[#EFECE6]">
        {isEditing ? (
          <div className="w-full flex gap-2">
            <button
              type="button"
              onClick={() => saveEditedBoy(boy.id)}
              className="flex-1 bg-[#0C0D0E] text-[#FAF8F5] py-2.5 rounded-lg font-semibold text-xs flex justify-center items-center gap-1.5 hover:bg-[#1E2126] transition-colors"
            >
              <Save size={14} />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={() => setEditingBoyId(null)}
              className="px-4 bg-[#FAF8F5] text-[#5C564E] py-2.5 rounded-lg font-semibold text-xs border border-[#E6DFD3] hover:text-[#0C0D0E] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : isPending ? (
          <>
            <button
              type="button"
              disabled={isApproving}
              onClick={() => handleApprove(boy.id)}
              className="flex-1 bg-[#0C0D0E] text-[#FAF8F5] py-2.5 rounded-lg font-semibold hover:bg-[#C5A059] hover:text-[#0C0D0E] active:scale-95 disabled:opacity-60 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isApproving ? (
                <>
                  <Loader2 size={13} className="animate-spin text-amber-400" />
                  <span>Approving...</span>
                </>
              ) : (
                <span>Approve</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => startEditBoy(boy)}
              aria-label={`Edit ${boy.name}`}
              className="px-3 bg-[#FAF8F5] text-[#0C0D0E] py-2.5 rounded-lg font-semibold hover:bg-[#F5EFE6] border border-[#E6DFD3] text-xs flex justify-center items-center gap-1 transition-colors"
            >
              <Pencil size={13} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => openRejectOrDeleteModal(boy)}
              className="px-3 bg-rose-50 text-rose-700 py-2.5 rounded-lg font-semibold hover:bg-rose-100 active:scale-95 transition-all text-xs border border-rose-200 cursor-pointer"
            >
              Reject
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => startEditBoy(boy)}
              className="flex-1 bg-[#FAF8F5] text-[#0C0D0E] py-2.5 rounded-lg font-semibold hover:bg-[#F5EFE6] border border-[#E6DFD3] text-xs flex justify-center items-center gap-1.5 transition-colors"
            >
              <Pencil size={13} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleVisibility(boy)}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-xs flex justify-center items-center gap-1.5 transition-colors border ${
                boy.status === 'hidden'
                  ? 'bg-[#F5EFE6] text-[#9E7B36] border-[#C5A059]'
                  : 'bg-[#FAF8F5] text-[#5C564E] border-[#E6DFD3] hover:text-[#0C0D0E]'
              }`}
            >
              {boy.status === 'hidden' ? (
                <>
                  <Eye size={13} />
                  <span>Unhide</span>
                </>
              ) : (
                <>
                  <EyeOff size={13} />
                  <span>Hide</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => openRejectOrDeleteModal(boy)}
              aria-label={`Delete ${boy.name}`}
              className="p-2.5 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default function Admin() {
  const [loggedInAdmin, setLoggedInAdmin] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // In-App Notification Banner (Replaces window.alert)
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // In-App Rejection / Deletion Modal (Replaces window.prompt & window.confirm)
  const [rejectTargetBoy, setRejectTargetBoy] = useState(null);
  const [rejectReasonPreset, setRejectReasonPreset] = useState('1');
  const [customRejectReason, setCustomRejectReason] = useState('');

  const [adminUsers, setAdminUsers] = useState([]);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('sub_admin');
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPass, setEditAdminPass] = useState('');
  const [editAdminRole, setEditAdminRole] = useState('sub_admin');

  const [activeTab, setActiveTab] = useState('requests');
  const [boys, setBoys] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [clientIds, setClientIds] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);

  const [newCity, setNewCity] = useState('');
  const [newTownship, setNewTownship] = useState('');
  const [modalImage, setModalImage] = useState(null);
  const [editingLocId, setEditingLocId] = useState(null);
  const [editCity, setEditCity] = useState('');
  const [editTownship, setEditTownship] = useState('');
  const [editingBoyId, setEditingBoyId] = useState(null);
  const [editBoyData, setEditBoyData] = useState({});
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState('');
  const [reuploadStatusByBoyId, setReuploadStatusByBoyId] = useState({});
  const [approvingBoyId, setApprovingBoyId] = useState(null);
  const [isRejectingBoy, setIsRejectingBoy] = useState(false);

  // Date & Search Filtering State for Pending & Approved Dossiers
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'custom'
  const [customDate, setCustomDate] = useState(() => toLocalDateKey(Date.now()));
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSortOrder, setAdminSortOrder] = useState('newest'); // 'newest' | 'oldest'

  const [appConfig, setAppConfig] = useState({
    paymentInfo: '',
    privFee: 0,
    feeSec: 0,
    feeDay: 0,
    feeNight: 0,
    clientIdFee: 0,
    reqText: '',
    ruleText: '',
  });
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [draftRules, setDraftRules] = useState({ reqText: '', ruleText: '' });
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [draftPricing, setDraftPricing] = useState({
    paymentInfo: '',
    privFee: 0,
    feeSec: 0,
    feeDay: 0,
    feeNight: 0,
    clientIdFee: 0,
  });

  useEffect(() => {
    try {
      const savedAdmin = localStorage.getItem('weLinkAdmin');
      if (savedAdmin) setLoggedInAdmin(JSON.parse(savedAdmin));
    } catch (e) {
      console.error(e);
    }

    const initDefaultAdmin = async () => {
      try {
        const snap = await getDocs(collection(db, 'admin_users'));
        if (snap.empty) {
          await addDoc(collection(db, 'admin_users'), {
            username: 'admin',
            password: 'adminpassword',
            role: 'super_admin',
            createdAt: serverTimestamp(),
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    initDefaultAdmin();

    const unsubAdmins = onSnapshot(query(collection(db, 'admin_users')), (snap) =>
      setAdminUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubBoys = onSnapshot(query(collection(db, 'dateboys')), (snap) =>
      setBoys(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubBookings = onSnapshot(query(collection(db, 'bookings')), (snap) =>
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubLocs = onSnapshot(query(collection(db, 'locations')), (snap) =>
      setLocations(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubClients = onSnapshot(query(collection(db, 'client_ids')), (snap) =>
      setClientIds(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubBanned = onSnapshot(
      query(collection(db, 'telegram_states'), where('banned', '==', true)),
      (snap) => {
        setBannedUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubConfig = onSnapshot(doc(db, 'settings', 'app_config'), (docSnap) => {
      if (docSnap.exists()) setAppConfig((prev) => ({ ...prev, ...docSnap.data() }));
    });

    return () => {
      unsubAdmins();
      unsubBoys();
      unsubBookings();
      unsubLocs();
      unsubClients();
      unsubBanned();
      unsubConfig();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const q = query(
        collection(db, 'admin_users'),
        where('username', '==', loginUser.trim()),
        where('password', '==', loginPass.trim())
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const adminData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setLoggedInAdmin(adminData);
        localStorage.setItem('weLinkAdmin', JSON.stringify(adminData));
      } else {
        setLoginError('Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။');
      }
    } catch (err) {
      setLoginError('ချိတ်ဆက်မှု ပြဿနာဖြစ်ပွားနေပါသည်။');
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    setLoggedInAdmin(null);
    localStorage.removeItem('weLinkAdmin');
    setLoginUser('');
    setLoginPass('');
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    const exists = adminUsers.find((a) => a.username === newAdminName.trim());
    if (exists) {
      showToast('ဤ Username အား အသုံးပြုပြီးဖြစ်ပါသည်။', 'error');
      return;
    }
    await addDoc(collection(db, 'admin_users'), {
      username: newAdminName.trim(),
      password: newAdminPass.trim(),
      role: newAdminRole,
      createdAt: serverTimestamp(),
    });
    setNewAdminName('');
    setNewAdminPass('');
    setNewAdminRole('sub_admin');
    showToast('Admin အကောင့်အသစ် ဖန်တီးပြီးပါပြီ။', 'success');
  };

  const handleDeleteAdmin = async (id) => {
    await deleteDoc(doc(db, 'admin_users', id));
    showToast('Admin အကောင့်ကို ပယ်ဖျက်ပြီးပါပြီ။', 'info');
  };

  const startEditAdmin = (admin) => {
    setEditingAdminId(admin.id);
    setEditAdminName(admin.username);
    setEditAdminPass(admin.password);
    setEditAdminRole(admin.role);
  };

  const saveEditAdmin = async (id) => {
    const exists = adminUsers.find((a) => a.username === editAdminName.trim() && a.id !== id);
    if (exists) {
      showToast('ဤ Username အား အသုံးပြုပြီးဖြစ်ပါသည်။', 'error');
      return;
    }
    await updateDoc(doc(db, 'admin_users', id), {
      username: editAdminName.trim(),
      password: editAdminPass.trim(),
      role: editAdminRole,
    });
    setEditingAdminId(null);
    showToast('Admin အချက်အလက် ပြင်ဆင်ပြီးပါပြီ။', 'success');
  };

  const pendingBoys = boys.filter((boy) => boy.status === 'pending');
  const approvedBoys = boys.filter(
    (boy) => boy.status === 'approved' || boy.status === 'hidden'
  );
  const pendingDateCounts = computeAdminDateCounts(pendingBoys);
  const approvedDateCounts = computeAdminDateCounts(approvedBoys);

  const filteredPendingBoys = filterAndSortAdminCompanions(pendingBoys, {
    dateFilter,
    customDate,
    searchQuery: adminSearchQuery,
    sortOrder: adminSortOrder,
  });

  const filteredApprovedBoys = filterAndSortAdminCompanions(approvedBoys, {
    dateFilter,
    customDate,
    searchQuery: adminSearchQuery,
    sortOrder: adminSortOrder,
  });

  const pendingLocations = locations.filter((loc) => loc.status === 'pending');
  const approvedLocations = locations.filter((loc) => loc.status !== 'pending');

  const uniqueCities = [...new Set(approvedLocations.map((l) => l.city).filter(Boolean))];
  const uniqueTownships = [...new Set(approvedLocations.map((l) => l.township).filter(Boolean))];

  const handleApprove = async (id) => {
    const boy = boys.find((b) => b.id === id);
    const boyCode = `WLDB-${id.substring(0, 5).toUpperCase()}`;
    setApprovingBoyId(id);
    try {
      await updateDoc(doc(db, 'dateboys', id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
      });

      const approveMsg = `🎉 ကျေးဇူးတင်ပါတယ်။ သတ်မှတ်အရည်အချင်းများနှင့် ပြည့်စုံကိုက်ညီသောကြောင့် သင့်အား WE LINK ၏ Date Boy စာရင်းထဲသို့ ပေါင်းထည့်ပေးလိုက်ပါပြီ။\n\n📌 သင့်၏ Date Boy ID မှာ: <code>${boyCode}</code> ဖြစ်ပါသည်။ Privacy အရ သင်၏ အမည်အရင်းကို ဧည့်သည်အားပြသမည်မဟုတ်သောကြောင့် ယခု ID အား သေချာစွာမှတ်သားထားပေးပါ။\n\nမန္တလေးမြို့တွင်းဆိုရင် ချက်ချင်း(သို့မဟုတ်) (၁)ရက် (၂) ရက်အတွင်းရရှိနိုင်ပြီး အခြားမြို့များကဆိုရင် အနည်းဆုံး (၁)ပတ်ကနေ ဧည့်သည်အခြေအနေပေါ်မူတည်ပြီး စောင့်ရနိုင်ပါသည်။`;

      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_action: 'web_admin_approve_boy',
          boyId: id,
          chatId: boy?.telegramChatId || null,
          telegramProfileLink: boy?.telegramProfileLink || '',
          boyName: boy?.name || '',
          boyAge: boy?.age || '',
          boyHeight: boy?.height || '',
          boyCockSize: boy?.cockSize || '',
          boyPhone: boy?.phone || '',
          boyCity: boy?.city || '',
          boyTownship: boy?.township || '',
          adminUsername: loggedInAdmin?.username || 'Web Admin',
          text: approveMsg,
        }),
      }).catch((e) => console.error(e));

      showToast(
        `✅ ${boy?.name || boyCode} (${boyCode}) အား အတည်ပြုပြီး Date Boy နှင့် Admin Telegram Bot သို့ အကြောင်းကြားစာ ပေးပို့ပြီးပါပြီ။`,
        'success'
      );
    } finally {
      setApprovingBoyId(null);
    }
  };

  const openRejectOrDeleteModal = (boy) => {
    setRejectTargetBoy(boy);
    setRejectReasonPreset('1');
    setCustomRejectReason('');
  };

  const confirmRejectOrDeleteBoy = async () => {
    if (!rejectTargetBoy || isRejectingBoy) return;
    const boy = rejectTargetBoy;
    const boyCode = `WLDB-${String(boy.id || '').substring(0, 5).toUpperCase()}`;
    const wasPending = boy.status === 'pending';

    let reasonLabel = 'သတ်မှတ်အရည်အချင်းများနှင့် မကိုက်ညီခြင်း';
    let reasonMsg =
      '❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို အောက်ပါအကြောင်းရင်းကြောင့် ပယ်ချလိုက်ပါသည် -\n\n';
    if (rejectReasonPreset === '1') {
      reasonLabel = 'သတ်မှတ်အရည်အချင်းများနှင့် မကိုက်ညီခြင်း';
      reasonMsg += '👉 <b>သတ်မှတ်အရည်အချင်းများနှင့် မကိုက်ညီခြင်း</b>';
    } else if (rejectReasonPreset === '2') {
      reasonLabel = 'ပေးပို့ထားသော ပုံ/Video များ အဆင်မပြေခြင်း';
      reasonMsg +=
        '👉 <b>ပေးပို့ထားသောပုံများ နှင့် Video အဆင်မပြေခြင်း</b>\n(ကျေးဇူးပြု၍ ပုံများနှင့် Video ကို အသစ်ပြန်လည်စီစဉ်ပြီး အစကနေ ပြန်တင်ပေးပါ ခင်ဗျာ)';
    } else if (rejectReasonPreset === '3') {
      reasonLabel = 'ရုပ်ရည်နှင့် ခန္ဓာကိုယ်အချိုးအစား မကိုက်ညီခြင်း';
      reasonMsg +=
        '👉 <b>ရုပ်ရည်နှင့် ခန္ဓာကိုယ်အချိုးအစား လုပ်ငန်းလိုအပ်ချက်နှင့် အဆင်မပြေခြင်း</b>';
    } else if (rejectReasonPreset === '4' && customRejectReason.trim()) {
      reasonLabel = customRejectReason.trim();
      reasonMsg += `👉 <b>${customRejectReason.trim()}</b>`;
    } else {
      reasonLabel = 'ရိုးရိုးပယ်ချခြင်း';
      reasonMsg = '❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို ပယ်ချလိုက်ပါသည်။';
    }

    setIsRejectingBoy(true);
    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_action: 'web_admin_reject_boy',
          boyId: boy.id,
          chatId: boy.telegramChatId || null,
          telegramProfileLink: boy.telegramProfileLink || '',
          boyName: boy.name || '',
          boyPhone: boy.phone || '',
          boyCity: boy.city || '',
          boyTownship: boy.township || '',
          wasPending,
          reasonLabel,
          text: reasonMsg,
          adminUsername: loggedInAdmin?.username || 'Web Admin',
        }),
      }).catch((e) => console.error(e));

      await deleteDoc(doc(db, 'dateboys', boy.id));
      setRejectTargetBoy(null);
      showToast(
        `❌ ${boy.name} (${boyCode}) အား ပယ်ဖျက်ပြီး Date Boy နှင့် Admin Telegram Bot သို့ အကြောင်းကြားစာ ပေးပို့ပြီးပါပြီ။`,
        'info'
      );
    } finally {
      setIsRejectingBoy(false);
    }
  };

  const handleUnbanUser = async (chatId) => {
    await updateDoc(doc(db, 'telegram_states', chatId), {
      banned: false,
      rejectCount: 0,
    });
    showToast('စာပို့ခွင့်နှင့် လျှောက်ထားခွင့် ပြန်လည်ဖွင့်ပေးလိုက်ပါပြီ။', 'success');
  };

  const handleDeleteClientId = async (id) => {
    await deleteDoc(doc(db, 'client_ids', id));
    showToast('Client ID ကို ပယ်ဖျက်ပြီးပါပြီ။', 'info');
  };

  const handleUpdateBookingStatus = async (id, status) => {
    await updateDoc(doc(db, 'bookings', id), { status });
    showToast(`Reservation status updated to ${status.toUpperCase()}.`, 'success');
  };

  const handleDeleteBooking = async (id) => {
    await deleteDoc(doc(db, 'bookings', id));
    showToast('Reservation record removed.', 'info');
  };

  const handleToggleVisibility = async (boy) =>
    updateDoc(doc(db, 'dateboys', boy.id), {
      status: boy.status === 'hidden' ? 'approved' : 'hidden',
    });

  const startEditBoy = (boy) => {
    setEditingBoyId(boy.id);
    setEditBoyData({
      name: boy.name,
      age: boy.age,
      height: boy.height,
      cockSize: boy.cockSize || '',
      phone: boy.phone,
      city: boy.city,
      township: boy.township,
      address: boy.address,
      publicPhotos: Array.isArray(boy.publicPhotos)
        ? boy.publicPhotos
        : boy.publicPhoto
          ? [boy.publicPhoto]
          : [],
      privatePhotos: Array.isArray(boy.privatePhotos) ? boy.privatePhotos : [],
    });
  };

  const handleAdminPhotoUpload = async (e, photoType) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingEditPhoto(photoType);
    const compressedList = [];
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
        compressedList.push(base64);
      } catch (err) {
        console.error('Admin photo compression error:', err);
      }
    }
    if (compressedList.length > 0) {
      if (photoType === 'public') {
        setEditBoyData((prev) => ({
          ...prev,
          publicPhotos: compressedList,
          publicPhoto: compressedList[0] || '',
          publicFileIds: [],
        }));
      } else {
        setEditBoyData((prev) => ({
          ...prev,
          privatePhotos: compressedList,
          privateFileIds: [],
        }));
      }
      showToast(
        `${photoType === 'public' ? 'Public' : 'Private'} ပုံ (${compressedList.length}) ပုံ ရွေးချယ်ပြီးပါပြီ။ Save နှိပ်၍ သိမ်းဆည်းပါ။`,
        'info'
      );
    }
    setIsUploadingEditPhoto('');
    e.target.value = '';
  };

  const requestTelegramMediaReupload = async (boy) => {
    if (!boy) return;
    const boyCode = `WLDB-${String(boy.id || '').substring(0, 5).toUpperCase()}`;
    const resolvedChatId =
      boy.telegramChatId ||
      (typeof boy.telegramProfileLink === 'string'
        ? boy.telegramProfileLink.match(/id=(\d+)/)?.[1]
        : null);

    setReuploadStatusByBoyId((prev) => ({ ...prev, [boy.id]: 'sending' }));

    try {
      if (resolvedChatId) {
        await setDoc(
          doc(db, 'telegram_states', String(resolvedChatId)),
          {
            step: 'REUPLOAD_PUBLIC_PHOTOS',
            data: { targetBoyId: boy.id, publicPhotos: [], publicFileIds: [] },
          },
          { merge: true }
        );
      }

      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_action: 'request_media_reupload',
          boyId: boy.id,
          chatId: resolvedChatId,
          telegramProfileLink: boy.telegramProfileLink || '',
          boyName: boy.name,
          boyPhone: boy.phone,
          boyCity: boy.city,
          boyTownship: boy.township,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Webhook request failed');
      }

      setReuploadStatusByBoyId((prev) => ({ ...prev, [boy.id]: 'sent' }));
      showToast(
        `✅ ${boy.name} (${boyCode}) ထံသို့ ပုံအသစ်ပြန်တောင်းစာ ပို့ပြီးပါပြီ! Telegram Bot တွင်လည်း အသိပေးချက် ပို့ထားပါသည်။`,
        'success'
      );
    } catch (err) {
      console.error('Reupload request error:', err);
      setReuploadStatusByBoyId((prev) => ({ ...prev, [boy.id]: 'sent' }));
      showToast(
        `🔔 ${boy.name} (${boyCode}) အတွက် ပုံအသစ်ပြန်တင်ရန် အချက်အလက် သတ်မှတ်ပြီးပါပြီ။`,
        'info'
      );
    }
  };

  const saveEditedBoy = async (id) => {
    await updateDoc(doc(db, 'dateboys', id), editBoyData);
    setEditingBoyId(null);
    showToast('Companion dossier & media updated.', 'success');
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newCity || !newTownship) return;
    await addDoc(collection(db, 'locations'), {
      city: newCity.trim(),
      township: newTownship.trim(),
      status: 'approved',
    });
    setNewTownship('');
    setNewCity('');
    showToast('မြို့နယ်အသစ် ထည့်သွင်းပြီးပါပြီ။', 'success');
  };

  const startEditLocation = (loc) => {
    setEditingLocId(loc.id);
    setEditCity(loc.city);
    setEditTownship(loc.township);
  };

  const saveEditedLocation = async (loc) => {
    await updateDoc(doc(db, 'locations', loc.id), {
      city: editCity.trim(),
      township: editTownship.trim(),
      status: 'approved',
    });
    const qBoys = query(
      collection(db, 'dateboys'),
      where('city', '==', loc.city),
      where('township', '==', loc.township)
    );
    const snap = await getDocs(qBoys);
    snap.forEach(async (d) => {
      await updateDoc(doc(db, 'dateboys', d.id), {
        city: editCity.trim(),
        township: editTownship.trim(),
      });
    });
    setEditingLocId(null);
    showToast('Location updated.', 'success');
  };

  const handleApproveLocation = async (id) => {
    await updateDoc(doc(db, 'locations', id), { status: 'approved' });
    showToast('Location approved.', 'success');
  };

  const handleDeleteLocation = async (id) => {
    await deleteDoc(doc(db, 'locations', id));
    showToast('Location removed.', 'info');
  };

  const startEditRules = () => {
    setDraftRules({ reqText: appConfig.reqText, ruleText: appConfig.ruleText });
    setIsEditingRules(true);
  };

  const startEditPricing = () => {
    setDraftPricing({
      paymentInfo: appConfig.paymentInfo,
      clientIdFee: appConfig.clientIdFee,
      privFee: appConfig.privFee,
      feeSec: appConfig.feeSec,
      feeDay: appConfig.feeDay,
      feeNight: appConfig.feeNight,
    });
    setIsEditingPricing(true);
  };

  const handleSaveRules = async () => {
    setIsConfigSaving(true);
    await setDoc(doc(db, 'settings', 'app_config'), draftRules, { merge: true });
    setIsConfigSaving(false);
    setIsEditingRules(false);
    showToast('Requirements & Rules saved.', 'success');
  };

  const handleSavePricing = async () => {
    setIsConfigSaving(true);
    await setDoc(doc(db, 'settings', 'app_config'), draftPricing, { merge: true });
    setIsConfigSaving(false);
    setIsEditingPricing(false);
    showToast('Pricing & Fees updated.', 'success');
  };

  if (!loggedInAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#062E22] flex items-center justify-center p-4">
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl w-full max-w-md border border-slate-800 overflow-hidden shadow-2xl">
          <div className="h-1.5 w-full welink-spectrum-bar" />
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center mb-8 text-center">
              <img
                src="/assets/aistudio/IMG-261ce20021d63ca3c8be56a8803e3540-V_86eb9421.jpg"
                alt="WE LINK Logo"
                className="w-20 h-20 object-contain rounded-2xl bg-white p-1.5 mb-4 shadow-lg"
              />
              <p className="font-mono text-xs tracking-[0.2em] text-amber-400 font-semibold">
                WE LINK · ALL OF YOU
              </p>
              <h1 className="font-serif text-3xl font-medium text-white mt-1">
                Admin Portal Sign In
              </h1>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-username"
                  className="text-xs font-semibold text-slate-300 mb-1.5 block"
                >
                  Executive Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-amber-400 transition-colors"
                  placeholder="Username..."
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="admin-password"
                  className="text-xs font-semibold text-slate-300 mb-1.5 block"
                >
                  Security Passkey
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-amber-400 transition-colors"
                  placeholder="Password..."
                  required
                />
              </div>
              {loginError && (
                <p
                  role="alert"
                  className="text-rose-400 text-xs font-medium text-center bg-rose-950/50 p-3 rounded-xl border border-rose-800/60"
                >
                  {loginError}
                </p>
              )}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full welink-brand-gradient hover:opacity-95 text-slate-950 py-3.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-opacity flex items-center justify-center gap-2 mt-2 shadow-md"
              >
                {isLoggingIn ? 'Verifying Credentials...' : 'Sign In to Executive Console'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Return to Public Companion Directory</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const TabButton = ({ tab, icon: Icon, label, count }) => {
    const isActive = activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 ${
          isActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
        }`}
      >
        <Icon size={15} className={isActive ? 'text-amber-400' : 'text-slate-500'} />
        <span>{label}</span>
        {count > 0 && (
          <span
            className={`ml-1 px-2 py-0.5 rounded font-mono text-[11px] font-semibold tabular-nums ${
              isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-900'
            }`}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="h-1.5 w-full welink-spectrum-bar" />
      {/* Executive Sub-Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/IMG-261ce20021d63ca3c8be56a8803e3540-V_86eb9421.jpg"
              alt="WE LINK Logo"
              className="w-12 h-12 object-contain rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm"
            />
            <div>
              <h1 className="font-serif text-2xl font-semibold text-slate-900">
                WE LINK Executive Concierge Console
              </h1>
              <p className="font-mono text-xs text-slate-500 tabular-nums">
                Operator: {loggedInAdmin.username} · Role:{' '}
                {loggedInAdmin.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FAF8F5] hover:bg-rose-50 text-[#0C0D0E] hover:text-rose-700 rounded-lg text-xs font-semibold transition-colors border border-[#E6DFD3]"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Viewport Toast Banner (Always visible regardless of scroll position) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100%-2rem)] shadow-2xl rounded-2xl overflow-hidden">
          <div className="h-1.5 w-full welink-spectrum-bar" />
          <div
            role="status"
            className={`flex items-center justify-between px-4 py-3.5 border text-xs sm:text-sm font-semibold ${
              toast.type === 'error'
                ? 'bg-rose-950 border-rose-700 text-rose-100'
                : toast.type === 'success'
                  ? 'bg-slate-950 border-emerald-500/60 text-white'
                  : 'bg-[#0C0D0E] border-[#262420] text-[#FAF8F5]'
            }`}
          >
            <div className="flex items-center gap-2.5 pr-2">
              {toast.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-amber-400 shrink-0" />
              )}
              <span className="leading-relaxed">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 mt-6 sm:mt-8 space-y-8">
        {/* Segmented Workspace Navigation Bar */}
        <div className="bg-[#EFECE6] p-1.5 rounded-xl flex gap-1 overflow-x-auto hide-scrollbar border border-[#E6DFD3]">
          <TabButton
            tab="requests"
            icon={Clock}
            label="Pending Applications"
            count={pendingBoys.length}
          />
          <TabButton
            tab="dateboys"
            icon={UserCheck}
            label="Approved Roster"
            count={approvedBoys.length}
          />
          <TabButton
            tab="bookings"
            icon={Calendar}
            label="Web Reservations"
            count={bookings.length}
          />
          <TabButton
            tab="clients"
            icon={KeyRound}
            label="Client IDs"
            count={clientIds.length}
          />
          <TabButton
            tab="banned"
            icon={Ban}
            label="Restricted Users"
            count={bannedUsers.length}
          />
          <TabButton tab="settings" icon={Settings} label="Agency Settings" count={0} />
          {loggedInAdmin.role === 'super_admin' && (
            <TabButton
              tab="admins"
              icon={Shield}
              label="Admin Operators"
              count={adminUsers.length}
            />
          )}
        </div>

        {/* Workspace Tab Content */}
        <div>
          {(activeTab === 'requests' || activeTab === 'dateboys') && (
            <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-[#E6DFD3] shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Date Preset Segmented Buttons: All, Today, Yesterday, Custom Date */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#5C564E] mr-1 flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#9E7B36]" />
                    <span>ရက်စွဲအလိုက်စစ်ရန်:</span>
                  </span>

                  {[
                    {
                      id: 'all',
                      label: 'အားလုံး (All)',
                      count:
                        activeTab === 'requests'
                          ? pendingDateCounts.all
                          : approvedDateCounts.all,
                    },
                    {
                      id: 'today',
                      label: 'ယနေ့ (Today)',
                      count:
                        activeTab === 'requests'
                          ? pendingDateCounts.today
                          : approvedDateCounts.today,
                    },
                    {
                      id: 'yesterday',
                      label: 'မနေ့က (Yesterday)',
                      count:
                        activeTab === 'requests'
                          ? pendingDateCounts.yesterday
                          : approvedDateCounts.yesterday,
                    },
                    {
                      id: 'custom',
                      label: 'ရက်စွဲရွေးရန် (Custom Date)',
                      count: null,
                    },
                  ].map((tabItem) => {
                    const isSelected = dateFilter === tabItem.id;
                    return (
                      <button
                        key={tabItem.id}
                        type="button"
                        onClick={() => setDateFilter(tabItem.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0C0D0E] text-[#FAF8F5] shadow-sm'
                            : 'bg-[#FAF8F5] text-[#5C564E] hover:text-[#0C0D0E] border border-[#E6DFD3]'
                        }`}
                      >
                        <span>{tabItem.label}</span>
                        {tabItem.count !== null && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] tabular-nums ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 font-bold'
                                : 'bg-[#E6DFD3]/70 text-[#0C0D0E]'
                            }`}
                          >
                            {tabItem.count}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {dateFilter === 'custom' && (
                    <div className="flex items-center gap-2 bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#C5A059]">
                      <input
                        type="date"
                        aria-label="Custom filter date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="bg-transparent text-xs font-mono font-semibold text-[#0C0D0E] outline-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Search Input & Newest/Oldest Sort Toggle */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1 sm:w-72">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#787167]"
                    />
                    <input
                      type="text"
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      placeholder="အမည်, WLDB-Code, ဖုန်း, မြို့နယ် ရှာရန်..."
                      className="w-full pl-9 pr-8 py-2 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl text-xs text-[#0C0D0E] outline-none focus:border-[#0C0D0E] focus:bg-white transition-colors"
                    />
                    {adminSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAdminSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#787167] hover:text-[#0C0D0E]"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAdminSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
                    }
                    className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F5EFE6] border border-[#E6DFD3] text-xs font-semibold text-[#0C0D0E] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <ArrowUpDown size={13} className="text-[#9E7B36]" />
                    <span>
                      {adminSortOrder === 'newest'
                        ? 'အသစ်ဆုံး အရင်ပြထားသည် (Newest)'
                        : 'အဟောင်းဆုံး အရင်ပြထားသည် (Oldest)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C0D0E] tabular-nums">
                  စောင့်ဆိုင်းနေသော လျှောက်လွှာများ ({filteredPendingBoys.length}
                  {dateFilter !== 'all' || adminSearchQuery ? ` / ${pendingBoys.length}` : ''})
                </h2>
                {(dateFilter !== 'all' || adminSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter('all');
                      setAdminSearchQuery('');
                    }}
                    className="text-xs font-semibold text-[#9E7B36] hover:underline cursor-pointer"
                  >
                    Filter ပြန်ဖြုတ်မည် (Show All {pendingBoys.length})
                  </button>
                )}
              </div>

              {filteredPendingBoys.length === 0 ? (
                <div className="bg-white p-12 sm:p-16 text-center rounded-xl border border-[#E6DFD3] space-y-3">
                  <div className="w-12 h-12 bg-[#FAF8F5] rounded-lg flex items-center justify-center mx-auto text-[#9E7B36] border border-[#E6DFD3]">
                    <Clock size={22} />
                  </div>
                  <p className="text-sm font-semibold text-[#0C0D0E]">
                    {dateFilter === 'today'
                      ? 'ယနေ့ (Today) အသစ်လျှောက်ထားသော Pending Date Boy မရှိသေးပါ။'
                      : dateFilter === 'yesterday'
                        ? 'မနေ့က (Yesterday) လျှောက်ထားသော Pending Date Boy မရှိပါ။'
                        : dateFilter === 'custom'
                          ? `ရွေးချယ်ထားသော ရက်စွဲ (${customDate}) တွင် လျှောက်ထားသူ မရှိပါ။`
                          : adminSearchQuery
                            ? `"${adminSearchQuery}" နှင့် ကိုက်ညီသော လျှောက်လွှာ မတွေ့ရှိပါ။`
                            : 'လောလောဆယ် အသစ်လျှောက်ထားသူ မရှိသေးပါ ခင်ဗျာ။'}
                  </p>
                  {pendingBoys.length > 0 && (dateFilter !== 'all' || adminSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('all');
                        setAdminSearchQuery('');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0C0D0E] text-[#FAF8F5] text-xs font-semibold hover:bg-[#1E2126] transition-colors cursor-pointer"
                    >
                      <span>Pending အားလုံး ({pendingBoys.length} ဦး) ပြန်ကြည့်မည်</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredPendingBoys.map((boy) => (
                    <DateBoyCard
                      key={boy.id}
                      boy={boy}
                      isPending={true}
                      editingBoyId={editingBoyId}
                      editBoyData={editBoyData}
                      setEditBoyData={setEditBoyData}
                      setEditingBoyId={setEditingBoyId}
                      saveEditedBoy={saveEditedBoy}
                      handleApprove={handleApprove}
                      approvingBoyId={approvingBoyId}
                      openRejectOrDeleteModal={openRejectOrDeleteModal}
                      handleToggleVisibility={handleToggleVisibility}
                      startEditBoy={startEditBoy}
                      setModalImage={setModalImage}
                      handleAdminPhotoUpload={handleAdminPhotoUpload}
                      isUploadingEditPhoto={isUploadingEditPhoto}
                      requestTelegramMediaReupload={requestTelegramMediaReupload}
                      reuploadStatus={
                        reuploadStatusByBoyId[boy.id] ||
                        (boy.reuploadRequestedAt ? 'sent' : 'idle')
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dateboys' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C0D0E] tabular-nums">
                  လက်ရှိ Date Boys အားလုံး ({filteredApprovedBoys.length}
                  {dateFilter !== 'all' || adminSearchQuery ? ` / ${approvedBoys.length}` : ''})
                </h2>
                {(dateFilter !== 'all' || adminSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter('all');
                      setAdminSearchQuery('');
                    }}
                    className="text-xs font-semibold text-[#9E7B36] hover:underline cursor-pointer"
                  >
                    Filter ပြန်ဖြုတ်မည် (Show All {approvedBoys.length})
                  </button>
                )}
              </div>

              {filteredApprovedBoys.length === 0 ? (
                <div className="bg-white p-12 sm:p-16 text-center rounded-xl border border-[#E6DFD3] space-y-3">
                  <div className="w-12 h-12 bg-[#FAF8F5] rounded-lg flex items-center justify-center mx-auto text-[#9E7B36] border border-[#E6DFD3]">
                    <UserCheck size={22} />
                  </div>
                  <p className="text-sm font-semibold text-[#0C0D0E]">
                    {dateFilter !== 'all' || adminSearchQuery
                      ? 'ရွေးချယ်ထားသော ရက်စွဲ သို့မဟုတ် ရှာဖွေမှုနှင့် ကိုက်ညီသော Date Boy မရှိပါ။'
                      : 'စနစ်ထဲတွင် အတည်ပြုထားသော Date Boy မရှိသေးပါ။'}
                  </p>
                  {approvedBoys.length > 0 && (dateFilter !== 'all' || adminSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('all');
                        setAdminSearchQuery('');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0C0D0E] text-[#FAF8F5] text-xs font-semibold hover:bg-[#1E2126] transition-colors cursor-pointer"
                    >
                      <span>Approved အားလုံး ({approvedBoys.length} ဦး) ပြန်ကြည့်မည်</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredApprovedBoys.map((boy) => (
                    <DateBoyCard
                      key={boy.id}
                      boy={boy}
                      isPending={false}
                      editingBoyId={editingBoyId}
                      editBoyData={editBoyData}
                      setEditBoyData={setEditBoyData}
                      setEditingBoyId={setEditingBoyId}
                      saveEditedBoy={saveEditedBoy}
                      handleApprove={handleApprove}
                      approvingBoyId={approvingBoyId}
                      openRejectOrDeleteModal={openRejectOrDeleteModal}
                      handleToggleVisibility={handleToggleVisibility}
                      startEditBoy={startEditBoy}
                      setModalImage={setModalImage}
                      handleAdminPhotoUpload={handleAdminPhotoUpload}
                      isUploadingEditPhoto={isUploadingEditPhoto}
                      requestTelegramMediaReupload={requestTelegramMediaReupload}
                      reuploadStatus={
                        reuploadStatusByBoyId[boy.id] ||
                        (boy.reuploadRequestedAt ? 'sent' : 'idle')
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C0D0E] tabular-nums">
                Web Concierge Reservations ({bookings.length})
              </h2>
              {bookings.length === 0 ? (
                <div className="bg-white p-12 sm:p-16 text-center rounded-xl border border-[#E6DFD3]">
                  <div className="w-12 h-12 bg-[#FAF8F5] rounded-lg flex items-center justify-center mx-auto mb-3 text-[#9E7B36] border border-[#E6DFD3]">
                    <Calendar size={22} />
                  </div>
                  <p className="text-sm font-semibold text-[#0C0D0E]">
                    Website မှတစ်ဆင့် တောင်းဆိုထားသော Reservation မရှိသေးပါ။
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="bg-white border border-[#E6DFD3] p-6 rounded-xl flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2.5">
                          <span className="font-mono text-xs font-semibold text-[#9E7B36] tabular-nums">
                            {bk.bookingRef || 'WL-BOOKING'}
                          </span>
                          <span className="font-mono text-[11px] font-semibold uppercase text-[#0C0D0E]">
                            {bk.status || 'pending'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-[#787167] block">Companion</span>
                          <h4 className="font-serif text-xl font-semibold text-[#0C0D0E]">
                            {bk.dateBoyName || 'Companion'}
                          </h4>
                          <p className="text-xs text-[#5C564E]">
                            {bk.dateBoyTownship}, {bk.dateBoyCity}
                          </p>
                        </div>
                        <div className="bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E6DFD3] text-xs space-y-1.5 tabular-nums">
                          <p>
                            <span className="text-[#787167]">Client:</span>{' '}
                            <strong className="text-[#0C0D0E]">{bk.clientName}</strong>
                          </p>
                          <p>
                            <span className="text-[#787167]">Contact:</span>{' '}
                            <strong className="font-mono text-[#0C0D0E]">{bk.clientContact}</strong>
                          </p>
                          <p>
                            <span className="text-[#787167]">Schedule:</span>{' '}
                            <strong className="font-mono text-[#0C0D0E]">
                              {bk.preferredDate} · {bk.preferredTime}
                            </strong>
                          </p>
                          <p>
                            <span className="text-[#787167]">Package:</span>{' '}
                            <span className="text-[#0C0D0E]">{bk.duration}</span>
                          </p>
                          {bk.notes && (
                            <p className="text-[#5C564E] pt-1 border-t border-[#E6DFD3]">
                              {bk.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        {bk.status !== 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateBookingStatus(bk.id, 'confirmed')}
                            className="flex-1 bg-[#0C0D0E] text-[#FAF8F5] py-2.5 rounded-lg text-xs font-semibold hover:bg-[#C5A059] hover:text-[#0C0D0E] transition-colors"
                          >
                            Mark Confirmed
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBooking(bk.id)}
                          aria-label={`Delete reservation ${bk.bookingRef}`}
                          className="p-2.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C0D0E]">
                ထုတ်ပေးထားသော Client IDs များ
              </h2>
              {clientIds.length === 0 ? (
                <div className="bg-white p-12 sm:p-16 text-center rounded-xl border border-[#E6DFD3]">
                  <div className="w-12 h-12 bg-[#FAF8F5] rounded-lg flex items-center justify-center mx-auto mb-3 text-[#9E7B36] border border-[#E6DFD3]">
                    <KeyRound size={22} />
                  </div>
                  <p className="text-sm font-semibold text-[#0C0D0E]">
                    လောလောဆယ် ထုတ်ပေးထားသော Client ID မရှိသေးပါ။
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {clientIds.map((client) => (
                    <div
                      key={client.id}
                      className="bg-white border border-[#E6DFD3] p-6 rounded-xl flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-mono text-[11px] font-semibold text-[#9E7B36] block mb-2">
                          ACTIVE VIP CLIENT PASS
                        </span>
                        <h4 className="font-mono font-semibold text-xl text-[#0C0D0E] bg-[#FAF8F5] py-3 px-4 rounded-lg border border-[#E6DFD3] text-center mb-4 tracking-wider tabular-nums">
                          {client.clientId}
                        </h4>
                        <a
                          href={`tg://user?id=${client.telegramChatId}`}
                          className="text-xs flex items-center justify-center gap-2 bg-[#F5EFE6] text-[#0C0D0E] py-2.5 rounded-lg font-semibold hover:bg-[#E6DFD3] transition-colors"
                        >
                          Telegram Profile သို့သွားရန်
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteClientId(client.id)}
                        className="w-full mt-3 bg-white border border-rose-200 text-rose-700 py-2.5 rounded-lg font-semibold hover:bg-rose-50 text-xs flex justify-center items-center gap-2 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span>Revoke Pass</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'banned' && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C0D0E]">
                ပယ်ချခံရသည့် (Restricted) စာရင်းများ
              </h2>
              {bannedUsers.length === 0 ? (
                <div className="bg-white p-12 sm:p-16 text-center rounded-xl border border-[#E6DFD3]">
                  <div className="w-12 h-12 bg-[#FAF8F5] rounded-lg flex items-center justify-center mx-auto mb-3 text-[#787167] border border-[#E6DFD3]">
                    <Ban size={22} />
                  </div>
                  <p className="text-sm font-semibold text-[#0C0D0E]">
                    လောလောဆယ် လျှောက်ထားခွင့် ပိတ်ခံရသူ မရှိသေးပါ။
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {bannedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="bg-white border border-[#E6DFD3] p-6 rounded-xl flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-mono text-[11px] font-semibold text-rose-700 block mb-2">
                          RESTRICTED APPLICANT
                        </span>
                        <h4 className="font-mono font-semibold text-sm text-[#0C0D0E] bg-[#FAF8F5] py-3 px-4 rounded-lg border border-[#E6DFD3] text-center mb-3 break-all tabular-nums">
                          ID: {user.id}
                        </h4>
                        <div className="bg-rose-50 text-rose-700 text-xs font-semibold text-center py-2 rounded-lg mb-3 border border-rose-200 tabular-nums">
                          ပယ်ချခံရမှု ({user.rejectCount}) ကြိမ်
                        </div>
                        {user.telegramProfileLink && (
                          <a
                            href={user.telegramProfileLink}
                            className="text-xs flex items-center justify-center gap-2 bg-[#FAF8F5] text-[#0C0D0E] py-2.5 rounded-lg font-semibold border border-[#E6DFD3] hover:bg-[#F5EFE6] transition-colors"
                          >
                            Telegram Profile
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnbanUser(user.id)}
                        className="w-full mt-3 bg-[#0C0D0E] text-[#FAF8F5] py-2.5 rounded-lg font-semibold hover:bg-[#C5A059] hover:text-[#0C0D0E] text-xs flex justify-center items-center gap-2 transition-colors"
                      >
                        <Unlock size={14} />
                        <span>Restore Access (Unban)</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admins' && loggedInAdmin.role === 'super_admin' && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C0D0E]">
                Admin အကောင့်များ စီမံခန့်ခွဲခြင်း
              </h2>

              <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E6DFD3]">
                <h3 className="font-semibold text-sm text-[#0C0D0E] mb-4 flex items-center gap-2">
                  <Plus size={16} className="text-[#9E7B36]" />
                  <span>Create New Executive Operator</span>
                </h3>
                <form
                  onSubmit={handleAddAdmin}
                  className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end"
                >
                  <div>
                    <label className="text-xs text-[#6E675F] font-semibold mb-1.5 block">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6E675F] font-semibold mb-1.5 block">
                      Password
                    </label>
                    <input
                      type="text"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E] font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6E675F] font-semibold mb-1.5 block">
                      Clearance Role
                    </label>
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value)}
                      className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E] cursor-pointer"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="sub_admin">Sub Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#0C0D0E] text-[#FAF8F5] py-3 rounded-lg font-semibold text-sm hover:bg-[#C5A059] hover:text-[#0C0D0E] transition-colors"
                  >
                    Create Operator
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {adminUsers.map((admin) => (
                  <div
                    key={admin.id}
                    className="bg-white p-6 rounded-xl border border-[#E6DFD3] flex flex-col justify-between"
                  >
                    {editingAdminId === admin.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editAdminName}
                          onChange={(e) => setEditAdminName(e.target.value)}
                          className="w-full p-2.5 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-sm"
                          placeholder="Username"
                        />
                        <input
                          type="text"
                          value={editAdminPass}
                          onChange={(e) => setEditAdminPass(e.target.value)}
                          className="w-full p-2.5 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-sm font-mono"
                          placeholder="Password"
                        />
                        <select
                          value={editAdminRole}
                          onChange={(e) => setEditAdminRole(e.target.value)}
                          className="w-full p-2.5 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-sm"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="sub_admin">Sub Admin</option>
                        </select>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => saveEditAdmin(admin.id)}
                            className="flex-1 bg-[#0C0D0E] text-[#FAF8F5] py-2 rounded-lg text-xs font-semibold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAdminId(null)}
                            className="px-4 bg-[#FAF8F5] text-[#5C564E] rounded-lg text-xs font-semibold border border-[#E6DFD3]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4">
                          <span className="font-mono text-[11px] font-semibold text-[#9E7B36] block">
                            {admin.role === 'super_admin' ? 'SUPER ADMIN' : 'SUB ADMIN'}
                          </span>
                          <h4 className="font-serif text-2xl font-semibold text-[#0C0D0E] mt-0.5">
                            {admin.username}
                          </h4>
                          <p className="text-xs text-[#787167] font-mono mt-1">
                            Passkey: {admin.password}
                          </p>
                        </div>

                        <div className="flex gap-2 mt-auto pt-4 border-t border-[#EFECE6]">
                          <button
                            type="button"
                            onClick={() => startEditAdmin(admin)}
                            className="flex-1 bg-[#FAF8F5] hover:bg-[#F5EFE6] text-[#0C0D0E] py-2 rounded-lg text-xs font-semibold border border-[#E6DFD3] transition-colors"
                          >
                            Edit
                          </button>
                          {admin.id !== loggedInAdmin.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(admin.id)}
                              aria-label={`Delete admin ${admin.username}`}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3.5 rounded-lg border border-rose-200 transition-colors flex items-center justify-center"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-8">
                {/* Requirements & Rules */}
                <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E6DFD3]">
                  <div className="flex justify-between items-center mb-6 border-b border-[#EFECE6] pb-4">
                    <h3 className="font-serif text-2xl font-semibold text-[#0C0D0E] flex items-center gap-2.5">
                      <FileText size={18} className="text-[#9E7B36]" />
                      <span>လျှောက်ထားသူများအတွက် စည်းကမ်းချက်များ</span>
                    </h3>
                    {!isEditingRules && (
                      <button
                        type="button"
                        onClick={startEditRules}
                        className="flex items-center gap-1.5 bg-[#FAF8F5] hover:bg-[#F5EFE6] text-[#0C0D0E] px-4 py-2 rounded-lg text-xs font-semibold border border-[#E6DFD3] transition-colors"
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {isEditingRules ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#0C0D0E] mb-2">
                          လိုအပ်သည့်အချက်များ (Requirements)
                        </label>
                        <textarea
                          rows={4}
                          value={draftRules.reqText}
                          onChange={(e) =>
                            setDraftRules({ ...draftRules, reqText: e.target.value })
                          }
                          className="w-full p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E] leading-relaxed"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#0C0D0E] mb-2">
                          စည်းမျဉ်းစည်းကမ်းများ (Rules)
                        </label>
                        <textarea
                          rows={4}
                          value={draftRules.ruleText}
                          onChange={(e) =>
                            setDraftRules({ ...draftRules, ruleText: e.target.value })
                          }
                          className="w-full p-4 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E] leading-relaxed"
                          required
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleSaveRules}
                          disabled={isConfigSaving}
                          className="flex-1 bg-[#0C0D0E] text-[#FAF8F5] py-3 rounded-lg text-xs font-semibold hover:bg-[#1E2126] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {isConfigSaving ? (
                            'Saving...'
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingRules(false)}
                          className="px-6 bg-[#FAF8F5] text-[#5C564E] rounded-lg text-xs font-semibold border border-[#E6DFD3]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <span className="text-xs font-semibold text-[#6E675F] block mb-2">
                          လိုအပ်သည့်အချက်များ
                        </span>
                        <div className="text-xs sm:text-sm bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3] whitespace-pre-wrap text-[#0C0D0E] leading-relaxed">
                          {appConfig.reqText || '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[#6E675F] block mb-2">
                          စည်းမျဉ်းစည်းကမ်းများ
                        </span>
                        <div className="text-xs sm:text-sm bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3] whitespace-pre-wrap text-[#0C0D0E] leading-relaxed">
                          {appConfig.ruleText || '-'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing & Fees */}
                <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E6DFD3]">
                  <div className="flex justify-between items-center mb-6 border-b border-[#EFECE6] pb-4">
                    <h3 className="font-serif text-2xl font-semibold text-[#0C0D0E] flex items-center gap-2.5">
                      <CreditCard size={18} className="text-[#9E7B36]" />
                      <span>ငွေပေးချေမှုနှင့် ဈေးနှုန်းများ (Pricing & Fees)</span>
                    </h3>
                    {!isEditingPricing && (
                      <button
                        type="button"
                        onClick={startEditPricing}
                        className="flex items-center gap-1.5 bg-[#FAF8F5] hover:bg-[#F5EFE6] text-[#0C0D0E] px-4 py-2 rounded-lg text-xs font-semibold border border-[#E6DFD3] transition-colors"
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {isEditingPricing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#0C0D0E] mb-2">
                          Payment Account Info (ငွေလွှဲရန် အချက်အလက်)
                        </label>
                        <input
                          type="text"
                          value={draftPricing.paymentInfo}
                          onChange={(e) =>
                            setDraftPricing({ ...draftPricing, paymentInfo: e.target.value })
                          }
                          className="w-full p-3.5 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-sm outline-none focus:border-[#0C0D0E]"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <label className="block text-xs font-semibold text-[#6E675F] mb-1.5">
                            Client ID ဝယ်ယူခ (Ks)
                          </label>
                          <input
                            type="number"
                            value={draftPricing.clientIdFee}
                            onChange={(e) =>
                              setDraftPricing({
                                ...draftPricing,
                                clientIdFee: Number(e.target.value),
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm font-mono tabular-nums outline-none"
                            required
                          />
                        </div>
                        <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <label className="block text-xs font-semibold text-[#6E675F] mb-1.5">
                            Private Photo Fee (Ks)
                          </label>
                          <input
                            type="number"
                            value={draftPricing.privFee}
                            onChange={(e) =>
                              setDraftPricing({
                                ...draftPricing,
                                privFee: Number(e.target.value),
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm font-mono tabular-nums outline-none"
                            required
                          />
                        </div>
                        <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <label className="block text-xs font-semibold text-[#6E675F] mb-1.5">
                            Dating Fee — Section (Ks)
                          </label>
                          <input
                            type="number"
                            value={draftPricing.feeSec}
                            onChange={(e) =>
                              setDraftPricing({
                                ...draftPricing,
                                feeSec: Number(e.target.value),
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm font-mono tabular-nums outline-none"
                            required
                          />
                        </div>
                        <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <label className="block text-xs font-semibold text-[#6E675F] mb-1.5">
                            Dating Fee — Day (Ks)
                          </label>
                          <input
                            type="number"
                            value={draftPricing.feeDay}
                            onChange={(e) =>
                              setDraftPricing({
                                ...draftPricing,
                                feeDay: Number(e.target.value),
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm font-mono tabular-nums outline-none"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2 bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <label className="block text-xs font-semibold text-[#6E675F] mb-1.5">
                            Dating Fee — Night (Ks)
                          </label>
                          <input
                            type="number"
                            value={draftPricing.feeNight}
                            onChange={(e) =>
                              setDraftPricing({
                                ...draftPricing,
                                feeNight: Number(e.target.value),
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#E6DFD3] rounded-lg text-sm font-mono tabular-nums outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleSavePricing}
                          disabled={isConfigSaving}
                          className="flex-1 bg-[#0C0D0E] text-[#FAF8F5] py-3 rounded-lg text-xs font-semibold hover:bg-[#1E2126] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {isConfigSaving ? (
                            'Saving...'
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Save Pricing</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingPricing(false)}
                          className="px-6 bg-[#FAF8F5] text-[#5C564E] rounded-lg text-xs font-semibold border border-[#E6DFD3]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-[#F5EFE6] p-4 rounded-lg border border-[#E6DFD3] flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#9E7B36]">
                          Payment Account
                        </span>
                        <span className="text-sm font-mono font-semibold text-[#0C0D0E]">
                          {appConfig.paymentInfo || '-'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <span className="text-xs text-[#6E675F] block mb-1">Client ID Fee</span>
                          <span className="text-base font-mono font-semibold text-[#0C0D0E] tabular-nums">
                            {Number(appConfig.clientIdFee || 0).toLocaleString()} Ks
                          </span>
                        </div>
                        <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <span className="text-xs text-[#6E675F] block mb-1">
                            Private Photo Fee
                          </span>
                          <span className="text-base font-mono font-semibold text-[#0C0D0E] tabular-nums">
                            {Number(appConfig.privFee || 0).toLocaleString()} Ks
                          </span>
                        </div>
                        <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <span className="text-xs text-[#6E675F] block mb-1">Section Fee</span>
                          <span className="text-base font-mono font-semibold text-[#0C0D0E] tabular-nums">
                            {Number(appConfig.feeSec || 0).toLocaleString()} Ks
                          </span>
                        </div>
                        <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <span className="text-xs text-[#6E675F] block mb-1">Day Fee</span>
                          <span className="text-base font-mono font-semibold text-[#0C0D0E] tabular-nums">
                            {Number(appConfig.feeDay || 0).toLocaleString()} Ks
                          </span>
                        </div>
                        <div className="col-span-2 bg-[#FAF8F5] p-4 rounded-lg border border-[#E6DFD3]">
                          <span className="text-xs text-[#6E675F] block mb-1">Night Fee</span>
                          <span className="text-base font-mono font-semibold text-[#0C0D0E] tabular-nums">
                            {Number(appConfig.feeNight || 0).toLocaleString()} Ks
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Locations Management Column */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-[#E6DFD3]">
                  <h3 className="font-serif text-xl font-semibold text-[#0C0D0E] flex items-center gap-2 mb-4">
                    <MapPin size={17} className="text-[#9E7B36]" />
                    <span>မြို့နယ် အသစ်ထည့်ရန်</span>
                  </h3>
                  <form onSubmit={handleAddLocation} className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        placeholder="မြို့ (ဥပမာ — ရန်ကုန်)"
                        className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-xs outline-none focus:bg-white focus:border-[#0C0D0E]"
                        required
                      />
                      {uniqueCities.length > 0 && (
                        <select
                          aria-label="Quick select city"
                          onChange={(e) => {
                            if (e.target.value) setNewCity(e.target.value);
                            e.target.value = '';
                          }}
                          className="p-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-xs outline-none cursor-pointer w-28 text-[#0C0D0E] font-medium"
                        >
                          <option value="">Select</option>
                          {uniqueCities.map((c, i) => (
                            <option key={`nc-${i}`} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTownship}
                        onChange={(e) => setNewTownship(e.target.value)}
                        placeholder="မြို့နယ် (ဥပမာ — ဗဟန်း)"
                        className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-xs outline-none focus:bg-white focus:border-[#0C0D0E]"
                        required
                      />
                      {uniqueTownships.length > 0 && (
                        <select
                          aria-label="Quick select township"
                          onChange={(e) => {
                            if (e.target.value) setNewTownship(e.target.value);
                            e.target.value = '';
                          }}
                          className="p-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-xs outline-none cursor-pointer w-28 text-[#0C0D0E] font-medium"
                        >
                          <option value="">Select</option>
                          {uniqueTownships.map((t, i) => (
                            <option key={`nt-${i}`} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#0C0D0E] text-[#FAF8F5] py-3 rounded-lg text-xs font-semibold hover:bg-[#C5A059] hover:text-[#0C0D0E] transition-colors flex justify-center items-center gap-1.5"
                    >
                      <Plus size={15} />
                      <span>Add Jurisdiction</span>
                    </button>
                  </form>
                </div>

                {pendingLocations.length > 0 && (
                  <div className="bg-[#F5EFE6] p-6 rounded-xl border border-[#C5A059]">
                    <h3 className="text-xs font-semibold text-[#9E7B36] mb-4 flex items-center gap-2">
                      <Clock size={14} />
                      <span>အတည်ပြုရန် မြို့နယ်များ ({pendingLocations.length})</span>
                    </h3>
                    <div className="space-y-2.5">
                      {pendingLocations.map((loc) => (
                        <div
                          key={loc.id}
                          className="bg-white p-3.5 rounded-lg border border-[#E6DFD3]"
                        >
                          {editingLocId === loc.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editCity}
                                onChange={(e) => setEditCity(e.target.value)}
                                className="w-full p-2 bg-[#FAF8F5] border border-[#E6DFD3] rounded text-xs"
                                placeholder="City"
                              />
                              <input
                                type="text"
                                value={editTownship}
                                onChange={(e) => setEditTownship(e.target.value)}
                                className="w-full p-2 bg-[#FAF8F5] border border-[#E6DFD3] rounded text-xs"
                                placeholder="Township"
                              />
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => saveEditedLocation(loc)}
                                  className="flex-1 bg-[#0C0D0E] text-[#FAF8F5] py-1.5 rounded text-xs font-semibold"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingLocId(null)}
                                  className="px-3 bg-[#FAF8F5] text-[#5C564E] rounded text-xs font-semibold border border-[#E6DFD3]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-semibold text-[#0C0D0E] text-xs block">
                                  {loc.township}
                                </span>
                                <span className="text-[11px] text-[#787167]">{loc.city}</span>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditLocation(loc)}
                                  aria-label={`Edit ${loc.township}`}
                                  className="bg-[#FAF8F5] text-[#0C0D0E] p-2 rounded border border-[#E6DFD3]"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveLocation(loc.id)}
                                  aria-label={`Approve ${loc.township}`}
                                  className="bg-[#0C0D0E] text-[#C5A059] p-2 rounded"
                                >
                                  <CheckCircle2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLocation(loc.id)}
                                  aria-label={`Delete ${loc.township}`}
                                  className="bg-rose-50 text-rose-700 p-2 rounded border border-rose-200"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white p-6 rounded-xl border border-[#E6DFD3] max-h-[450px] overflow-y-auto hide-scrollbar">
                  <h3 className="font-mono text-xs font-semibold text-[#6E675F] mb-4 tabular-nums">
                    ACTIVE JURISDICTIONS ({approvedLocations.length})
                  </h3>
                  <div className="space-y-2">
                    {approvedLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex justify-between items-center bg-[#FAF8F5] px-4 py-3 rounded-lg border border-[#E6DFD3]"
                      >
                        {editingLocId === loc.id ? (
                          <div className="space-y-2 w-full">
                            <input
                              type="text"
                              value={editCity}
                              onChange={(e) => setEditCity(e.target.value)}
                              className="w-full p-2 bg-white border border-[#E6DFD3] rounded text-xs"
                              placeholder="City"
                            />
                            <input
                              type="text"
                              value={editTownship}
                              onChange={(e) => setEditTownship(e.target.value)}
                              className="w-full p-2 bg-white border border-[#E6DFD3] rounded text-xs"
                              placeholder="Township"
                            />
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => saveEditedLocation(loc)}
                                className="flex-1 bg-[#0C0D0E] text-[#FAF8F5] py-1.5 rounded text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLocId(null)}
                                className="px-3 bg-white text-[#5C564E] rounded text-xs font-semibold border border-[#E6DFD3]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="font-semibold text-[#0C0D0E] text-xs block">
                                {loc.township}
                              </span>
                              <span className="text-[11px] text-[#787167]">{loc.city}</span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditLocation(loc)}
                                aria-label={`Edit ${loc.township}`}
                                className="bg-white text-[#0C0D0E] p-2 rounded border border-[#E6DFD3] hover:bg-[#F5EFE6]"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLocation(loc.id)}
                                aria-label={`Delete ${loc.township}`}
                                className="bg-white text-rose-700 p-2 rounded border border-rose-200 hover:bg-rose-50"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* In-App Rejection & Removal Modal (Replaces window.prompt) */}
      {rejectTargetBoy && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setRejectTargetBoy(null)}
          className="fixed inset-0 bg-[#0C0D0E]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-md w-full rounded-2xl border border-[#E6DFD3] p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#EFECE6] pb-3">
              <h3 className="font-serif text-2xl font-semibold text-[#0C0D0E]">
                {rejectTargetBoy.status === 'pending'
                  ? 'Reject Companion Dossier'
                  : 'Remove Companion Record'}
              </h3>
              <button
                type="button"
                onClick={() => setRejectTargetBoy(null)}
                className="p-1 text-[#787167] hover:text-[#0C0D0E]"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#5C564E]">
              <strong>{rejectTargetBoy.name}</strong> အား ပယ်ဖျက်ရန် အကြောင်းရင်းကို ရွေးချယ်ပါ —
            </p>

            <div className="space-y-2 text-xs">
              {[
                { id: '1', label: '၁။ သတ်မှတ်အရည်အချင်းများနှင့် မကိုက်ညီခြင်း' },
                { id: '2', label: '၂။ ပေးပို့ထားသော ပုံ / Video များ အဆင်မပြေခြင်း' },
                { id: '3', label: '၃။ ရုပ်ရည် / ခန္ဓာကိုယ်အချိုးအစား မကိုက်ညီခြင်း' },
                { id: '4', label: '၄။ အခြား အကြောင်းရင်း (Custom Reason)' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                    rejectReasonPreset === opt.id
                      ? 'bg-[#F5EFE6] border-[#C5A059] text-[#0C0D0E] font-semibold'
                      : 'bg-[#FAF8F5] border-[#E6DFD3] text-[#5C564E]'
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={opt.id}
                    checked={rejectReasonPreset === opt.id}
                    onChange={(e) => setRejectReasonPreset(e.target.value)}
                    className="accent-[#0C0D0E]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            {rejectReasonPreset === '4' && (
              <input
                type="text"
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                placeholder="ပယ်ချရသည့် အကြောင်းရင်းကို ရိုက်ထည့်ပါ..."
                className="w-full p-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-lg text-xs outline-none focus:border-[#0C0D0E]"
              />
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectTargetBoy(null)}
                className="flex-1 py-2.5 rounded-lg bg-[#FAF8F5] border border-[#E6DFD3] text-xs font-semibold text-[#0C0D0E]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejectingBoy}
                onClick={confirmRejectOrDeleteBoy}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isRejectingBoy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Notifying Bot...</span>
                  </>
                ) : (
                  <span>Confirm Removal</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Image Modal */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 bg-[#0C0D0E]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-[#141619] p-3 rounded-2xl border border-[#262420]"
          >
            <div className="absolute top-5 right-5 z-10">
              <button
                type="button"
                onClick={() => setModalImage(null)}
                aria-label="Close image preview"
                className="bg-[#0C0D0E]/80 hover:bg-[#0C0D0E] text-[#FAF8F5] p-2.5 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={modalImage}
              alt="Portfolio inspection"
              className="w-full max-h-[82vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
