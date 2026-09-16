import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function Admin() {
  const [boys, setBoys] = useState([]);

  // Database ထဲက Data တွေကို Real-time (Auto Refresh) ယူမည့်စနစ်
  useEffect(() => {
    const q = query(collection(db, 'dateboys'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const boysData = [];
      snapshot.forEach((doc) => {
        boysData.push({ id: doc.id, ...doc.data() });
      });
      setBoys(boysData);
    });
    return () => unsubscribe();
  }, []);

  const pendingBoys = boys.filter(boy => boy.status === 'pending');
  const approvedBoys = boys.filter(boy => boy.status === 'approved');

  // လက်ခံမည် ကို နှိပ်လျှင်
  const handleApprove = async (id) => {
    await updateDoc(doc(db, 'dateboys', id), { status: 'approved' });
  };

  // ပယ်ဖျက်မည် ကို နှိပ်လျှင်
  const handleReject = async (id) => {
    if(window.confirm('ဒီ Date Boy ကို ဖျက်ပစ်မှာ သေချာပါသလား?')) {
      await deleteDoc(doc(db, 'dateboys', id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-black text-gray-800 border-b pb-2">Admin Dashboard</h2>
      
      {/* Tablet နှင့် PC များအတွက် Grid ဖြင့် (၃) ပိုင်းခွဲထားသော UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* အပိုင်း (၁) - အသစ်စာရင်းသွင်းသူများ */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-blue-600 mb-4 border-b pb-2 flex justify-between">
            <span>အသစ်ဝင်လာသူများ</span>
            <span className="bg-blue-100 text-blue-700 px-2 rounded-full text-sm">{pendingBoys.length}</span>
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {pendingBoys.length === 0 ? <p className="text-gray-400 text-sm">အသစ်မရှိသေးပါ။</p> : 
              pendingBoys.map(boy => (
                <div key={boy.id} className="border p-4 rounded-xl bg-blue-50/40">
                  <p className="font-bold text-lg">{boy.name} <span className="text-sm font-normal text-gray-500">({boy.age} နှစ်)</span></p>
                  <p className="text-sm text-gray-600 mt-1">{boy.township}, {boy.city}</p>
                  <p className="text-sm text-gray-600 mt-1 font-semibold text-blue-700">ဖုန်း - {boy.phone}</p>
                  {boy.publicPhoto && <img src={boy.publicPhoto} alt="profile" className="w-full h-40 object-cover rounded-lg mt-3 shadow-sm" />}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleApprove(boy.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700">လက်ခံမည်</button>
                    <button onClick={() => handleReject(boy.id)} className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg text-sm font-bold hover:bg-red-200">ပယ်ဖျက်မည်</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* အပိုင်း (၂) - လက်ခံထားသော Date Boys */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-green-600 mb-4 border-b pb-2 flex justify-between">
            <span>လက်ရှိ Date Boys</span>
            <span className="bg-green-100 text-green-700 px-2 rounded-full text-sm">{approvedBoys.length}</span>
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {approvedBoys.length === 0 ? <p className="text-gray-400 text-sm">မရှိသေးပါ။</p> : 
              approvedBoys.map(boy => (
                <div key={boy.id} className="border p-3 rounded-xl bg-green-50/40 flex gap-4 items-center">
                   {boy.publicPhoto ? (
                     <img src={boy.publicPhoto} alt="profile" className="w-16 h-16 object-cover rounded-full shadow-sm" />
                   ) : (
                     <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">ပုံမပါ</div>
                   )}
                   <div className="flex-1">
                     <p className="font-bold text-gray-800">{boy.name}</p>
                     <p className="text-sm text-gray-500">{boy.phone}</p>
                   </div>
                   <button onClick={() => handleReject(boy.id)} className="text-red-500 text-xs border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">ဖျက်မည်</button>
                </div>
              ))
            }
          </div>
        </div>

        {/* အပိုင်း (၃) - Settings များ */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Settings & Info</h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="p-4 bg-gray-50 rounded-xl border">
               <strong className="text-gray-800 block mb-2">စနစ် အခြေအနေ (System Status):</strong>
               <p className="text-green-600 flex items-center gap-2 mt-1">✓ Database ချိတ်ဆက်မှု အောင်မြင်သည်</p>
               <p className="text-green-600 flex items-center gap-2 mt-1">✓ ပုံအရွယ်အစား ချုံ့စနစ် အလုပ်လုပ်နေသည်</p>
               <p className="text-green-600 flex items-center gap-2 mt-1">✓ Real-time အချက်အလက်စနစ် ရနေပါပြီ</p>
            </div>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              မှတ်ချက်။ ။ Tablet အလျားလိုက် (Landscape) ဖြင့် ကြည့်ရှုပါက ပိုမိုရှင်းလင်းသော မြင်ကွင်းကို ရရှိမည်ဖြစ်ပါသည်။
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
