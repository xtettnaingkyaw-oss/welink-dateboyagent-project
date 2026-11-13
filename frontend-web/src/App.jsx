import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Clock, ArrowUpRight } from 'lucide-react';
import Home from './pages/Home';
import Register from './pages/Register';
import Admin from './pages/Admin';
import { BRAND_LOGO_URL } from './utils/catalogLogic';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

function Navigation() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return null;
  const isRegisterPage = location.pathname === '/register';

  // Strict 3-Zone Top Bar Contract with WE LINK Brand Logo & Prismatic Top Accent:
  // Zone 1: Brand Logo + Wordmark (single line)
  // Zone 2: 4 concise single-line navigation links
  // Zone 3: 1 primary action button
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 transition-colors duration-200">
      <div className="h-1 w-full welink-spectrum-bar" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo + Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-3 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
        >
          <img
            src={BRAND_LOGO_URL}
            alt="WE LINK Brand Logo"
            className="w-11 h-11 sm:w-12 sm:h-12 object-contain rounded-xl bg-white border border-slate-200/80 p-0.5 shadow-sm shrink-0"
          />
          <span className="font-serif text-2xl sm:text-[26px] font-bold tracking-[0.14em] text-slate-900">
            WE LINK
          </span>
        </Link>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600"
        >
          <Link
            to="/"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              location.pathname === '/'
                ? 'text-slate-900 border-emerald-500 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-amber-400'
            }`}
          >
            Directory
          </Link>
          <a
            href="/#concierge-protocol"
            className="py-1 border-b-2 border-transparent hover:text-slate-900 hover:border-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Concierge Protocol
          </a>
          <a
            href="/#discretion-pillars"
            className="py-1 border-b-2 border-transparent hover:text-slate-900 hover:border-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Discretion & Trust
          </a>
          <Link
            to="/register"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              isRegisterPage
                ? 'text-slate-900 border-emerald-500 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-amber-400'
            }`}
          >
            Model Application
          </Link>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          {isRegisterPage ? (
            <Link
              to="/"
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold tracking-wide text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Browse Directory
            </Link>
          ) : (
            <Link
              to="/register"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold tracking-wide text-slate-950 welink-brand-gradient hover:opacity-95 rounded-lg shadow-sm transition-opacity whitespace-nowrap shrink-0"
            >
              Apply as Companion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <footer
      id="discretion-pillars"
      className="bg-[#0B1120] text-slate-100 border-t border-slate-800 mt-24 relative overflow-hidden"
    >
      <div className="h-1 w-full welink-spectrum-bar" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-20">
        {/* Brand Identity & Governance Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <p className="text-xs tracking-[0.22em] text-amber-400 font-semibold mb-2">
              WE LINK · ALL OF YOU · PRIVATE GOVERNANCE
            </p>
            <h2 className="font-serif text-2xl sm:text-4xl font-medium text-white max-w-2xl">
              Inclusivity, verified authenticity, and absolute client discretion.
            </h2>
          </div>

          <div className="flex items-center gap-3.5 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shrink-0 self-start">
            <img
              src={BRAND_LOGO_URL}
              alt="WE LINK All Of You Logo"
              className="w-14 h-14 object-contain rounded-xl bg-white p-1"
            />
            <div className="pr-2">
              <span className="font-serif text-lg font-bold tracking-widest text-white block">
                WE LINK
              </span>
              <span className="font-mono text-[11px] tracking-[0.2em] text-emerald-400 block">
                ALL OF YOU
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-slate-800/90">
          <div className="p-6 sm:p-8 rounded-xl bg-slate-900/75 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-amber-400 tabular-nums">
                01. VERIFICATION
              </span>
              <ShieldCheck size={18} className="text-emerald-400" />
            </div>
            <h3 className="font-serif text-xl font-medium text-white mb-2">
              01. 100% Screened Portfolios
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every companion portfolio undergoes strict identity, appearance, and background verification by WE LINK executive management prior to directory listing.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-xl bg-slate-900/75 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-emerald-400 tabular-nums">
                02. CONFIDENTIALITY
              </span>
              <Lock size={18} className="text-amber-400" />
            </div>
            <h3 className="font-serif text-xl font-medium text-white mb-2">
              02. Strict Non-Disclosure Protocol
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Client identities, private contact handles, and arrangement itineraries are encrypted and handled exclusively through our private concierge desk.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-xl bg-slate-900/75 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-sky-400 tabular-nums">
                03. DISPATCH
              </span>
              <Clock size={18} className="text-sky-400" />
            </div>
            <h3 className="font-serif text-xl font-medium text-white mb-2">
              03. Bespoke Concierge Coordination
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Seamless reservation scheduling via Web Dossier or automated Telegram Concierge with dedicated support across Yangon, Mandalay, and major cities.
            </p>
          </div>
        </div>

        {/* Quiet Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-serif text-base tracking-[0.18em] text-white font-semibold">
              WE LINK
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-mono text-[11px] tracking-widest">
              ALL OF YOU
            </span>
            <span aria-hidden="true">·</span>
            <span>Premier Companion & Private Concierge Agency</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link to="/" className="hover:text-white transition-colors whitespace-nowrap">
              Companion Directory
            </Link>
            <Link
              to="/register"
              className="hover:text-white transition-colors inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Model Dossier Application</span>
              <ArrowUpRight size={13} />
            </Link>
            <span className="tabular-nums">
              © {new Date().getFullYear()} WE LINK. All Rights Reserved.
            </span>
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
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans">
        <Navigation />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
