import React, { useState } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { CheckCircle, UploadCloud } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', age: '', phone: '', city: 'Mandalay', township: '', height: '', address: '' });
  const [publicPhoto, setPublicPhoto] = useState('');
  const [privatePhotos, setPrivatePhotos] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageUpload = async (e, setPhotoState) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressedFile = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true });
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => setPhotoState(reader.result);
    } catch (error) {
      alert('ပုံအရွယ်အစား ပြောင်းလဲရာတွင် အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeTerms || !agreePrivacy) return alert('Terms and Conditions များကို သဘောတူညီရန် လိုအပ်ပါသည်။');
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'dateboys'), { ...formData, publicPhoto, privatePhotos, status: 'pending', createdAt: serverTimestamp() });
      setIsSuccess(true);
    } catch (error) {
      alert('အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။ ပြန်လည်ကြိုးစားကြည့်ပါ။');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 text-center px-4 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
          <CheckCircle className="text-green-500 w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-gray-800 mb-3 tracking-tight">အောင်မြင်ပါသည်!</h2>
        <p className="text-gray-500 max-w-sm leading-relaxed">သင့်အချက်အလက်များကို ရရှိပြီးပါပြီ။ Admin မှ စစ်ဆေးပြီးပါက အကြောင်းပြန်ပေးပါမည်။</p>
      </div>
    );
  }

  const InputField = ({ label, type, name, placeholder, value, readOnly }) => (
    <div className="relative group">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">{label}</label>
      <input type={type} name={name} required={!readOnly} readOnly={readOnly} placeholder={placeholder} value={value} onChange={handleChange}
        className={`w-full px-5 py-4 rounded-2xl bg-gray-50/50 border-2 border-gray-100 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none ${readOnly ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        
        {/* Header Gradient matching Logo */}
        <div className="bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <h2 className="text-3xl font-black text-white drop-shadow-sm relative z-10">Date Boy လျှောက်လွှာ</h2>
          <p className="text-white/90 text-sm mt-2 font-medium relative z-10">WE LINK မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField label="အမည်" type="text" name="name" placeholder="သင့်အမည်" />
            <InputField label="အသက်" type="number" name="age" placeholder="ဥပမာ - ၂၅" />
            <InputField label="အရပ်အမြင့်" type="text" name="height" placeholder="ဥပမာ - 5' 9&quot;" />
            <InputField label="ဖုန်းနံပါတ်" type="tel" name="phone" placeholder="09xxxxxxxxx" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField label="မြို့" type="text" name="city" value={formData.city} readOnly />
            <InputField label="မြို့နယ်" type="text" name="township" placeholder="ဥပမာ - ချမ်းအေးသာစံ" />
          </div>
          
          <InputField label="လိပ်စာအပြည့်အစုံ" type="text" name="address" placeholder="အမှတ်၊ လမ်း၊ ရပ်ကွက်..." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors group">
              <UploadCloud className="w-8 h-8 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <label className="block text-sm font-bold text-gray-700 cursor-pointer">
                Public ပုံ ရွေးရန်
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPublicPhoto)} className="hidden" />
              </label>
              {publicPhoto && <span className="text-xs text-green-500 font-bold mt-2 block">✓ ရွေးချယ်ပြီးပါပြီ</span>}
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-colors group">
              <UploadCloud className="w-8 h-8 text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <label className="block text-sm font-bold text-gray-700 cursor-pointer">
                Private ပုံများ ရွေးရန်
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPrivatePhotos)} className="hidden" />
              </label>
              {privatePhotos && <span className="text-xs text-green-500 font-bold mt-2 block">✓ ရွေးချယ်ပြီးပါပြီ</span>}
            </div>
          </div>

          <div className="bg-orange-50/50 rounded-2xl p-5 space-y-3 border border-orange-100/50 mt-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" required checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Date Boy များအတွက် သတ်မှတ်ထားသော Terms and Conditions များကို သဘောတူပါသည်။</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" required checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-1 w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">ကျွန်ုပ်၏ အချက်အလက်များကို Data Privacy Policy အရ အသုံးပြုခွင့်ပေးပါသည်။</span>
            </label>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 transition-all duration-300 text-lg">
            {isSubmitting ? 'စနစ်ထဲသို့ ပေးပို့နေပါသည်...' : 'စာရင်းသွင်းမည်'}
          </button>
        </form>
      </div>
    </div>
  );
}
