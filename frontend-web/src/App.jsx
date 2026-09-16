import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { UserPlus, Search, HeartHandshake, Lock, Unlock } from 'lucide-react';
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

// 🔒 Admin Password ဖြင့် ကာကွယ်ပေးမည့် Component 🔒
function ProtectedAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // အောက်ပါ 'shangrila123' နေရာတွင် Admin Password ကို လိုသလို ပြောင်းလဲနိုင်ပါသည်
    if (password === 'shangrila123') {
      setIsAuthenticated(true);
    } else {
      alert('စကားဝှက် (Password) မှားယွင်းနေပါသည်။');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto text-purple-600 shadow-inner">
            <Lock size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800">Admin Login</h2>
            <p className="text-gray-400 text-sm mt-1">ဤနေရာသည် အလုပ်ရှင်/မန်နေဂျာများအတွက်သာ ဖြစ်ပါသည်။</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Admin Password ထည့်ပါ..." 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-100 focus:border-purple-500 outline-none font-medium text-center tracking-widest text-lg"
              required
            />
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2">
              <Unlock size={20} /> ဝင်ရောက်မည်
            </button>
          </form>
          <p className="text-xs text-gray-400">Default Password: shangrila123</p>
        </div>
      </div>
    );
  }

  return <Admin />;
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
            <Route path="/admin" element={<ProtectedAdmin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
