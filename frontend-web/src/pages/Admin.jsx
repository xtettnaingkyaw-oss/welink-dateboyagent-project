import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where } from 'firebase/firestore';
import { UserCheck, Clock, MapPin, Plus, Trash2, CheckCircle2, Settings, Eye, Pencil } from 'lucide-react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('requests');
  const [boys, setBoys] = useState([]);
  const [locations, setLocations] = useState([]);
  const [newCity, setNewCity] = useState('');
  const [newTownship, setNewTownship] = useState('');

  const [modalImage, setModalImage] = useState(null);

  // ✏️ မြို့နယ် ပြင်ဆင်ခြင်းအတွက် State များ
  const [editingLocId, setEditingLocId] = useState(null);
  const [editCity, setEditCity] = useState('');
  const [editTownship, setEditTownship] = useState('');

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

  // တိုက်ရိုက် ထည့်ခြင်း
  const handleAddLocation = async (e) => {
    e.preventDefault();
    if(!newCity || !newTownship) return;
    await addDoc(collection(db, 'locations'), { city: newCity, township: newTownship, status: 'approved' });
    setNewTownship('');
  };

  // ✏️ မြို့နယ် စာလုံးပေါင်း ပြင်ရန် စတင်ခြင်း
  const startEditLocation = (loc) => {
    setEditingLocId(loc.id);
    setEditCity(loc.city);
    setEditTownship(loc.township);
  };

  // 💾 ပြင်ဆင်ပြီးသည်နှင့် Approve လုပ်ကာ Dateboy လိပ်စာများကိုပါ အလိုအလျောက် Update လုပ်ခြင်း
  const saveEditedLocation = async (loc) => {
    await updateDoc(doc(db, 'locations', loc.id), {
      city: editCity,
      township: editTownship,
      status: 'approved'
    });

    // Date Boy များထဲမှ စာလုံးပေါင်း အဟောင်းသုံးထားသူများကို အသစ်ဖြင့် လိုက်လံ အစားထိုးခြင်း
    const qBoys = query(collection(db, 'dateboys'), where('city', '==', loc.city), where('township', '==', loc.township));
    const snap = await getDocs(qBoys);
    snap.forEach(async (d) => {
      await updateDoc(doc(db, 'dateboys', d.id), {
        city: editCity,
        township: editTownship
      });
    });

    setEditingLocId(null);
  };

  const handleApproveLocation = async (id) => updateDoc(doc(db, 'locations', id), { status: 'approved' });
  const handleDeleteLocation = async (id) => window.confirm('ဒီမြို့နယ်ကို ဖျက်မှာ သေချာပါသလား?') && deleteDoc(doc(db, 'locations', id));

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div><h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">Admin Dashboard</h2><p className="text-gray-500 mt-1 font-medium">စနစ်ထိန်းချုပ်မှု မျက်နှာပြင်</p></div>
        <div className="bg-green-50 px-5 py-2.5 rounded-full border flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span><span className="text-sm font-bold text-green-700">SYSTEM LIVE</span></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-[2rem] shadow-sm border sticky top-20 z-40">
        <button onClick={() => setActiveTab('requests')} className={`flex-1 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${activeTab === 'requests' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500 hover:bg-orange-50'}`}><Clock size={22} /> အသစ်လျှောက်ထားသူများ {pendingBoys.length > 0 && `(${pendingBoys.length})`}</button>
        <button onClick={() => setActiveTab('dateboys')} className={`flex-1 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${activeTab === 'dateboys' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-500 hover:bg-green-50'}`}><UserCheck size={22} /> လက်ရှိ Date Boys ({approvedBoys.length})</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-purple-50'}`}><Settings size={22} /> Settings & မြို့နယ်များ</button>
      </div>

      <div className="pt-4">
        {/* Requests & Date Boys Tabs remain exactly the same as your previous code */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Clock className="text-orange-500"/> အတည်ပြုရန် စောင့်ဆိုင်းနေသူများ</h3>
            {pendingBoys.length === 0 ? <div className="bg-white p-12 text-center rounded-[2rem] border"><p className="text-gray-400">လောလောဆယ် အသစ်လျှောက်ထားသူ မရှိသေးပါ။</p></div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pendingBoys.map(boy => {
                  const pPhotos = Array.isArray(boy.publicPhotos) ? boy.publicPhotos : (boy.publicPhoto ? [boy.publicPhoto] : []);
                  const prPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : (boy.privatePhotos ? [boy.privatePhotos] : []);
                  return (
                    <div key={boy.id} className="bg-white border border-orange-100 p-5 rounded-[2rem] shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-2xl text-gray-800">{boy.name}</h4>
                        <p className="text-sm text-gray-500 mb-3">{boy.age} နှစ် • အရပ် {boy.height} • Size {boy.cockSize}</p>
                        <div className="bg-orange-50/50 p-3 rounded-2xl text-sm mb-4 border"><p className="text-gray-700 font-bold mb-1">📍 {boy.township}, {boy.city}</p><p className="text-orange-600 font-bold">📞 {boy.phone}</p><p className="text-xs text-gray-500 mt-1">လိပ်စာ: {boy.address}</p></div>
                        <div className="mb-4">
                          <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Public ပုံများ ({pPhotos.length})</span>
                          <div className="grid grid-cols-3 gap-2">
                            {pPhotos.map((img, idx) => (
                              <div key={idx} className="relative group cursor-pointer" onClick={() => setModalImage(img)}><img src={img} alt="pub" className="w-full h-20 object-cover rounded-xl border group-hover:opacity-80" /><div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 text-white"><Eye size={14} /></div></div>
                            ))}
                          </div>
                        </div>
                        <div className="mb-4">
                          <span className="text-xs font-bold text-purple-600 uppercase block mb-1">🔒 Private ပုံများ ({prPhotos.length})</span>
                          <div className="grid grid-cols-3 gap-2">
                            {prPhotos.map((img, idx) => (
                              <div key={idx} className="relative group cursor-pointer" onClick={() => setModalImage(img)}><img src={img} alt="priv" className="w-full h-20 object-cover rounded-xl border-2 border-purple-200 group-hover:opacity-80" /><div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 text-white"><Eye size={14} /></div></div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => handleApprove(boy.id)} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600">လက်ခံမည်</button>
                        <button onClick={() => handleReject(boy.id)} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100">ပယ်ဖျက်မည်</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ... Date Boys Tab ... (Skipped for brevity, same as before) ... */}

        {/* ⚙️ 3. Settings Tab with Edit Feature */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
                <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2 mb-5"><Plus size={20}/> မြို့နယ် အသစ်ထည့်ရန်</h3>
                <form onSubmit={handleAddLocation} className="flex gap-3">
                  <input type="text" value={newCity} onChange={e=>setNewCity(e.target.value)} placeholder="မြို့" className="w-1/3 p-4 bg-gray-50 border rounded-2xl text-sm" required/>
                  <input type="text" value={newTownship} onChange={e=>setNewTownship(e.target.value)} placeholder="မြို့နယ်" className="flex-1 p-4 bg-gray-50 border rounded-2xl text-sm" required/>
                  <button type="submit" className="bg-blue-600 text-white px-6 rounded-2xl font-bold">ထည့်မည်</button>
                </form>
              </div>

              {pendingLocations.length > 0 && (
                <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-200">
                  <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2"><Clock size={20}/> အတည်ပြုရန် မြို့နယ်များ</h3>
                  <div className="space-y-3">
                    {pendingLocations.map(loc => (
                      <div key={loc.id} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col">
                        
                        {/* Edit Mode ဖွင့်ထားလျှင် */}
                        {editingLocId === loc.id ? (
                          <div className="flex flex-col gap-3 animate-in fade-in">
                            <input type="text" value={editCity} onChange={e=>setEditCity(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-sm focus:border-blue-400 outline-none" placeholder="မြို့အမည်" />
                            <input type="text" value={editTownship} onChange={e=>setEditTownship(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-sm focus:border-blue-400 outline-none" placeholder="မြို့နယ်အမည်" />
                            <div className="flex gap-2 mt-1">
                              <button onClick={() => saveEditedLocation(loc)} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-600">ပြင်ဆင်ပြီး လက်ခံမည်</button>
                              <button onClick={() => setEditingLocId(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-bold hover:bg-gray-300">ပယ်ဖျက်</button>
                            </div>
                          </div>
                        ) : (
                          /* ပုံမှန် မြင်ကွင်း */
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-800 text-lg">{loc.township} <span className="text-sm text-orange-600 font-medium block">{loc.city}</span></span>
                            <div className="flex gap-2">
                              <button onClick={() => startEditLocation(loc)} className="bg-blue-50 text-blue-500 p-2.5 rounded-xl hover:bg-blue-100" title="စာလုံးပေါင်း ပြင်မည်"><Pencil size={18}/></button>
                              <button onClick={() => handleApproveLocation(loc.id)} className="bg-green-500 text-white p-2.5 rounded-xl hover:bg-green-600" title="ဒီအတိုင်း လက်ခံမည်"><CheckCircle2 size={18}/></button>
                              <button onClick={() => handleDeleteLocation(loc.id)} className="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-100" title="ဖျက်ပစ်မည်"><Trash2 size={18}/></button>
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border max-h-[75vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-800 mb-5">လက်ရှိ မြို့နယ်များ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {approvedLocations.map(loc => (
                  <div key={loc.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border group">
                    <span>{loc.township} <span className="text-xs text-gray-400 block">({loc.city})</span></span>
                    <button onClick={() => handleDeleteLocation(loc.id)} className="text-red-400 hover:bg-red-500 hover:text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setModalImage(null)}>
          <div className="relative max-w-2xl w-full bg-white p-4 rounded-[2rem] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h4 className="font-bold text-gray-800">ပုံအကြီးကြည့်ရန်</h4><button onClick={() => setModalImage(null)} className="bg-gray-100 px-4 py-2 rounded-xl font-bold text-sm">ပိတ်မည်</button></div>
            <img src={modalImage} alt="Zoomed" className="w-full max-h-[75vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
