import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { CheckCircle, UploadCloud, Image as ImageIcon } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', age: '', phone: '', city: '', township: '', height: '', address: '' });
  const [customCity, setCustomCity] = useState('');
  const [customTownship, setCustomTownship] = useState('');
  
  const [locations, setLocations] = useState([]);
  
  // 📸 ပုံအများအပြား (Array) လက်ခံရန် State များ
  const [publicPhotos, setPublicPhotos] = useState([]);
  const [privatePhotos, setPrivatePhotos] = useState([]);
  
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

  const activeLocations = locations.filter(l => l.status !== 'pending');
  const cities = [...new Set(activeLocations.map(l => l.city))];
  const townships = activeLocations.filter(l => l.city === formData.city).map(l => l.township);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'city') {
      setFormData(prev => ({ ...prev, township: '' }));
      setCustomTownship('');
    }
  };

  // ပုံအများအပြားကို တစ်ပြိုင်နက် ချုံ့၍ သိမ်းဆည်းမည့် လုပ်ဆောင်ချက်
  const handleMultipleImages = async (e, setPhotoListState) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const compressedImages = [];
    for (const file of files) {
      try {
        const compressedFile = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true });
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(compressedFile);
          reader.onloadend = () => resolve(reader.result);
        });
        compressedImages.push(base64);
      } catch (error) {
        console.error('Compression error:', error);
      }
    }
    setPhotoListState(prev => [...prev, ...compressedImages]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (publicPhotos.length < 3) return alert('Public Profile ပုံ အနည်းဆုံး ၃ ပုံ တင်ပေးရန် လိုအပ်ပါသည်။');
    if (privatePhotos.length < 3) return alert('Private Gallery ပုံ အနည်းဆုံး ၃ ပုံ တင်ပေးရန် လိုအပ်ပါသည်။');
    if (!agreeTerms || !agreePrivacy) return alert('Terms and Conditions များကို သဘောတူညီရန် လိုအပ်ပါသည်။');
    
    let finalCity = formData.city === 'other' ? customCity : formData.city;
    let finalTownship = (formData.city === 'other' || formData.township === 'other') ? customTownship : formData.township;

    if (!finalCity || !finalTownship) return alert('မြို့ နှင့် မြို့နယ်ကို ပြည့်စုံစွာ ထည့်သွင်းပေးပါ။');

    setIsSubmitting(true);
    try {
      if (formData.city === 'other' || formData.township === 'other') {
        const isExist = locations.find(l => l.city === finalCity && l.township === finalTownship);
        if (!isExist) {
          await addDoc(collection(db, 'locations'), { city: finalCity, township: finalTownship, status: 'pending' });
        }
      }

      await addDoc(collection(db, 'dateboys'), { 
        ...formData, city: finalCity, township: finalTownship, 
        publicPhotos, privatePhotos, status: 'pending', createdAt: serverTimestamp() 
      });
      setIsSuccess(true);
    } catch (error) { alert('အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။'); } 
    finally { setIsSubmitting(false); }
  };

  if (isSuccess) return (
    <div className="flex flex-col items-center justify-center pt-24 text-center px-4 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20"><CheckCircle className="text-green-500 w-12 h-12" /></div>
      <h2 className="text-3xl font-black text-gray-800 mb-3 tracking-tight">အောင်မြင်ပါသည်!</h2>
      <p className="text-gray-500 max-w-sm leading-relaxed">သင့်အချက်အလက်များကို ရရှိပြီးပါပြီ။ Admin မှ စစ်ဆေးပြီးပါက အကြောင်းပြန်ပေးပါမည်။</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 p-8 text-center relative overflow-hidden">
          <h2 className="text-3xl font-black text-white drop-shadow-sm">Date Boy လျှောက်လွှာ</h2>
          <p className="text-white/90 text-sm mt-1">ပုံများကို အနည်းဆုံး ၃ ပုံစီ မဖြစ်မနေ တင်ပေးရပါမည်။</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2 ml-1">အမည်</label><input type="text" name="name" required placeholder="သင့်အမည်" onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50/50 border-2 border-gray-100 focus:border-blue-400 focus:bg-white outline-none" /></div>
            <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2 ml-1">အသက်</label><input type="number" name="age" required placeholder="၂၅" onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50/50 border-2 border-gray-100 focus:border-blue-400 focus:bg-white outline-none" /></div>
            <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2 ml-1">အရပ်အမြင့်</label><input type="text" name="height" required placeholder="5' 9&quot;" onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50/50 border-2 border-gray-100 focus:border-blue-400 focus:bg-white outline-none" /></div>
            <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2 ml-1">ဖုန်းနံပါတ်</label><input type="tel" name="phone" required placeholder="09xxxxxxxxx" onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50/50 border-2 border-gray-100 focus:border-blue-400 focus:bg-white outline-none" /></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-blue-50/30 p-5 rounded-3xl border border-blue-50">
            <div className="relative group">
              <label className="block text-xs font-bold text-blue-600 mb-2 ml-1">မြို့ ရွေးချယ်ရန်</label>
              <select name="city" required value={formData.city} onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-blue-100 focus:border-blue-400 outline-none cursor-pointer">
                <option value="">-- မြို့ရွေးပါ --</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="other" className="text-blue-600 font-bold bg-blue-50">➕ အခြား (မြို့အမည် အသစ်ထည့်မည်)</option>
              </select>
              {formData.city === 'other' && <input type="text" placeholder="မြို့အမည် အသစ်..." required value={customCity} onChange={e=>setCustomCity(e.target.value)} className="w-full px-5 py-4 mt-3 rounded-2xl bg-white border-2 border-orange-200 outline-none" />}
            </div>

            <div className="relative group">
              <label className="block text-xs font-bold text-blue-600 mb-2 ml-1">မြို့နယ် ရွေးချယ်ရန်</label>
              {formData.city === 'other' ? (
                <input type="text" placeholder="မြို့နယ်အမည် အသစ်..." required value={customTownship} onChange={e=>setCustomTownship(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-orange-200 outline-none" />
              ) : (
                <>
                  <select name="township" required value={formData.township} onChange={handleChange} disabled={!formData.city} className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-blue-100 outline-none cursor-pointer disabled:opacity-50">
                    <option value="">{formData.city ? '-- မြို့နယ်ရွေးပါ --' : 'အရင်ဆုံး မြို့ကိုရွေးပါ'}</option>
                    {townships.map(t => <option key={t} value={t}>{t}</option>)}
                    {formData.city && <option value="other" className="text-blue-600 font-bold bg-blue-50">➕ အခြား (မြို့နယ်အသစ်ထည့်မည်)</option>}
                  </select>
                  {formData.township === 'other' && <input type="text" placeholder="မြို့နယ်အမည် အသစ်..." required value={customTownship} onChange={e=>setCustomTownship(e.target.value)} className="w-full px-5 py-4 mt-3 rounded-2xl bg-white border-2 border-orange-200 outline-none" />}
                </>
              )}
            </div>
          </div>
          
          <div className="relative group"><label className="block text-xs font-bold text-gray-500 mb-2 ml-1">လိပ်စာအပြည့်အစုံ</label><input type="text" name="address" required placeholder="အမှတ်၊ လမ်း၊ ရပ်ကွက်..." onChange={handleChange} className="w-full px-5 py-4 rounded-2xl bg-gray-50/50 border-2 border-gray-100 outline-none" /></div>

          {/* 📸 Multiple Image Upload Section 📸 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-blue-50 cursor-pointer">
              <UploadCloud className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <label className="block text-sm font-bold text-gray-700 cursor-pointer">Public ပုံများ (အနည်းဆုံး ၃ ပုံ)<input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImages(e, setPublicPhotos)} className="hidden" /></label>
              <span className="text-xs font-bold mt-2 block text-blue-600">တင်ပြီးပမာဏ - {publicPhotos.length} ပုံ</span>
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-purple-50 cursor-pointer">
              <UploadCloud className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <label className="block text-sm font-bold text-gray-700 cursor-pointer">Private ပုံများ (အနည်းဆုံး ၃ ပုံ)<input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImages(e, setPrivatePhotos)} className="hidden" /></label>
              <span className="text-xs font-bold mt-2 block text-purple-600">တင်ပြီးပမာဏ - {privatePhotos.length} ပုံ</span>
            </div>
          </div>

          <div className="bg-orange-50/50 rounded-2xl p-5 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" required onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1" /><span className="text-sm text-gray-600">Terms and Conditions များကို သဘောတူပါသည်။</span></label>
            <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" required onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-1" /><span className="text-sm text-gray-600">Data Privacy Policy အရ အသုံးပြုခွင့်ပေးပါသည်။</span></label>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all text-lg disabled:opacity-50">
            {isSubmitting ? 'ပေးပို့နေပါသည်...' : 'စာရင်းသွင်းမည်'}
          </button>
        </form>
      </div>
    </div>
  );
}
