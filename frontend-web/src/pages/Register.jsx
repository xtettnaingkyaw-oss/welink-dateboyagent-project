import React, { useState } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { UploadCloud, CheckCircle } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '', age: '', height: '', city: '', township: '', 
    phone: '', address: '', publicPhoto: '', privatePhotos: ''
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ပုံများကို Upload တင်မည့်အစား လောလောဆယ် URL အနေဖြင့် သို့မဟုတ် Data ယူရန်
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [fieldName]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeTerms || !agreePrivacy) {
      alert("စည်းမျဉ်းများနှင့် Privacy Policy ကို သဘောတူရန် လိုအပ်ပါသည်။");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'dateboys'), {
        ...formData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။ ပြန်လည်ကြိုးစားကြည့်ပါ။");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-6 text-center mt-20 animate-fade-in">
        <CheckCircle size={60} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">စာရင်းသွင်းခြင်း အောင်မြင်ပါသည်</h2>
        <p className="text-gray-600">Admin မှ စစ်ဆေးပြီးပါက သင့်ထံ အကြောင်းပြန်ပေးပါမည်။ ကျေးဇူးတင်ပါတယ်။</p>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Date Boy အဖြစ် စာရင်းသွင်းရန်</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Public Information */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-blue-600">အများမြင်နိုင်သော အချက်အလက်များ</h3>
          <input type="text" name="name" placeholder="အမည် (သို့မဟုတ်) နာမည်ဝှက်" required onChange={handleInputChange} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" name="age" placeholder="အသက်" required onChange={handleInputChange} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="text" name="height" placeholder="အရပ်အမြင့် (ဥပမာ 5' 8&quot;)" required onChange={handleInputChange} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" name="city" placeholder="မြို့ (ဥပမာ - မန္တလေး)" required onChange={handleInputChange} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="text" name="township" placeholder="မြို့နယ်" required onChange={handleInputChange} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          
          <div className="mt-2">
            <label className="block text-sm text-gray-600 mb-1">Public ပုံ (၁) ပုံ တင်ရန်</label>
            <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'publicPhoto')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
        </div>

        {/* Private Information (Admin Only) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-red-500 flex items-center gap-2">Admin သီးသန့် အချက်အလက်များ <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full">Private</span></h3>
          <input type="tel" name="phone" placeholder="ဆက်သွယ်ရမည့် ဖုန်းနံပါတ်" required onChange={handleInputChange} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-300" />
          <textarea name="address" placeholder="အသေးစိတ် နေရပ်လိပ်စာ" required onChange={handleInputChange} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-300 h-24" />
          <div className="mt-2">
            <label className="block text-sm text-gray-600 mb-1">Private Gallery အတွက် ပုံများ</label>
            <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'privatePhotos')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
          </div>
        </div>

        {/* Agreements */}
        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-700">Date Boy များအတွက် သတ်မှတ်ထားသော <span className="text-blue-600 underline">Terms and Conditions</span> နှင့် <span className="text-blue-600 underline">Rules and Regulations</span> များကို ဖတ်ရှုသဘောတူပါသည်။</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-1 w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-700">ကျွန်ုပ်၏ အချက်အလက်များကို <span className="text-blue-600 underline">Data Privacy Policy</span> အရ အသုံးပြုခွင့်ပေးပါသည်။</span>
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center gap-2">
          {isSubmitting ? 'ပေးပို့နေပါသည်...' : <><UploadCloud size={20}/> စာရင်းသွင်းမည်</>}
        </button>
      </form>
    </div>
  );
}
