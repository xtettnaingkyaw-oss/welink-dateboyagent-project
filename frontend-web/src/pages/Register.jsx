import React, { useState } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { CheckCircle } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    city: 'Mandalay',
    township: '',
    height: '',
    address: ''
  });
  
  const [publicPhoto, setPublicPhoto] = useState('');
  const [privatePhotos, setPrivatePhotos] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ပုံအရွယ်အစားကို 300KB အောက်ရောက်အောင် အလိုအလျောက် ချုံ့ပေးမည့် လုပ်ဆောင်ချက်
  const handleImageUpload = async (e, setPhotoState) => {
    const file = e.target.files[0];
    if (!file) return;

    const options = {
      maxSizeMB: 0.3, // အများဆုံး 300 KB သာ လက်ခံမည်
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        setPhotoState(reader.result);
      };
    } catch (error) {
      console.error('Compression error:', error);
      alert('ပုံအရွယ်အစား ပြောင်းလဲရာတွင် အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeTerms || !agreePrivacy) {
      alert('Terms and Conditions များကို သဘောတူညီရန် လိုအပ်ပါသည်။');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'dateboys'), {
        ...formData,
        publicPhoto,
        privatePhotos,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
    } catch (error) {
      console.error('Error:', error);
      alert('အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။ ပြန်လည်ကြိုးစားကြည့်ပါ။');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center px-4">
        <CheckCircle className="text-green-500 w-24 h-24 mb-4" />
        <h2 className="text-2xl font-bold mb-2">စာရင်းသွင်းခြင်း အောင်မြင်ပါသည်</h2>
        <p className="text-gray-600">Admin မှ စစ်ဆေးပြီးပါက သင့်ထံ အကြောင်းပြန်ပေးပါမည်။ ကျေးဇူးတင်ပါတယ်။</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-4">
      <input type="text" name="name" required placeholder="အမည်" className="w-full p-2 border rounded" onChange={handleChange} />
      <input type="number" name="age" required placeholder="အသက်" className="w-full p-2 border rounded" onChange={handleChange} />
      <input type="text" name="height" required placeholder="အရပ်အမြင့်" className="w-full p-2 border rounded" onChange={handleChange} />
      <input type="tel" name="phone" required placeholder="ဖုန်းနံပါတ်" className="w-full p-2 border rounded" onChange={handleChange} />
      
      <input type="text" name="city" value={formData.city} readOnly className="w-full p-2 border rounded bg-gray-100 text-gray-600" />
      <input type="text" name="township" required placeholder="မြို့နယ်" className="w-full p-2 border rounded" onChange={handleChange} />
      <textarea name="address" required placeholder="လိပ်စာအပြည့်အစုံ" className="w-full p-2 border rounded" onChange={handleChange}></textarea>

      <div className="border p-4 rounded bg-white">
        <label className="block mb-2 text-sm font-medium">Public Profile အတွက် ပုံ:</label>
        <input type="file" accept="image/*" required onChange={(e) => handleImageUpload(e, setPublicPhoto)} className="w-full text-sm" />
      </div>

      <div className="border p-4 rounded bg-white">
        <label className="block mb-2 text-sm font-medium">Private Gallery အတွက် ပုံများ:</label>
        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPrivatePhotos)} className="w-full text-sm" />
      </div>

      <div className="space-y-2 bg-gray-50 p-4 rounded text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" required checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1" />
          <span>Date Boy များအတွက် သတ်မှတ်ထားသော Terms and Conditions နှင့် Rules and Regulations များကို ဖတ်ရှုသဘောတူပါသည်။</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" required checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-1" />
          <span>ကျွန်ုပ်၏ အချက်အလက်များကို Data Privacy Policy အရ အသုံးပြုခွင့်ပေးပါသည်။</span>
        </label>
      </div>

      <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
        {isSubmitting ? 'ပေးပို့နေပါသည်...' : 'ပေးပို့မည်'}
      </button>
    </form>
  );
}
