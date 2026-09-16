import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { UserCheck, Clock, MapPin, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function Admin() {
  const [boys, setBoys] = useState([]);
  const [locations, setLocations] = useState([]);
  const [newCity, setNewCity] = useState('');
  const [newTownship, setNewTownship] = useState('');

  useEffect(() => {
    const unsubBoys = onSnapshot(query(collection(db, 'dateboys')), (snap) => setBoys(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubLocs = onSnapshot(query(collection(db, 'locations')), (snap) => setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubBoys(); unsubLocs(); };
  }, []);

  const pendingBoys = boys.filter(boy => boy.status === 'pending');
  const approvedBoys = boys.filter(boy => boy.status === 'approved');
  
  // မြို့နယ် Request များကို ခွဲခြားခြင်း
  const pendingLocations = locations.filter(loc => loc.status === 'pending');
  const approvedLocations = locations.filter(loc => loc.status !== 'pending');

  const handleApprove = async (id) => updateDoc(doc(db, 'dateboys', id), { status: 'approved' });
  const handleReject = async (id) => window.confirm('ဖျက်ပစ်မှာ သေချာပါသလား?') && deleteDoc(doc(db, 'dateboys', id));

  // Admin ကိုယ်တိုင် မြို့နယ် အသစ်ထည့်လျှင် (တိုက်ရိုက် Approved ဖြစ်မည်)
  const handleAddLocation = async (e) => {
    e.preventDefault();
    if(!newCity || !newTownship) return;
    await addDoc(collection(db, 'locations'), { city: newCity, township: newTownship, status: 'approved' });
    setNewTownship('');
  };
  
  const handleApproveLocation = async (id) => updateDoc(doc(db, 'locations', id), { status: 'approved' });
  const handleDeleteLocation = async (id) => window.confirm('ဒီမြို့နယ်ကို ဖျက်မှာ သေချာပါသလား?') && deleteDoc(doc(db, 'locations', id));

  const CardHeader = ({ title, count, icon, colorClass, bgClass }) => (
    <div className={`flex justify-between items-center p-5 border-b border-gray-100 ${bgClass} rounded-t-2xl`}>
      <div className="flex items-center gap-3">{icon}<h3 className={`text-lg font-black ${colorClass}`}>{title}</h3></div>
      <span className={`px-4 py-1 rounded-full text-sm font-bold bg-white shadow-sm ${colorClass}`}>{count}</span>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div><h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">Admin Dashboard</h2><p className="text-gray-500 mt-1 font-medium">စနစ်ထိန်းချုပ်မှု မျက်နှာပြင်</p></div>
        <div className="bg-green-50 px-5 py-2.5 rounded-full border border-green-100 flex items-center gap-3 shadow-inner"><span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span><span className="text-sm font-bold text-green-700">SYSTEM LIVE</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 items-start">
        {/* Pending Date Boys */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full max-h-[75vh]">
          <CardHeader title="အသစ်ဝင်လာသူများ" count={pendingBoys.length} icon={<Clock className="text-orange-500" />} colorClass="text-orange-600" bgClass="bg-orange-50/50" />
          <div className="p-5 space-y-5 overflow-y-auto">
            {pendingBoys.map(boy => (
                <div key={boy.id} className="border border-orange-100 p-5 rounded-2xl bg-white shadow-sm">
                  <h4 className="font-bold text-xl">{boy.name} <span className="text-sm text-gray-500 font-normal">({boy.age} နှစ်)</span></h4>
                  <p className="text-sm text-gray-600 mt-2">📍 {boy.township}, {boy.city} <br/> 📞 {boy.phone}</p>
                  {boy.publicPhoto && <img src={boy.publicPhoto} alt="img" className="w-full h-48 object-cover rounded-xl my-3 border" />}
                  <div className="flex gap-2 mt-2"><button onClick={() => handleApprove(boy.id)} className="flex-1 bg-green-500 text-white py-2 rounded-xl font-bold hover:bg-green-600 transition-colors">လက်ခံမည်</button><button onClick={() => handleReject(boy.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors">ပယ်ဖျက်မည်</button></div>
                </div>
            ))}
          </div>
        </div>

        {/* Approved Date Boys */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full max-h-[75vh]">
          <CardHeader title="လက်ရှိ Date Boys" count={approvedBoys.length} icon={<UserCheck className="text-green-500" />} colorClass="text-green-600" bgClass="bg-green-50/50" />
          <div className="p-5 space-y-4 overflow-y-auto">
            {approvedBoys.map(boy => (
                <div key={boy.id} className="border border-green-100 p-3 rounded-2xl bg-white flex gap-4 items-center shadow-sm">
                   {boy.publicPhoto ? <img src={boy.publicPhoto} alt="img" className="w-14 h-14 object-cover rounded-xl border" /> : <div className="w-14 h-14 bg-gray-100 rounded-xl"></div>}
                   <div className="flex-1"><p className="font-bold text-gray-800">{boy.name}</p><p className="text-sm text-gray-500">{boy.township}, {boy.city}</p></div>
                   <button onClick={() => handleReject(boy.id)} className="text-red-500 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">ဖျက်မည်</button>
                </div>
            ))}
          </div>
        </div>

        {/* Locations Management Column */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full max-h-[75vh]">
          <CardHeader title="မြို့နယ်များ ထိန်းချုပ်ရန်" count={locations.length} icon={<MapPin className="text-blue-500" />} colorClass="text-blue-600" bgClass="bg-blue-50/50" />
          <div className="p-5 flex flex-col h-full overflow-y-auto space-y-6">
            
            <form onSubmit={handleAddLocation} className="flex gap-2">
              <input type="text" value={newCity} onChange={e=>setNewCity(e.target.value)} placeholder="မြို့ (ဥပမာ- ရန်ကုန်)" className="w-1/3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400" required/>
              <input type="text" value={newTownship} onChange={e=>setNewTownship(e.target.value)} placeholder="မြို့နယ်အသစ်" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400" required/>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors"><Plus size={20}/></button>
            </form>

            {/* ⚠️ Request ဝင်လာသော မြို့နယ်များ ⚠️ */}
            {pendingLocations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg inline-block">အတည်ပြုရန် လိုအပ်သော မြို့နယ်အသစ်များ</h4>
                {pendingLocations.map(loc => (
                  <div key={loc.id} className="flex justify-between items-center bg-orange-50/50 p-3 rounded-xl border border-orange-200">
                    <span className="font-bold text-gray-800">{loc.township} <span className="text-xs text-orange-600 font-medium">({loc.city})</span></span>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveLocation(loc.id)} className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 shadow-sm"><CheckCircle2 size={18}/></button>
                      <button onClick={() => handleDeleteLocation(loc.id)} className="bg-red-100 text-red-500 p-2 rounded-lg hover:bg-red-200 shadow-sm"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* လက်ရှိ ရှိပြီးသား မြို့နယ်များ */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-500 border-b pb-2">လက်ရှိ မြို့နယ် စာရင်းများ</h4>
              {approvedLocations.map(loc => (
                <div key={loc.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors">
                  <span className="font-medium text-gray-700">{loc.township} <span className="text-xs text-gray-400">({loc.city})</span></span>
                  <button onClick={() => handleDeleteLocation(loc.id)} className="text-red-400 hover:text-red-600 bg-white p-1.5 rounded-md border shadow-sm"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
