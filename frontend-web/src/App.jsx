import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Settings, UserPlus, Search } from 'lucide-react';

import Home from './pages/Home';
import Register from './pages/Register';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 font-sans pb-10">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm p-4 sticky top-0 z-50">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-green-500 to-blue-500 text-transparent bg-clip-text drop-shadow-sm">
              WE LINK
            </h1>
            <div className="flex gap-4">
              <Link to="/" className="text-gray-600 hover:text-green-500 flex flex-col items-center">
                <Search size={20} />
                <span className="text-[10px]">Find</span>
              </Link>
              <Link to="/register" className="text-gray-600 hover:text-blue-500 flex flex-col items-center">
                <UserPlus size={20} />
                <span className="text-[10px]">Join</span>
              </Link>
              <Link to="/admin" className="text-gray-600 hover:text-red-500 flex flex-col items-center">
                <Settings size={20} />
                <span className="text-[10px]">Admin</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Pages လမ်းကြောင်းများ */}
        <div className="max-w-md mx-auto p-4 mt-2">
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
