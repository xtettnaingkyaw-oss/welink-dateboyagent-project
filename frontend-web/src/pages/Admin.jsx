import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { UserCheck, Clock, MapPin, Plus, Trash2, CheckCircle2, Settings, Eye } from 'lucide-react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('requests');
  const [boys, setBoys] = useState([]);
  const [locations, setLocations] = useState([]);
  const [newCity, setNewCity] = useState('');
  const [newTownship, setNewTownship] = useState('');

  // 🔍 Private ပုံကြီးကို နှိပ်ကြည့်ရန် Modal State 🔍
  const [modalImage, setModalImage] = useState(null);

  useEffect(() => {
    const unsubBoys = onSnapshot(query(collection(db, 'dateboys')), (snap) => setBoys(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubLocs = onSnapshot(query(collection(db, 'locations')), (snap) => setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubBoys(); unsubLocs(); };
  }, []);

  const pendingBoys = boys.filter(boy => boy.status === 'pending');
  const approvedBoys = boys.filter(boy => boy.status === 'approved');
  
  const pendingLocations = locations.filter(loc => loc.status === 'pending');
  const approvedLocations = locations.filter(loc => loc.status !== 'pending');

  const handleApprove = async (id) => updateDoc(doc(db, 'dateboys', id), { status: 'approved' });
  const handleReject = async (id) => window.confirm('ဖျက်ပစ်မှာ သေချာပါသလား?') && deleteDoc(doc(db, 'dateboys', id));

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if(!newCity || !newTownship) return;
    await addDoc(collection(db, 'locations'), { city: newCity, township: newTownship, status: 'approved' });
    setNewTownship('');
  };
  const handleApproveLocation = async (id) => updateDoc(doc(db, 'locations', id), { status: 'approved' });
  const handleDeleteLocation = async (id) => window.confirm('ဒီမြို့နယ်ကို ဖျက်မှာ သေချာပါသလား?') && deleteDoc(doc(db, 'locations', id));

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">Admin Dashboard</h2>
          <p className="text-gray-500 mt-1 font-medium">စနစ်ထိန်းချုပ်မှု မျက်နှာပြင်</p>
        </div>
        <div className="bg-green-50 px-5 py-2.5 rounded-full border border-green-100 flex items-center gap-3 shadow-inner">
          <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-sm font-bold text-green-700">SYSTEM LIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-[2rem] shadow-sm border border-gray-100 sticky top-20 z-40">
        <button onClick={() => setActiveTab('requests')} className={`flex-1 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 ${activeTab === 'requests' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 transform scale-[1.02]' : 'bg-transparent text-gray-500 hover:bg-orange-50 hover:text-orange-600'}`}>
          <Clock size={22} /> အသစ်လျှောက်ထားသူများ
          {pendingBoys.length > 0 && <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'requests' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-600'}`}>{pendingBoys.length}</span>}
        </button>
        <button onClick={() => setActiveTab('dateboys')} className={`flex-1 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 ${activeTab === 'dateboys' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 transform scale-[1.02]' : 'bg-transparent text-gray-500 hover:bg-green-50 hover:text-green-600'}`}>
          <UserCheck size={22} /> လက်ရှိ Date Boys
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'dateboys' ? 'bg-white text-green-600' : 'bg-green-100 text-green-600'}`}>{approvedBoys.length}</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 transform scale-[1.02]' : 'bg-transparent text-gray-500 hover:bg-purple-50 hover:text-purple-600'}`}>
          <Settings size={22} /> Settings & မြို့နယ်များ
        </button>
      </div>

      {/* Content Area */}
      <div className="pt-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
        
        {/* 1. Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Clock className="text-orange-500"/> အတည်ပြုရန် စောင့်ဆိုင်းနေသူများ</h3>
            {pendingBoys.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-[2rem] border border-gray-100"><p className="text-gray-400">လောလောဆယ် အသစ်လျှောက်ထားသူ မရှိသေးပါ။</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pendingBoys.map(boy => (
                  <div key={boy.id} className="bg-white border border-orange-100 p-5 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div><h4 className="font-bold text-2xl text-gray-800">{boy.name}</h4><p className="text-sm text-gray-500">{boy.age} နှစ် • အရပ် {boy.height}</p></div>
                      </div>
                      
                      <div className="bg-orange-50/50 p-3 rounded-2xl text-sm space-y-1 mb-4 border border-orange-100">
                        <p className="text-gray-700 font-medium">📍 {boy.township}, {boy.city}</p>
                        <p className="text-orange-600 font-bold">📞 {boy.phone}</p>
                        <p className="text-xs text-gray-500 truncate">လိပ်စာ: {boy.address}</p>
                      </div>

                      {/* 📸 Photos Section (Public & Private) 📸 */}
                      <div className="space-y-3 mb-5">
                        <div>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Public Profile ပုံ</span>
                          {boy.publicPhoto ? (
                            <img src={boy.publicPhoto} alt="public" className="w-full h-44 object-cover rounded-2xl border border-gray-100 shadow-sm" />
                          ) : (
                            <div className="w-full h-20 bg-gray-50 rounded-xl flex items-center justify-center text-xs text-gray-400">ပုံမပါပါ</div>
                          )}
                        </div>

                        <div>
                          <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block mb-1">🔒 Private Gallery ပုံ</span>
                          {boy.privatePhotos ? (
                            <div className="relative group cursor-pointer" onClick={() => setModalImage(boy.privatePhotos)}>
                              <img src={boy.privatePhotos} alt="private" className="w-full h-32 object-cover rounded-2xl border-2 border-purple-200 shadow-sm group-hover:opacity-90 transition-opacity" />
                              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-sm gap-1">
                                <Eye size={18} /> ကြီးიდကြည့်ရန်
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-20 bg-purple-50/50 rounded-xl flex items-center justify-center text-xs text-purple-400 border border-purple-100">Private ပုံ တင်ထားခြင်း မရှိပါ</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => handleApprove(boy.id)} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 shadow-sm active:scale-95 transition-all">လက်ခံမည်</button>
                      <button onClick={() => handleReject(boy.id)} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 active:scale-95 transition-all">ပယ်ဖျက်မည်</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Date Boys Tab */}
        {activeTab === 'dateboys' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><UserCheck className="text-green-500"/> စနစ်တွင်းရှိ Date Boys များ</h3>
            {approvedBoys.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-[2rem] border border-gray-100"><p className="text-gray-400">စနစ်ထဲတွင် Date Boy မရှိသေးပါ။</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {approvedBoys.map(boy => (
                  <div key={boy.id} className="bg-white border border-green-100 p-4 rounded-[2rem] shadow-sm flex flex-col justify-between">
                     <div className="flex gap-4 items-center mb-3">
                       {boy.publicPhoto ? <img src={boy.publicPhoto} alt="img" className="w-20 h-20 object-cover rounded-2xl border shadow-sm" /> : <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-xs text-gray-400">No Photo</div>}
                       <div className="flex-1 overflow-hidden">
                         <p className="font-bold text-gray-800 text-lg truncate">{boy.name}</p>
                         <p className="text-xs text-gray-500 font-medium">{boy.township}, {boy.city}</p>
                         <p className="text-sm font-bold text-green-600 mt-1">{boy.phone}</p>
                       </div>
                     </div>
                     {boy.privatePhotos && (
                       <div className="mb-3 cursor-pointer" onClick={() => setModalImage(boy.privatePhotos)}>
                         <span className="text-[10px] font-bold text-purple-600 block mb-1">🔒 Private ပုံ (နှိပ်၍ ကြည့်ရန်)</span>
                         <img src={boy.privatePhotos} alt="private" className="w-full h-20 object-cover rounded-xl border border-purple-100" />
                       </div>
                     )}
                     <button onClick={() => handleReject(boy.id)} className="w-full text-red-500 text-sm font-bold bg-red-50 py-2.5 rounded-xl hover:bg-red-100 transition-all">ဖျက်မည်</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Settings Tab */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2 mb-5"><Plus size={20}/> မြို့နယ် အသစ်ထည့်ရန်</h3>
                <form onSubmit={handleAddLocation} className="flex flex-col sm:flex-row gap-3">
                  <input type="text" value={newCity} onChange={e=>setNewCity(e.target.value)} placeholder="မြို့အမည် (ဥပမာ- ရန်ကုန်)" className="w-full sm:w-1/3 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-blue-400" required/>
                  <input type="text" value={newTownship} onChange={e=>setNewTownship(e.target.value)} placeholder="မြို့နယ်အသစ်" className="w-full sm:flex-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-blue-400" required/>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold transition-colors">ထည့်မည်</button>
                </form>
              </div>

              {pendingLocations.length > 0 && (
                <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-200 shadow-sm">
                  <h3 className="text-lg font-bold text-orange-600 flex items-center gap-2 mb-5"><Clock size={20}/> အတည်ပြုရန် လိုအပ်သော မြို့နယ်များ</h3>
                  <div className="space-y-3">
                    {pendingLocations.map(loc => (
                      <div key={loc.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
                        <span className="font-bold text-gray-800 text-lg">{loc.township} <span className="text-sm text-orange-600 font-medium">({loc.city})</span></span>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveLocation(loc.id)} className="bg-green-500 text-white p-2.5 rounded-xl hover:bg-green-600"><CheckCircle2 size={20}/></button>
                          <button onClick={() => handleDeleteLocation(loc.id)} className="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-100"><Trash2 size={20}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 max-h-[75vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-5"><MapPin size={20} className="text-purple-500"/> လက်ရှိ အသုံးပြုနေသော မြို့နယ်များ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {approvedLocations.map(loc => (
                  <div key={loc.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 group">
                    <span className="font-medium text-gray-700">{loc.township} <span className="text-xs text-gray-400 block mt-0.5">{loc.city}</span></span>
                    <button onClick={() => handleDeleteLocation(loc.id)} className="text-red-400 hover:text-white hover:bg-red-500 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 🔍 Private Image Zoom Modal (ပုံကို နှိပ်လျှင် အကြီးချဲ့ပြရန်) 🔍 */}
      {modalImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setModalImage(null)}>
          <div className="relative max-w-2xl w-full bg-white p-4 rounded-[2rem] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-gray-800">Private Gallery ပုံ</h4>
              <button onClick={() => setModalImage(null)} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-bold text-sm">ပိတ်မည် (Close)</button>
            </div>
            <img src={modalImage} alt="Private Full" className="w-full max-h-[75vh] object-contain rounded-2xl border" />
          </div>
        </div>
      )}

    </div>
  );
}
