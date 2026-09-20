import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { UserPlus, Search, HeartHandshake } from 'lucide-react';
import Home from './pages/Home';
import Register from './pages/Register';
import Admin from './pages/Admin';

function Navigation() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Client များနှင့် အများပြည်သူမြင်ရမည့် Navigation (Admin ခလုတ် လုံးဝမပါပါ)
  return (
    <nav className="bg-white/90 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-to-tr from-yellow-400 to-green-500 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-md">
              <HeartHandshake className="text-white w-6 h-6 md:w-8 md:h-8" />
            </div>
            <span className="text-2xl md:text-3xl font-black bg-gradient-to-r from-orange-400 via-yellow-500 to-green-500 text-transparent bg-clip-text tracking-tight">
              WE LINK
            </span>
          </Link>

          {/* Client & Register Buttons Only */}
          <div className="flex gap-2 sm:gap-4">
            <Link to="/" className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 font-bold text-sm ${isActive('/') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Search size={18} />
              <span>Find Date Boy</span>
            </Link>

            <Link to="/register" className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 font-bold text-sm ${isActive('/register') ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-600 hover:bg-gray-100'}`}>
              <UserPlus size={18} />
              <span>Join as Date Boy</span>
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#f8fafc] font-sans pb-12">
        <Navigation />
        <main className="transition-all duration-300">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            {/* Login အဟောင်းကြီးကို ဖယ်ထုတ်ပြီး၊ Admin.jsx ကို တိုက်ရိုက်ချိတ်ဆက်လိုက်ပါသည် */}
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
