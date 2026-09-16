import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Settings, UserPlus, Search, HeartHandshake } from 'lucide-react';
import Home from './pages/Home';
import Register from './pages/Register';
import Admin from './pages/Admin';

function Navigation() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-to-tr from-yellow-400 to-green-500 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-md">
              <HeartHandshake className="text-white w-6 h-6 md:w-8 md:h-8" />
            </div>
            <span className="text-2xl md:text-3xl font-black bg-gradient-to-r from-orange-400 via-yellow-500 to-green-500 text-transparent bg-clip-text tracking-tight">
              WE LINK
            </span>
          </Link>
          <div className="flex gap-2 sm:gap-4">
            <Link to="/" className={`flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl transition-all duration-300 ${isActive('/') ? 'text-blue-600 bg-blue-50 shadow-inner' : 'text-gray-500 hover:text-blue-500 hover:bg-gray-50'}`}>
              <Search size={22} className={isActive('/') ? 'drop-shadow-sm' : ''} />
              <span className="text-[10px] md:text-xs font-bold mt-1">Find</span>
            </Link>
            <Link to="/register" className={`flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl transition-all duration-300 ${isActive('/register') ? 'text-green-600 bg-green-50 shadow-inner' : 'text-gray-500 hover:text-green-500 hover:bg-gray-50'}`}>
              <UserPlus size={22} className={isActive('/register') ? 'drop-shadow-sm' : ''} />
              <span className="text-[10px] md:text-xs font-bold mt-1">Join</span>
            </Link>
            <Link to="/admin" className={`flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl transition-all duration-300 ${isActive('/admin') ? 'text-purple-600 bg-purple-50 shadow-inner' : 'text-gray-500 hover:text-purple-500 hover:bg-gray-50'}`}>
              <Settings size={22} className={isActive('/admin') ? 'drop-shadow-sm' : ''} />
              <span className="text-[10px] md:text-xs font-bold mt-1">Admin</span>
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
      <div className="min-h-screen bg-[#f8fafc] font-sans pb-10 selection:bg-yellow-200">
        <Navigation />
        <div className="pt-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
