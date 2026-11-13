import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Clock, ArrowUpRight } from 'lucide-react';
import Home from './pages/Home';
import Register from './pages/Register';
import Admin from './pages/Admin';

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

  // Strict 3-Zone Top Bar Contract:
  // Zone 1: Single text element wordmark
  // Zone 2: 4 concise single-line navigation links
  // Zone 3: 1 primary action button
  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E6DFD3] transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (single text element, no badges or subtitles) */}
        <Link
          to="/"
          className="font-serif text-2xl sm:text-[28px] font-semibold tracking-[0.18em] text-[#0C0D0E] whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
        >
          WE LINK
        </Link>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-8 text-sm font-medium text-[#524E48]">
          <Link
            to="/"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b ${
              location.pathname === '/'
                ? 'text-[#0C0D0E] border-[#0C0D0E] font-semibold'
                : 'border-transparent hover:text-[#0C0D0E] hover:border-[#C5A059]'
            }`}
          >
            Directory
          </Link>
          <a
            href="/#concierge-protocol"
            className="py-1 border-b border-transparent hover:text-[#0C0D0E] hover:border-[#C5A059] transition-colors whitespace-nowrap shrink-0"
          >
            Concierge Protocol
          </a>
          <a
            href="/#discretion-pillars"
            className="py-1 border-b border-transparent hover:text-[#0C0D0E] hover:border-[#C5A059] transition-colors whitespace-nowrap shrink-0"
          >
            Discretion & Trust
          </a>
          <Link
            to="/register"
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b ${
              isRegisterPage
                ? 'text-[#0C0D0E] border-[#0C0D0E] font-semibold'
                : 'border-transparent hover:text-[#0C0D0E] hover:border-[#C5A059]'
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
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold tracking-wide text-[#FAF8F5] bg-[#0C0D0E] hover:bg-[#1E2126] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Browse Directory
            </Link>
          ) : (
            <Link
              to="/register"
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold tracking-wide text-[#0C0D0E] bg-[#C5A059] hover:bg-[#b58f47] rounded-lg transition-colors whitespace-nowrap shrink-0"
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
    <footer id="discretion-pillars" className="bg-[#0C0D0E] text-[#FAF8F5] border-t border-[#262420] mt-24">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-20">
        {/* Editorial Discretion & Governance Pillars */}
        <div className="mb-12">
          <p className="text-xs tracking-[0.2em] text-[#C5A059] font-medium mb-3">
            PRIVATE GOVERNANCE & STANDARDS
          </p>
          <h2 className="font-serif text-2xl sm:text-4xl font-medium text-[#FAF8F5] max-w-2xl">
            Engineered for absolute discretion, personal safety, and verified authenticity.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-[#262420]">
          <div className="p-6 sm:p-8 rounded-xl bg-[#141619] border border-[#262420]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-[#C5A059] tabular-nums">01. VERIFICATION</span>
              <ShieldCheck size={18} className="text-[#C5A059]" />
            </div>
            <h3 className="font-serif text-xl font-medium text-[#FAF8F5] mb-2">
              01. 100% Screened Portfolios
            </h3>
            <p className="text-xs sm:text-sm text-[#A39E93] leading-relaxed">
              Every companion portfolio undergoes strict identity, appearance, and background verification by WE LINK executive management prior to directory listing.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-xl bg-[#141619] border border-[#262420]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-[#C5A059] tabular-nums">02. CONFIDENTIALITY</span>
              <Lock size={18} className="text-[#C5A059]" />
            </div>
            <h3 className="font-serif text-xl font-medium text-[#FAF8F5] mb-2">
              02. Strict Non-Disclosure Protocol
            </h3>
            <p className="text-xs sm:text-sm text-[#A39E93] leading-relaxed">
              Client identities, private contact handles, and arrangement itineraries are encrypted and handled exclusively through our private concierge desk.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-xl bg-[#141619] border border-[#262420]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-[#C5A059] tabular-nums">03. DISPATCH</span>
              <Clock size={18} className="text-[#C5A059]" />
            </div>
            <h3 className="font-serif text-xl font-medium text-[#FAF8F5] mb-2">
              03. Bespoke Concierge Coordination
            </h3>
            <p className="text-xs sm:text-sm text-[#A39E93] leading-relaxed">
              Seamless reservation scheduling via Web Dossier or automated Telegram Concierge with dedicated support across Yangon, Mandalay, and major cities.
            </p>
          </div>
        </div>

        {/* Quiet Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#8C857B]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-serif text-base tracking-[0.18em] text-[#FAF8F5] font-semibold">
              WE LINK
            </span>
            <span aria-hidden="true">·</span>
            <span>Premier Male Companion & Private Concierge Agency</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link to="/" className="hover:text-[#FAF8F5] transition-colors whitespace-nowrap">
              Companion Directory
            </Link>
            <Link to="/register" className="hover:text-[#FAF8F5] transition-colors inline-flex items-center gap-1 whitespace-nowrap">
              <span>Model Dossier Application</span>
              <ArrowUpRight size={13} />
            </Link>
            <span className="tabular-nums">© {new Date().getFullYear()} WE LINK. All Rights Reserved.</span>
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
      <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#111315] font-sans">
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
