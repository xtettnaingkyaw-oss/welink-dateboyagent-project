import React, { useState, useEffect } from 'react';
import { MapPin, Search, Star } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function Home() {
  const [dateBoys, setDateBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');

  // Firebase မှ Approved ဖြစ်ထားသော Date Boy များကို ဆွဲယူခြင်း
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

  // မြို့နယ်အလိုက် ရှာဖွေရန် (Filter)
  const filteredBoys = dateBoys.filter(boy => 
    boy.city?.toLowerCase().includes(searchCity.toLowerCase()) ||
    boy.township?.toLowerCase().includes(searchCity.toLowerCase())
  );

  return (
    <div className="p-4 animate-fade-in">
      {/* Search Bar */}
      <div className="mb-6 bg-white p-2 rounded-xl shadow-sm flex items-center border border-gray-100">
        <Search className="text-gray-400 ml-2" size={20} />
        <input 
          type="text" 
          placeholder="မြို့ သို့မဟုတ် မြို့နယ် ရှာဖွေရန်..." 
          className="w-full p-2 outline-none text-gray-700"
          value={searchCity}
          onChange={(e) => setSearchCity(e.target.value)}
        />
      </div>

      <h2 className="text-xl font-bold mb-4 text-gray-800">ရရှိနိုင်သော Date Boys များ</h2>

      {loading ? (
        <div className="text-center text-gray-500 my-10">ရှာဖွေနေပါသည်...</div>
      ) : filteredBoys.length === 0 ? (
        <div className="text-center text-gray-500 my-10 bg-white p-6 rounded-xl shadow-sm">
          လောလောဆယ် ရရှိနိုင်သော Date Boy မရှိသေးပါ။
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredBoys.map(boy => (
            <div key={boy.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              {/* Photo */}
              <div className="relative h-40 bg-gray-200">
                {boy.publicPhoto ? (
                  <img src={boy.publicPhoto} alt={boy.name} className="w-full h-full object-cover"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>
                )}
                <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                  <Star size={10} /> Available
                </div>
              </div>
              
              {/* Info */}
              <div className="p-3">
                <h3 className="font-bold text-gray-800 text-lg truncate">{boy.name}</h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin size={12} className="text-blue-500"/> {boy.township}, {boy.city}
                </p>
                <div className="mt-2 text-xs text-gray-600 flex justify-between items-center">
                  <span>အသက် - {boy.age}</span>
                  <span>အရပ် - {boy.height}</span>
                </div>
                
                {/* Action Button */}
                <button className="mt-3 w-full bg-gradient-to-r from-yellow-400 to-green-500 hover:from-yellow-500 hover:to-green-600 text-white py-2 rounded-lg text-sm font-semibold shadow-sm transition-all">
                  Request to Date
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
