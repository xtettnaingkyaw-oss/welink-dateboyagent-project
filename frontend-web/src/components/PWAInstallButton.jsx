import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(iosDevice);

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        aria-label="Install WE LINK App to Home Screen"
        className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/90 border border-slate-200/90 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download size={14} className="text-amber-600 shrink-0" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">App</span>
      </button>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-900">
            <div className="h-1.5 w-full welink-spectrum-bar" />
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src="/apple-touch-icon.png"
                    alt="WE LINK Home Screen Icon"
                    className="w-14 h-14 rounded-2xl border border-slate-200 shadow-sm object-contain bg-white p-1 shrink-0"
                  />
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.2em] text-amber-600 font-bold">
                      WE LINK · WEB APP
                    </p>
                    <h3
                      id="pwa-install-title"
                      className="font-serif text-xl font-bold text-slate-900"
                    >
                      Add to Home Screen
                    </h3>
                    <p className="text-xs text-slate-500">
                      ဖုန်း Home Screen ပေါ်တွင် App အဖြစ် တင်ထားရန်
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  aria-label="Close install instructions"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs sm:text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="leading-relaxed">
                    {isIOS ? (
                      <>
                        Safari အောက်ခြေရှိ{' '}
                        <strong className="inline-flex items-center gap-1 text-slate-900 font-semibold">
                          <Share size={13} className="text-sky-600" /> Share
                        </strong>{' '}
                        ခလုတ်ကို နှိပ်ပါ။
                      </>
                    ) : (
                      <>
                        Browser ညာဘက်အပေါ်ထောင့်ရှိ Menu (⋮) သို့မဟုတ်{' '}
                        <strong className="text-slate-900 font-semibold">Share</strong> ခလုတ်ကို နှိပ်ပါ။
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="leading-relaxed">
                    အောက်သို့ဆွဲချပြီး{' '}
                    <strong className="inline-flex items-center gap-1 text-slate-900 font-semibold">
                      <PlusSquare size={13} className="text-emerald-600" /> Add to Home Screen
                    </strong>{' '}
                    (သို့မဟုတ် Install App) ကို နှိပ်ပါ။
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="leading-relaxed">
                    ညာဘက်အပေါ်ရှိ <strong className="text-slate-900 font-semibold">Add</strong> ကို နှိပ်လိုက်ပါက{' '}
                    <strong className="text-slate-900 font-semibold">WE LINK Logo</strong> ဖြင့် Home Screen ပေါ်တွင် တန်းပေါ်လာပါမည်။
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-lg px-3 py-2">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                <span>
                  180×180 Apple Touch Icon နှင့် 512×512 Web App Manifest Icon များ ထည့်သွင်းပြီးဖြစ်ပါသည်။
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                နားလည်ပါပြီ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
