import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { Check, X, ShieldAlert } from 'lucide-react';

export default function Admin() {
  const [pendingBoys, setPendingBoys] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'dateboys'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const boys = [];
      querySnapshot.forEach((doc) => {
        boys.push({ id: doc.id, ...doc.data() });
      });
      setPendingBoys(boys);
    } catch (error) {
      console.error("Error fetching pending:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id) => {
    if (window.confirm("ဤ Date Boy ကို Approve လုပ်မည်မှာ သေချာပါသလား?")) {
      try {
        await updateDoc(doc(db, 'dateboys', id), { status: 'approved' });
        fetchPending(); // Refresh list
      } catch (error) {
        alert("Error approving document.");
      }
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("ပယ်ချရသည့် အကြောင်းပြချက်ကို ရိုက်ထည့်ပါ (Reject Reason):");
    if (reason !== null) { // User didn't click Cancel
      try {
        await updateDoc(doc(db, 'dateboys', id), { 
          status: 'rejected', 
          rejectReason: reason 
        });
        fetchPending(); // Refresh list
      } catch (error) {
        alert("Error rejecting document.");
      }
    }
  };

  return (
    <div className="p-4 animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Admin Control Panel</h2>
      
      {/* Tabs Placeholder */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap">New Registrations</button>
        <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap">Manage Boys</button>
        <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap">Settings & Pricing</button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 mt-10">ဒေတာများ ဆွဲယူနေပါသည်...</div>
      ) : pendingBoys.length === 0 ? (
        <div className="bg-white p-6 rounded-xl text-center text-gray-500 shadow-sm border border-gray-100">
          အသစ် စာရင်းသွင်းထားသူ မရှိသေးပါ။
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBoys.map(boy => (
            <div key={boy.id} className="bg-white p-4 rounded-xl shadow-sm border border-orange-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{boy.name} <span className="text-sm font-normal text-gray-500">({boy.age} နှစ်)</span></h3>
                  <p className="text-sm text-gray-600">{boy.township}, {boy.city}</p>
                </div>
                <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-1 rounded-full font-bold">Pending</span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2 mb-4">
                <p className="text-red-500 font-semibold flex items-center gap-1"><ShieldAlert size={14}/> Admin Only Info:</p>
                <p><strong>ဖုန်းနံပါတ်:</strong> {boy.phone}</p>
                <p><strong>လိပ်စာ:</strong> {boy.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => handleApprove(boy.id)} className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg flex justify-center items-center gap-1 font-semibold">
                  <Check size={18}/> လက်ခံမည် (Approve)
                </button>
                <button onClick={() => handleReject(boy.id)} className="bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex justify-center items-center gap-1 font-semibold">
                  <X size={18}/> ပယ်ချမည် (Reject)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
