import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where } from 'firebase/firestore';
import { UserCheck, Clock, MapPin, Plus, Trash2, CheckCircle2, Settings, Eye, Pencil, EyeOff, Save, X } from 'lucide-react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('requests');
  const [boys, setBoys] = useState([]);
  const [locations, setLocations] = useState([]);
  
  const [newCity, setNewCity] = useState('');
  const [newTownship, setNewTownship] = useState('');
  const [modalImage, setModalImage] = useState(null);

  // Locations Edit State
  const [editingLocId, setEditingLocId] = useState(null);
  const [editCity, setEditCity] = useState('');
  const [editTownship, setEditTownship] = useState('');

  // 📝 Date Boy Edit State
  const [editingBoyId, setEditingBoyId] = useState(null);
  const [editBoyData, setEditBoyData] = useState({});

  useEffect(() => {
    const unsubBoys = onSnapshot(query(collection(db, 'dateboys')), (snap) => setBoys(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubLocs = onSnapshot(query(collection(db, 'locations')), (snap) => setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubBoys(); unsubLocs(); };
  }, []);

  const pendingBoys = boys.filter(boy => boy.status === 'pending');
  // Approved နှင့် Hidden (Hide လုပ်ထားသူများ) ကိုပါ Admin က မြင်ရမည်
  const approvedBoys = boys.filter(boy => boy.status === 'approved' || boy.status === 'hidden');
  
  const pendingLocations = locations.filter(loc => loc.status === 'pending');
  const approvedLocations = locations.filter(loc => loc.status !== 'pending');

  const handleApprove = async (id) => updateDoc(doc(db, 'dateboys', id), { status: 'approved' });
  const handleDeleteDateBoy = async (id) => window.confirm('ဖျက်ပစ်မှာ သေချာပါသလား?') && deleteDoc(doc(db, 'dateboys', id));

  // 👁️ Home Page မှ ဖျောက်ရန် / ပြန်ဖော်ရန် (Toggle Visibility)
  const handleToggleVisibility = async (boy) => {
    const newStatus = boy.status === 'hidden' ? 'approved' : 'hidden';
    await updateDoc(doc(db, 'dateboys', boy.id), { status: newStatus });
  };

  // ✏️ Date Boy ပြင်ဆင်ခြင်း စတင်ရန်
  const startEditBoy = (boy) => {
    setEditingBoyId(boy.id);
    setEditBoyData({ name: boy.name, age: boy.age, height: boy.height, cockSize: boy.cockSize || '', phone: boy.phone, city: boy.city, township: boy.township, address: boy.address });
  };

  // 💾 Date Boy အချက်အလက်များ သိမ်းရန်
  const saveEditedBoy = async (id) => {
    await updateDoc(doc(db, 'dateboys', id), editBoyData);
    setEditingBoyId(null);
  };

  // Location Methods
  const handleAddLocation = async (e) => {
    e.preventDefault();
    if(!newCity || !newTownship) return;
    await addDoc(collection(db, 'locations'), { city: newCity, township: newTownship, status: 'approved' });
    setNewTownship('');
  };

  const startEditLocation = (loc) => {
    setEditingLocId(loc.id);
    setEditCity(loc.city);
    setEditTownship(loc.township);
  };

  const saveEditedLocation = async (loc) => {
    await updateDoc(doc(db, 'locations', loc.id), { city: editCity, township: editTownship, status: 'approved' });
    const qBoys = query(collection(db, 'dateboys'), where('city', '==', loc.city), where('township', '==', loc.township));
    const snap = await getDocs(qBoys);
    snap.forEach(async (d) => {
      await updateDoc(doc(db, 'dateboys', d.id), { city: editCity, township: editTownship });
    });
    setEditingLocId(null);
  };

  const handleApproveLocation = async (id) => updateDoc(doc(db, 'locations', id), { status: 'approved' });
  const handleDeleteLocation = async (id) => window.confirm('ဒီမြို့နယ်ကို ဖျက်မှာ သေချာပါသလား?') && deleteDoc(doc(db, 'locations', id));

  // Date Boy ကတ်များကို render လုပ်သည့် Component
  const DateBoyCard = ({ boy, isPending }) => {
    const pPhotos = Array.isArray(boy.publicPhotos) ? boy.publicPhotos : (boy.publicPhoto ? [boy.publicPhoto] : []);
    const prPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : (boy.privatePhotos ? [boy.privatePhotos] : []);
    const isEditing = editingBoyId === boy.id;

    return (
      <div className={`bg-white border ${boy.status === 'hidden' ? 'border-gray-300 opacity-75' : isPending ? 'border-orange-100' : 'border-green-100'} p-5 rounded-[2rem] shadow-sm flex flex-col justify-between relative`}>
        {boy.status === 'hidden' && <div className="absolute top-4 right-4 bg-gray-800 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1 z-10"><EyeOff size={14}/> ဖျောက်ထားသည်</div>}

        <div className="flex-1">
          {/* ✏️ Edit Mode */}
          {isEditing ? (
            <div className="space-y-3 mb-4">
              <input type="text" value={editBoyData.name} onChange={e=>setEditBoyData({...editBoyData, name: e.target.value})} className="w-full p-2 border rounded-xl" placeholder="အမည်" />
              <div className="flex gap-2">
                <input type="text" value={editBoyData.age} onChange={e=>setEditBoyData({...editBoyData, age: e.target.value})} className="w-1/2 p-2 border rounded-xl" placeholder="အသက်" />
                <input type="text" value={editBoyData.height} onChange={e=>setEditBoyData({...editBoyData, height: e.target.value})} className="w-1/2 p-2 border rounded-xl" placeholder="အရပ်" />
              </div>
              <input type="text" value={editBoyData.cockSize} onChange={e=>setEditBoyData({...editBoyData, cockSize: e.target.value})} className="w-full p-2 border rounded-xl" placeholder="Cock Size" />
              <input type="text" value={editBoyData.phone} onChange={e=>setEditBoyData({...editBoyData, phone: e.target.value})} className="w-full p-2 border rounded-xl" placeholder="ဖုန်း" />
              <div className="flex gap-2">
                <input type="text" value={editBoyData.city} onChange={e=>setEditBoyData({...editBoyData, city: e.target.value})} className="w-1/2 p-2 border rounded-xl" placeholder="မြို့" />
                <input type="text" value={editBoyData.township} onChange={e=>setEditBoyData({...editBoyData, township: e.target.value})} className="w-1/2 p-2 border rounded-xl" placeholder="မြို့နယ်" />
              </div>
              <input type="text" value={editBoyData.address} onChange={e=>setEditBoyData({...editBoyData, address: e.target.value})} className="w-full p-2 border rounded-xl" placeholder="လိပ်စာ" />
            </div>
          ) : (
            /* ပုံမှန် မြင်ကွင်း */
            <>
              <div className="flex justify-between items-start mb-3 mt-4">
                <div>
                  <h4 className="font-bold text-2xl text-gray-800">{boy.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">{boy.age} နှစ် • အရပ် {boy.height} • Size {boy.cockSize || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-sm mb-4 border border-gray-100">
                <p className="text-gray-700 font-bold mb-1">📍 {boy.township}, {boy.city}</p>
                <p className="text-blue-600 font-bold">📞 {boy.phone}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">လိပ်စာ: {boy.address}</p>
              </div>
            </>
          )}

          {/* ဓာတ်ပုံများ (Edit လုပ်နေချိန်တွင်လည်း ပြမည်) */}
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

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
          {isPending ? (
            <>
              <button onClick={() => handleApprove(boy.id)} className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-bold hover:bg-green-600 text-sm">လက်ခံမည်</button>
              <button onClick={() => handleDeleteDateBoy(boy.id)} className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl font-bold hover:bg-red-100 text-sm">ပယ်ဖျက်မည်</button>
            </>
          ) : (
            <>
              {isEditing ? (
                <div className="w-full flex gap-2">
                  <button onClick={() => saveEditedBoy(boy.id)} className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-1"><Save size={16}/> သိမ်းမည်</button>
                  <button onClick={() => setEditingBoyId(null)} className="bg-gray-200 text-gray-700 py-2.5 px-4 rounded-xl font-bold text-sm flex justify-center items-center gap-1"><X size={16}/> ပယ်ဖျက်</button>
                </div>
              ) : (
                <>
                  <button onClick={() => startEditBoy(boy)} className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-xl font-bold hover:bg-blue-100 text-sm flex justify-center items-center gap-1"><Pencil size={16}/> ပြင်မည်</button>
                  <button onClick={() => handleToggleVisibility(boy)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-1 ${boy.status === 'hidden' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {boy.status === 'hidden' ? <><Eye size={16}/> ပြန်ဖော်မည်</> : <><EyeOff size={16}/> ဖျောက်ထားမည်</>}
                  </button>
                  <button onClick={() => handleDeleteDateBoy(boy.id)} className="bg-red-50 text-red-500 py-2.5 px-4 rounded-xl hover:bg-red-100 text-sm"><Trash2 size={18}/></button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      
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
        {/* 1. Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Clock className="text-orange-500"/> အတည်ပြုရန် စောင့်ဆိုင်းနေသူများ</h3>
            {pendingBoys.length === 0 ? <div className="bg-white p-12 text-center rounded-[2rem] border"><p className="text-gray-400">လောလောဆယ် အသစ်လျှောက်ထားသူ မရှိသေးပါ။</p></div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pendingBoys.map(boy => <DateBoyCard key={boy.id} boy={boy} isPending={true} />)}
              </div>
            )}
          </div>
        )}

        {/* 2. Date Boys Tab */}
        {activeTab === 'dateboys' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><UserCheck className="text-green-500"/> စနစ်တွင်းရှိ Date Boys များ (Approved & Hidden)</h3>
            {approvedBoys.length === 0 ? <div className="bg-white p-12 text-center rounded-[2rem] border"><p className="text-gray-400">မရှိသေးပါ။</p></div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {approvedBoys.map(boy => <DateBoyCard key={boy.id} boy={boy} isPending={false} />)}
              </div>
            )}
          </div>
        )}

        {/* 3. Settings Tab */}
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
