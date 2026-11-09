import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { UserPlus, Search, HeartHandshake, ShieldCheck, Lock, Sparkles, Clock } from 'lucide-react';
import Home from './pages/Home';
import Register from './pages/Register';
import Admin from './pages/Admin';

// စာမျက်နှာပြောင်းတိုင်း အပေါ်ဆုံးသို့ အလိုအလျောက် ပြန်တက်ပေးမည့် Component
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

function Navigation() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Client များနှင့် အများပြည်သူမြင်ရမည့် Navigation (Admin ခလုတ် လုံးဝမပါပါ)
  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-2xl border-b border-slate-200/70 shadow-[0_2px_20px_-4px_rgba(15,23,42,0.05)] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          
          {/* Brand Logo & International Agency Tagline */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative p-2.5 bg-gradient-to-tr from-amber-500 via-yellow-400 to-emerald-500 rounded-2xl group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 shadow-md shadow-amber-500/20">
              <HeartHandshake className="text-white w-6 h-6 md:w-7 md:h-7 drop-shadow-sm" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-amber-500 via-yellow-500 to-emerald-600 text-transparent bg-clip-text tracking-tight leading-none">
                  WE LINK
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <ShieldCheck size={11} className="text-emerald-600" />
                  Verified
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
                Premier Companion Agency
              </span>
            </div>
          </Link>

          {/* Client & Register Buttons Only (Pill Switcher Style) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-300 font-bold text-xs sm:text-sm ${
                isActive('/')
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Search size={16} className={isActive('/') ? 'text-amber-400' : 'text-slate-500'} />
              <span>Find Date Boy</span>
            </Link>

            <Link
              to="/register"
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-300 font-bold text-xs sm:text-sm ${
                isActive('/register')
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <UserPlus size={16} className={isActive('/register') ? 'text-white' : 'text-emerald-600'} />
              <span>Join as Date Boy</span>
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}

function Footer() {
  const location = useLocation();
  // Admin စာမျက်နှာတွင် အလုပ်လုပ်ရလွယ်ကူစေရန် Footer ကို ဖျောက်ထားပါသည်
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-white border-t border-slate-200/80 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* Trust & Discretion Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-slate-100">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-700 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">100% Verified Companions</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Every profile is personally screened and verified by WE LINK management for authenticity and quality.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-700 shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Strict Privacy & Discretion</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Client and companion identities, booking details, and private requests are handled with absolute confidentiality.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div className="p-2.5 rounded-xl bg-blue-100/80 text-blue-700 shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Fast Concierge Booking</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Seamless real-time booking confirmation and dedicated Telegram concierge assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Quick Links */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500" />
            <span className="font-semibold text-slate-600">WE LINK AGENCY</span>
            <span>— Exclusive Date Boy & Companion Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-slate-700 font-medium transition-colors">
              Browse Catalog
            </Link>
            <Link to="/register" className="hover:text-slate-700 font-medium transition-colors">
              Become a Model
            </Link>
            <span>© {new Date().getFullYear()} All Rights Reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans selection:bg-amber-500 selection:text-white">
        <Navigation />
        <main className="flex-grow transition-all duration-300">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            {/* Login အဟောင်းကြီးကို ဖယ်ထုတ်ပြီး၊ Admin.jsx ကို တိုက်ရိုက်ချိတ်ဆက်လိုက်ပါသည် */}
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
