import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserCheck, Clock, ShieldAlert } from 'lucide-react';

export default function Admin() {
  const [boys, setBoys] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'dateboys'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBoys(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const pendingBoys = boys.filter(boy => boy.status === 'pending');
  const approvedBoys = boys.filter(boy => boy.status === 'approved');

  const handleApprove = async (id) => updateDoc(doc(db, 'dateboys', id), { status: 'approved' });
  const handleReject = async (id) => window.confirm('ဖျက်ပစ်မှာ သေချာပါသလား?') && deleteDoc(doc(db, 'dateboys', id));

  const CardHeader = ({ title, count, icon, colorClass, bgClass }) => (
    <div className={`flex justify-between items-center p-5 border-b border-gray-100 ${bgClass} rounded-t-2xl`}>
      <div className="flex items-center gap-3">
        {icon}
        <h3 className={`text-lg font-black ${colorClass}`}>{title}</h3>
      </div>
      <span className={`px-4 py-1 rounded-full text-sm font-bold bg-white shadow-sm ${colorClass}`}>{count}</span>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">Admin Dashboard</h2>
          <p className="text-gray-500 mt-1 font-medium">စနစ်ထိန်းချုပ်မှု မျက်နှာပြင်</p>
        </div>
        <div className="bg-green-50 px-5 py-2.5 rounded-full border border-green-100 flex items-center gap-3 shadow-inner">
          <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
          <span className="text-sm font-bold text-green-700 tracking-wide">SYSTEM LIVE</span>
        </div>
      </div>

      {/* Responsive Grid: 1 col on mobile, 2 on tablet portrait, 3 on large tablet/PC */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 items-start">
        
        {/* Pending Column */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col h-full">
          <CardHeader title="အသစ်ဝင်လာသူများ" count={pendingBoys.length} icon={<Clock className="text-orange-500" />} colorClass="text-orange-600" bgClass="bg-orange-50/50" />
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {pendingBoys.length === 0 ? <p className="text-gray-400 text-center py-10">အသစ်မရှိသေးပါ</p> : 
              pendingBoys.map(boy => (
                <div key={boy.id} className="border border-orange-100 p-5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-xl text-gray-800">{boy.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{boy.age} နှစ် • {boy.height}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl text-sm space-y-2 mb-4 border border-gray-100">
                    <p className="text-gray-700">📍 {boy.township}, {boy.city}</p>
                    <p className="text-blue-600 font-bold">📞 {boy.phone}</p>
                  </div>
                  {boy.publicPhoto && <img src={boy.publicPhoto} alt="profile" className="w-full h-48 object-cover rounded-xl mb-4 border border-gray-200" />}
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(boy.id)} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 shadow-lg shadow-green-500/20 active:scale-95 transition-all">လက်ခံမည်</button>
                    <button onClick={() => handleReject(boy.id)} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 active:scale-95 transition-all">ပယ်ဖျက်မည်</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Approved Column */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col h-full">
          <CardHeader title="လက်ရှိ Date Boys" count={approvedBoys.length} icon={<UserCheck className="text-green-500" />} colorClass="text-green-600" bgClass="bg-green-50/50" />
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {approvedBoys.length === 0 ? <p className="text-gray-400 text-center py-10">မရှိသေးပါ</p> : 
              approvedBoys.map(boy => (
                <div key={boy.id} className="border border-green-100 p-4 rounded-2xl bg-white hover:bg-green-50/30 transition-colors flex gap-4 items-center group shadow-sm">
                   {boy.publicPhoto ? (
                     <img src={boy.publicPhoto} alt="profile" className="w-16 h-16 object-cover rounded-2xl shadow-sm border border-gray-100" />
                   ) : (
                     <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-xs text-gray-400">ပုံမပါ</div>
                   )}
                   <div className="flex-1">
                     <p className="font-bold text-gray-800 text-lg">{boy.name}</p>
                     <p className="text-sm text-gray-500 font-medium">{boy.phone}</p>
                   </div>
                   <button onClick={() => handleReject(boy.id)} className="opacity-0 group-hover:opacity-100 text-red-500 text-sm font-bold bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-all">ဖျက်မည်</button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Settings Column */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col h-full">
          <CardHeader title="Settings & Info" count="Active" icon={<ShieldAlert className="text-purple-500" />} colorClass="text-purple-600" bgClass="bg-purple-50/50" />
          <div className="p-5">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200">
               <strong className="text-gray-800 block mb-4 text-lg">System Status</strong>
               <div className="space-y-4">
                 <div className="flex items-center gap-3 text-gray-700 bg-white p-3 rounded-xl shadow-sm border border-gray-50">
                   <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><span className="text-green-600">✓</span></div>
                   <span className="font-medium text-sm">Database ချိတ်ဆက်မှု အောင်မြင်သည်</span>
                 </div>
                 <div className="flex items-center gap-3 text-gray-700 bg-white p-3 rounded-xl shadow-sm border border-gray-50">
                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-blue-600">✓</span></div>
                   <span className="font-medium text-sm">ပုံအရွယ်အစား ချုံ့စနစ် အလုပ်လုပ်နေသည်</span>
                 </div>
                 <div className="flex items-center gap-3 text-gray-700 bg-white p-3 rounded-xl shadow-sm border border-gray-50">
                   <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><span className="text-purple-600">✓</span></div>
                   <span className="font-medium text-sm">Real-time အချက်အလက်စနစ် ရနေပါပြီ</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
