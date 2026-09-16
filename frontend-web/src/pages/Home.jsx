import React, { useState, useEffect } from 'react';
import { MapPin, Search, Heart, Sparkles } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function Home() {
  const [dateBoys, setDateBoys] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dropdown ဖြင့် ရှာဖွေရန် State များ
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedTownship, setSelectedTownship] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qBoys = query(collection(db, 'dateboys'), where('status', '==', 'approved'));
        const [boysSnap, locSnap] = await Promise.all([getDocs(qBoys), getDocs(collection(db, 'locations'))]);
        
        setDateBoys(boysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLocations(locSnap.docs.map(doc => doc.data()));
      } catch (error) { console.error("Error:", error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const cities = [...new Set(locations.map(l => l.city))];
  const townships = locations.filter(l => l.city === selectedCity).map(l => l.township);

  // စစ်ထုတ်ခြင်း (Filtering)
  const filteredBoys = dateBoys.filter(boy => {
    if (selectedTownship) return boy.township === selectedTownship;
    if (selectedCity) return boy.city === selectedCity;
    return true; // ဘာမှမရွေးထားလျှင် အကုန်ပြမည်
  });

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-700">
      
      {/* ⚠️ Screenshot အရ ကွက်လပ် (Gap) များ လျှော့ချထားသော နေရာ ⚠️ */}
      <div className="text-center mb-6 sm:mb-8 space-y-3 pt-2">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-yellow-100 to-green-100 rounded-full mb-1 shadow-inner">
          <Sparkles className="text-green-500 w-6 h-6" />
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-orange-400 via-yellow-500 to-green-500 text-transparent bg-clip-text inline-block pb-1 tracking-tight">
          Find Your Perfect Match
        </h1>
        <p className="text-gray-500 font-medium text-sm sm:text-base max-w-xl mx-auto">
          WE LINK မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်။ သင်နှင့် အလိုက်ဖက်ဆုံး Date Boy များကို ရွေးချယ်လိုက်ပါ။
        </p>
      </div>

      {/* Dropdown Search Bar အသစ် */}
      <div className="max-w-2xl mx-auto mb-10 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <div className="relative bg-white/90 backdrop-blur-md p-2 rounded-[2rem] shadow-lg flex flex-col sm:flex-row gap-2 border border-white">
          
          <div className="flex-1 flex items-center bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100">
            <MapPin className="text-yellow-500 w-5 h-5 mr-2" />
            <select value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setSelectedTownship(''); }} className="w-full bg-transparent outline-none text-gray-700 font-medium py-2 appearance-none cursor-pointer">
              <option value="">မြို့ အားလုံးပြပါ</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="flex-1 flex items-center bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100">
            <Search className="text-green-500 w-5 h-5 mr-2" />
            <select value={selectedTownship} onChange={(e) => setSelectedTownship(e.target.value)} disabled={!selectedCity} className="w-full bg-transparent outline-none text-gray-700 font-medium py-2 appearance-none disabled:opacity-50 cursor-pointer">
              <option value="">{selectedCity ? 'မြို့နယ် အားလုံးပြပါ' : 'မြို့ကို အရင်ရွေးပါ'}</option>
              {townships.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* Results Grid (ပုံမှန်အတိုင်း) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {[1, 2, 3, 4].map(n => <div key={n} className="bg-white rounded-[2rem] h-96 animate-pulse shadow-sm border border-gray-100"></div>)}
        </div>
      ) : filteredBoys.length === 0 ? (
        <div className="text-center bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 max-w-2xl mx-auto mt-10">
          <h3 className="text-xl font-bold text-gray-700 mb-2">ရှာဖွေမှု မတွေ့ရှိပါ</h3>
          <p className="text-gray-500">ရွေးချယ်ထားသော မြို့နယ်တွင် Date Boy မရှိသေးပါ။</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {filteredBoys.map(boy => (
            <div key={boy.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-lg border border-gray-100 overflow-hidden transition-all group flex flex-col h-full hover:-translate-y-1">
              <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                {boy.publicPhoto ? <img src={boy.publicPhoto} alt="img" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/> : <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>}
                <div className="absolute top-4 right-4 bg-white/90 text-green-600 text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>AVAILABLE</div>
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-black text-2xl truncate drop-shadow-md">{boy.name}</h3>
                  <p className="text-sm font-medium text-white/90 flex items-center gap-1.5 mt-1"><MapPin size={14} className="text-yellow-400" /> {boy.township}, {boy.city}</p>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl mb-4 border border-gray-100">
                  <div className="text-center px-3 border-r border-gray-200"><span className="block text-xs font-bold text-gray-400 uppercase">အသက်</span><span className="block text-gray-700 font-bold">{boy.age}</span></div>
                  <div className="text-center px-3"><span className="block text-xs font-bold text-gray-400 uppercase">အရပ်</span><span className="block text-gray-700 font-bold">{boy.height}</span></div>
                </div>
                <button className="mt-auto w-full bg-gray-900 text-white group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-yellow-500 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all">
                  <Heart size={18} className="group-hover:animate-bounce" /> REQUEST TO DATE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
