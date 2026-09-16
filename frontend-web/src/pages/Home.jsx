import React, { useState, useEffect } from 'react';
import { MapPin, Search, Star, Heart, Sparkles } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function Home() {
  const [dateBoys, setDateBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');

  useEffect(() => {
    const fetchDateBoys = async () => {
      try {
        const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'));
        const querySnapshot = await getDocs(q);
        const boys = [];
        querySnapshot.forEach((doc) => {
          boys.push({ id: doc.id, ...doc.data() });
        });
        setDateBoys(boys);
      } catch (error) {
        console.error("Error fetching date boys:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDateBoys();
  }, []);

  const filteredBoys = dateBoys.filter(boy => 
    boy.city?.toLowerCase().includes(searchCity.toLowerCase()) ||
    boy.township?.toLowerCase().includes(searchCity.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-700">
      
      {/* Hero Header Section */}
      <div className="text-center mb-10 sm:mb-16 space-y-4 pt-4 sm:pt-8">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-yellow-100 to-green-100 rounded-full mb-2 shadow-inner">
          <Sparkles className="text-green-500 w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-orange-400 via-yellow-500 to-green-500 text-transparent bg-clip-text inline-block pb-2 tracking-tight">
          Find Your Perfect Match
        </h1>
        <p className="text-gray-500 font-medium text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          WE LINK မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်။ သင်နှင့် အလိုက်ဖက်ဆုံး Date Boy များကို ယုံကြည်စိတ်ချစွာ ရွေးချယ်ချိတ်ဆက်လိုက်ပါ။
        </p>
      </div>

      {/* Modern Search Bar */}
      <div className="max-w-2xl mx-auto mb-12 sm:mb-16 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
        <div className="relative bg-white/90 backdrop-blur-md p-2 sm:p-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center border border-white">
          <div className="bg-gray-50 p-3 rounded-full">
            <Search className="text-green-500" size={24} />
          </div>
          <input 
            type="text" 
            placeholder="မြို့ သို့မဟုတ် မြို့နယ် နာမည်ဖြင့် ရှာဖွေပါ..." 
            className="w-full px-4 sm:px-6 py-2 outline-none text-gray-700 bg-transparent text-sm sm:text-base font-medium placeholder:text-gray-400"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
          />
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        // Loading Skeleton
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white rounded-[2rem] h-96 animate-pulse shadow-sm border border-gray-100"></div>
          ))}
        </div>
      ) : filteredBoys.length === 0 ? (
        // Empty State
        <div className="text-center bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 max-w-2xl mx-auto mt-10">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-gray-300 w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">ရှာဖွေမှု မတွေ့ရှိပါ</h3>
          <p className="text-gray-500">လောလောဆယ် ရရှိနိုင်သော Date Boy မရှိသေးပါ။ အခြားမြို့နယ်ကို ပြောင်းလဲရှာဖွေကြည့်ပါ။</p>
        </div>
      ) : (
        // Results Grid (Responsive)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {filteredBoys.map(boy => (
            <div key={boy.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-gray-100 overflow-hidden transition-all duration-300 group flex flex-col h-full hover:-translate-y-2">
              
              {/* Profile Image with Top Badge */}
              <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                {boy.publicPhoto ? (
                  <img src={boy.publicPhoto} alt={boy.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <Heart className="w-12 h-12 mb-2 opacity-20" />
                    <span className="text-sm font-medium">No Photo</span>
                  </div>
                )}
                
                {/* Available Badge */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-green-600 text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  AVAILABLE
                </div>
                
                {/* Bottom Gradient for Text readability */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
                
                {/* Name & Basic Info over Image */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-black text-2xl truncate drop-shadow-md">{boy.name}</h3>
                  <p className="text-sm font-medium text-white/90 drop-shadow flex items-center gap-1.5 mt-1">
                    <MapPin size={14} className="text-yellow-400" /> {boy.township}, {boy.city}
                  </p>
                </div>
              </div>
              
              {/* Detail Info & Action */}
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl mb-4 border border-gray-100">
                  <div className="text-center px-3 border-r border-gray-200">
                    <span className="block text-xs font-bold text-gray-400 uppercase">အသက်</span>
                    <span className="block text-gray-700 font-bold">{boy.age}</span>
                  </div>
                  <div className="text-center px-3">
                    <span className="block text-xs font-bold text-gray-400 uppercase">အရပ်</span>
                    <span className="block text-gray-700 font-bold">{boy.height}</span>
                  </div>
                </div>
                
                {/* Request Button */}
                <button className="mt-auto w-full bg-gray-900 text-white group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-yellow-500 py-3.5 rounded-2xl text-sm font-black tracking-wide shadow-sm group-hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2">
                  <Heart size={18} className="group-hover:animate-bounce" />
                  REQUEST TO DATE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
