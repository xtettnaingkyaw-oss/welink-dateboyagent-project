import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { CheckCircle, UploadCloud } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', age: '', phone: '', city: '', township: '', height: '', address: '' });
  const [locations, setLocations] = useState([]);
  const [publicPhoto, setPublicPhoto] = useState('');
  const [privatePhotos, setPrivatePhotos] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      const snap = await getDocs(collection(db, 'locations'));
      setLocations(snap.docs.map(doc => doc.data()));
    };
    fetchLocations();
  }, []);

  const cities = [...new Set(locations.map(l => l.city))];
  const townships = locations.filter(l => l.city === formData.city).map(l => l.township);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageUpload = async (e, setPhotoState) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressedFile = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true });
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => setPhotoState(reader.result);
    } catch (error) { alert('ပုံအရွယ်အစား ပြောင်းလဲရာတွင် အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.city || !formData.township) return alert('မြို့ နှင့် မြို့နယ်ကို ရွေးချယ်ပေးပါ။');
    if (!agreeTerms || !agreePrivacy) return alert('Terms and Conditions များကို သဘောတူညီရန် လိုအပ်ပါသည်။');
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'dateboys'), { ...formData, publicPhoto, privatePhotos, status: 'pending', createdAt: serverTimestamp() });
      setIsSuccess(true);
    } catch (error) { alert('အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။'); } 
    finally { setIsSubmitting(false); }
  };

  if (isSuccess) return ( /* အောင်မြင်ကြောင်း စာမျက်နှာ အတူတူပင် */
    <div className="flex flex-col items-center justify-center pt-24 text-center px-4 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"><CheckCircle className="text-green-500 w-12 h-12" /></div>
      <h2 className="text-3xl font-black text-gray-800 mb-3">အောင်မြင်ပါသည်!</h2>
      <p className="text-gray-500 max-w-sm">သင့်အချက်အလက်များကို ရရှိပြီးပါပြီ။</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 p-8 text-center">
          <h2 className="text-3xl font-black text-white drop-shadow-sm">Date Boy လျှောက်လွှာ</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2">အမည်</label><input type="text" name="name" required placeholder="သင့်အမည်" onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-400 outline-none" /></div>
            <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2">အသက်</label><input type="number" name="age" required placeholder="၂၅" onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-400 outline-none" /></div>
            <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2">အရပ်အမြင့်</label><input type="text" name="height" required placeholder="5' 9&quot;" onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-400 outline-none" /></div>
            <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2">ဖုန်းနံပါတ်</label><input type="tel" name="phone" required placeholder="09xxxxxxxxx" onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-400 outline-none" /></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="relative group">
              <label className="block text-xs font-bold text-gray-500 mb-2">မြို့ ရွေးချယ်ရန်</label>
              <select name="city" required value={formData.city} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-400 outline-none appearance-none">
                <option value="">-- မြို့ရွေးပါ --</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="relative group">
              <label className="block text-xs font-bold text-gray-500 mb-2">မြို့နယ် ရွေးချယ်ရန်</label>
              <select name="township" required value={formData.township} onChange={handleChange} disabled={!formData.city} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-400 outline-none appearance-none disabled:opacity-50">
                <option value="">{formData.city ? '-- မြို့နယ်ရွေးပါ --' : 'အရင်ဆုံး မြို့ကိုရွေးပါ'}</option>
                {townships.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          
          <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2">လိပ်စာအပြည့်အစုံ</label><input type="text" name="address" required placeholder="အမှတ်၊ လမ်း၊ ရပ်ကွက်..." onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-400 outline-none" /></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-blue-50 cursor-pointer">
              <UploadCloud className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <label className="block text-sm font-bold text-gray-700 cursor-pointer">Public ပုံ ရွေးရန်<input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPublicPhoto)} className="hidden" /></label>
              {publicPhoto && <span className="text-xs text-green-500 font-bold mt-2 block">✓ ရွေးပြီးပါပြီ</span>}
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-purple-50 cursor-pointer">
              <UploadCloud className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <label className="block text-sm font-bold text-gray-700 cursor-pointer">Private ပုံများ ရွေးရန်<input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPrivatePhotos)} className="hidden" /></label>
              {privatePhotos && <span className="text-xs text-green-500 font-bold mt-2 block">✓ ရွေးပြီးပါပြီ</span>}
            </div>
          </div>

          <div className="bg-orange-50/50 rounded-2xl p-5 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" required onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1" /><span className="text-sm text-gray-600">Terms and Conditions များကို သဘောတူပါသည်။</span></label>
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" required onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-1" /><span className="text-sm text-gray-600">Data Privacy Policy အရ အသုံးပြုခွင့်ပေးပါသည်။</span></label>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all text-lg">
            {isSubmitting ? 'ပေးပို့နေပါသည်...' : 'စာရင်းသွင်းမည်'}
          </button>
        </form>
      </div>
    </div>
  );
}
