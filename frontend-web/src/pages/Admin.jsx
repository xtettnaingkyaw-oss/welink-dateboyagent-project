import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserCheck, Clock, Plus, Trash2, CheckCircle2, Settings, Eye, Pencil, EyeOff, Save, X, CreditCard, FileText, KeyRound, Smartphone, MapPin, Ruler, Activity, Lock, Shield, LogOut } from 'lucide-react';

const DateBoyCard = ({ boy, isPending, editingBoyId, editBoyData, setEditBoyData, setEditingBoyId, saveEditedBoy, handleApprove, handleDeleteDateBoy, handleToggleVisibility, startEditBoy, setModalImage }) => {
  const pPhotos = Array.isArray(boy.publicPhotos) ? boy.publicPhotos : (boy.publicPhoto ? [boy.publicPhoto] : []);
  const prPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : (boy.privatePhotos ? [boy.privatePhotos] : []);
  const isEditing = editingBoyId === boy.id;
  const boyCode = `WLDB-${boy.id.substring(0, 5).toUpperCase()}`; 

  return (
    <div className={`bg-white border ${boy.status === 'hidden' ? 'border-slate-200 opacity-60' : isPending ? 'border-orange-200 shadow-orange-100/50' : 'border-slate-100 shadow-slate-200/40'} p-4 sm:p-6 rounded-3xl shadow-lg flex flex-col justify-between relative transition-all hover:shadow-xl`}>
      {boy.status === 'hidden' && <div className="absolute top-4 right-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 z-10 font-medium"><EyeOff size={14}/> ဖျောက်ထားသည်</div>}
      
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-3 mb-5 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
            <input type="text" value={editBoyData.name || ''} onChange={e=>setEditBoyData({...editBoyData, name: e.target.value})} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="အမည်" />
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={editBoyData.age || ''} onChange={e=>setEditBoyData({...editBoyData, age: e.target.value})} className="w-full sm:w-1/2 p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="အသက်" />
              <input type="text" value={editBoyData.height || ''} onChange={e=>setEditBoyData({...editBoyData, height: e.target.value})} className="w-full sm:w-1/2 p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="အရပ်" />
            </div>
            <input type="text" value={editBoyData.cockSize || ''} onChange={e=>setEditBoyData({...editBoyData, cockSize: e.target.value})} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Cock Size" />
            <input type="text" value={editBoyData.phone || ''} onChange={e=>setEditBoyData({...editBoyData, phone: e.target.value})} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="ဖုန်း" />
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={editBoyData.city || ''} onChange={e=>setEditBoyData({...editBoyData, city: e.target.value})} className="w-full sm:w-1/2 p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="မြို့" />
              <input type="text" value={editBoyData.township || ''} onChange={e=>setEditBoyData({...editBoyData, township: e.target.value})} className="w-full sm:w-1/2 p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="မြို့နယ်" />
            </div>
            <input type="text" value={editBoyData.address || ''} onChange={e=>setEditBoyData({...editBoyData, address: e.target.value})} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="လိပ်စာ" />
          </div>
        ) : (
          <>
            <div className="flex flex-col mb-4 mt-2">
              <h4 className="font-bold text-xl sm:text-2xl text-slate-800 flex items-center flex-wrap gap-2">
                {boy.name} 
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg tracking-wide">{boyCode}</span>
              </h4>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-500 mt-2 font-medium">
                <span className="flex items-center gap-1"><UserCheck size={14}/> {boy.age} နှစ်</span>
                <span className="flex items-center gap-1"><Ruler size={14}/> {boy.height}</span>
                <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md"><Activity size={14}/> {boy.cockSize || 'N/A'}</span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl text-xs sm:text-sm mb-5 border border-slate-100 space-y-2">
              <p className="text-slate-700 font-medium flex items-center gap-2"><MapPin size={16} className="text-blue-500 flex-shrink-0"/> {boy.township}, {boy.city}</p>
              <p className="text-slate-700 font-medium flex items-center gap-2"><Smartphone size={16} className="text-green-500 flex-shrink-0"/> {boy.phone}</p>
              <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200 leading-relaxed truncate" title={boy.address}>{boy.address}</p>
            </div>
          </>
        )}

        <div className="mb-5 space-y-4">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Public ပုံများ ({pPhotos.length})</span>
            <div className="grid grid-cols-3 gap-2">
              {pPhotos.map((img, idx) => (
                <div key={idx} className="relative group cursor-pointer aspect-square" onClick={() => setModalImage(img)}>
                  <img src={img} alt="pub" className="w-full h-full object-cover rounded-xl border border-slate-200 transition-opacity group-hover:opacity-80" />
                  <div className="absolute inset-0 bg-slate-900/30 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><Eye size={18} /></div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-purple-500 uppercase tracking-wider block mb-2">🔒 Private ပုံများ ({prPhotos.length})</span>
            <div className="grid grid-cols-3 gap-2">
              {prPhotos.map((img, idx) => (
                <div key={idx} className="relative group cursor-pointer aspect-square" onClick={() => setModalImage(img)}>
                  <img src={img} alt="priv" className="w-full h-full object-cover rounded-xl border-2 border-purple-200 transition-opacity group-hover:opacity-80" />
                  <div className="absolute inset-0 bg-purple-900/30 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><Eye size={18} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {boy.privateVideo && (
          <div className="mb-6">
            <span className="text-[10px] sm:text-xs font-bold text-rose-500 uppercase tracking-wider block mb-2">🎬 Private Video</span>
            <a href={boy.privateVideo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs sm:text-sm bg-rose-50 text-rose-600 px-3 sm:px-4 py-2 rounded-xl font-bold border border-rose-100 hover:bg-rose-100 transition-colors">
              <Eye size={16}/> Video ကြည့်ရန်
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t border-slate-100">
        {isPending ? (
          <>
            <button onClick={() => handleApprove(boy.id)} className="flex-1 w-full sm:w-auto bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm shadow-sm">လက်ခံမည် (Approve)</button>
            <button onClick={() => handleDeleteDateBoy(boy.id)} className="flex-1 w-full sm:w-auto bg-rose-50 text-rose-600 py-3 rounded-xl font-bold hover:bg-rose-100 transition-colors text-sm border border-rose-100">ပယ်ချမည် (Reject)</button>
          </>
        ) : (
          isEditing ? (
            <div className="w-full flex flex-col sm:flex-row gap-2">
              <button onClick={() => saveEditedBoy(boy.id)} className="flex-1 w-full sm:w-auto bg-green-500 text-white py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 hover:bg-green-600 transition-colors"><Save size={16}/> သိမ်းမည်</button>
              <button onClick={() => setEditingBoyId(null)} className="w-full sm:w-auto bg-slate-100 text-slate-600 py-3 px-5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 hover:bg-slate-200 transition-colors"><X size={16}/> ပယ်ဖျက်</button>
            </div>
          ) : (
            <>
              <button onClick={() => startEditBoy(boy)} className="flex-1 w-full sm:w-auto bg-slate-50 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-100 border border-slate-200 text-sm flex justify-center items-center gap-2 transition-colors"><Pencil size={16}/> ပြင်မည်</button>
              <button onClick={() => handleToggleVisibility(boy)} className={`flex-1 w-full sm:w-auto py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-colors border ${boy.status === 'hidden' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                {boy.status === 'hidden' ? <><Eye size={16}/> ပြန်ဖော်မည်</> : <><EyeOff size={16}/> ဖျောက်ထားမည်</>}
              </button>
              <button onClick={() => handleDeleteDateBoy(boy.id)} className="w-full sm:w-auto bg-rose-50 text-rose-500 py-3 px-4 rounded-xl hover:bg-rose-100 border border-rose-100 transition-colors text-sm flex justify-center items-center"><Trash2 size={18}/></button>
            </>
          )
        )}
      </div>
    </div>
  );
};

export default function Admin() {
  const [loggedInAdmin, setLoggedInAdmin] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [adminUsers, setAdminUsers] = useState([]);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('sub_admin');
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPass, setEditAdminPass] = useState('');
  const [editAdminRole, setEditAdminRole] = useState('sub_admin');

  const [activeTab, setActiveTab] = useState('requests');
  const [boys, setBoys] = useState([]);
  const [locations, setLocations] = useState([]);
  const [clientIds, setClientIds] = useState([]);
  
  const [newCity, setNewCity] = useState('');
  const [newTownship, setNewTownship] = useState('');
  const [modalImage, setModalImage] = useState(null);
  const [editingLocId, setEditingLocId] = useState(null);
  const [editCity, setEditCity] = useState('');
  const [editTownship, setEditTownship] = useState('');
  const [editingBoyId, setEditingBoyId] = useState(null);
  const [editBoyData, setEditBoyData] = useState({});

  const [appConfig, setAppConfig] = useState({
    paymentInfo: '', privFee: 0, feeSec: 0, feeDay: 0, feeNight: 0, clientIdFee: 0,
    reqText: '', ruleText: ''
  });
  const [isConfigSaving, setIsConfigSaving] = useState(false);

  useEffect(() => {
    const savedAdmin = localStorage.getItem('weLinkAdmin');
    if (savedAdmin) setLoggedInAdmin(JSON.parse(savedAdmin));

    const initDefaultAdmin = async () => {
      const snap = await getDocs(collection(db, 'admin_users'));
      if (snap.empty) {
        await addDoc(collection(db, 'admin_users'), {
          username: 'admin', password: 'adminpassword', role: 'super_admin', createdAt: serverTimestamp()
        });
      }
    };
    initDefaultAdmin();

    const unsubAdmins = onSnapshot(query(collection(db, 'admin_users')), (snap) => setAdminUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubBoys = onSnapshot(query(collection(db, 'dateboys')), (snap) => setBoys(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubLocs = onSnapshot(query(collection(db, 'locations')), (snap) => setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubClients = onSnapshot(query(collection(db, 'client_ids')), (snap) => setClientIds(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubConfig = onSnapshot(doc(db, 'settings', 'app_config'), (docSnap) => {
      if (docSnap.exists()) setAppConfig(prev => ({ ...prev, ...docSnap.data() }));
    });
    return () => { unsubAdmins(); unsubBoys(); unsubLocs(); unsubClients(); unsubConfig(); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const q = query(collection(db, 'admin_users'), where('username', '==', loginUser.trim()), where('password', '==', loginPass.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const adminData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setLoggedInAdmin(adminData);
        localStorage.setItem('weLinkAdmin', JSON.stringify(adminData));
      } else {
        setLoginError('Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။');
      }
    } catch (err) { setLoginError('ချိတ်ဆက်မှု ပြဿနာဖြစ်ပွားနေပါသည်။'); }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    setLoggedInAdmin(null);
    localStorage.removeItem('weLinkAdmin');
    setLoginUser('');
    setLoginPass('');
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    const exists = adminUsers.find(a => a.username === newAdminName.trim());
    if (exists) return alert('ဤ Username အား အသုံးပြုပြီးဖြစ်ပါသည်!');
    await addDoc(collection(db, 'admin_users'), { username: newAdminName.trim(), password: newAdminPass.trim(), role: newAdminRole, createdAt: serverTimestamp() });
    setNewAdminName(''); setNewAdminPass(''); setNewAdminRole('sub_admin');
  };

  const handleDeleteAdmin = async (id) => {
    if (window.confirm('ဤ Admin အကောင့်အား ဖျက်ပစ်မှာ သေချာပါသလား?')) await deleteDoc(doc(db, 'admin_users', id));
  };

  const startEditAdmin = (admin) => {
    setEditingAdminId(admin.id); setEditAdminName(admin.username); setEditAdminPass(admin.password); setEditAdminRole(admin.role);
  };

  const saveEditAdmin = async (id) => {
    const exists = adminUsers.find(a => a.username === editAdminName.trim() && a.id !== id);
    if (exists) return alert('ဤ Username အား အသုံးပြုပြီးဖြစ်ပါသည်!');
    await updateDoc(doc(db, 'admin_users', id), { username: editAdminName.trim(), password: editAdminPass.trim(), role: editAdminRole });
    setEditingAdminId(null);
  };

  const pendingBoys = boys.filter(boy => boy.status === 'pending');
  const approvedBoys = boys.filter(boy => boy.status === 'approved' || boy.status === 'hidden');
  const pendingLocations = locations.filter(loc => loc.status === 'pending');
  const approvedLocations = locations.filter(loc => loc.status !== 'pending');

  // 🚀 System ထဲမှာ ရှိပြီးသား မြို့အမည်တွေကို ထုတ်ယူထားခြင်း
  const uniqueCities = [...new Set(approvedLocations.map(l => l.city).filter(Boolean))];
  const uniqueTownships = [...new Set(approvedLocations.map(l => l.township).filter(Boolean))];

  const handleApprove = async (id) => {
    const boy = boys.find(b => b.id === id);
    const boyCode = `WLDB-${id.substring(0, 5).toUpperCase()}`; 
    await updateDoc(doc(db, 'dateboys', id), { status: 'approved' });
    if (boy && boy.telegramChatId) {
      const approveMsg = `🎉 ကျေးဇူးတင်ပါတယ်။ သတ်မှတ်အရည်အချင်းများနှင့် ပြည့်စုံကိုက်ညီသောကြောင့် သင့်အား WE LINK ၏ Date Boy စာရင်းထဲသို့ ပေါင်းထည့်ပေးလိုက်ပါပြီ။\n\n📌 သင့်၏ Date Boy ID မှာ: <code>${boyCode}</code> ဖြစ်ပါသည်။ Privacy အရ သင်၏ အမည်အရင်းကို ဧည့်သည်အားပြသမည်မဟုတ်သောကြောင့် ယခု ID အား သေချာစွာမှတ်သားထားပေးပါ။\n\nမန္တလေးမြို့တွင်းဆိုရင် ချက်ချင်း(သို့မဟုတ်) (၁)ရက် (၂) ရက်အတွင်းရရှိနိုင်ပြီး အခြားမြို့များကဆိုရင် အနည်းဆုံး (၁)ပတ်ကနေ ဧည့်သည်အခြေအနေပေါ်မူတည်ပြီး စောင့်ရနိုင်ပါသည်။\n\nအထူးသတိပြုရန်မှာ Date Boy စာရင်းသို့ပေါင်းထည့်လိုက်ပြီး ခေါ်ယူလိုသည့်ဧည့်သည်များကို ပြသသည့်စာရင်းထဲတွင် ပါဝင်ပြီးဖြစ်သော်လည်း အလုပ်ရရှိရန်အတွက် မိမိအား ခေါ်ယူမည့် ဧည့်သည်ကြိုက်ရန်လည်း လိုအပ်ပါသေးသည်။\n\nလုပ်ငန်းလိုအပ်ချက်အရ အပြင်လူတွေ့ အင်တာဗျူးရန် လိုအပ်ပါက နေရာနှင့် အချိန်အသေးစိတ်ကို Admin မှ ပြန်လည်ဆက်သွယ်ပေးသွားပါမည်။`;
      fetch('/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ internal_action: 'notify_user', chatId: boy.telegramChatId, text: approveMsg, useMenu: true }) }).catch(e => console.error(e));
    }
  };

  const handleDeleteDateBoy = async (id) => {
    const reasonInput = window.prompt("ပယ်ချရသည့် အကြောင်းရင်းကို ရွေးပါ-\n1 = အရည်အချင်းမကိုက်ညီခြင်း\n2 = ပုံ/Video များအဆင်မပြေခြင်း (ပြန်တင်ရန်)\n3 = ရုပ်ရည်/ခန္ဓာကိုယ် အဆင်မပြေခြင်း\n(Cancel နှိပ်ပါက ရိုးရိုးပယ်ချမည်)");
    if (reasonInput === null && !window.confirm('ရိုးရိုးပယ်ချမှာ သေချာပါသလား?')) return;
    
    let reasonMsg = "❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို အောက်ပါအကြောင်းရင်းကြောင့် ပယ်ချလိုက်ပါသည် -\n\n";
    if (reasonInput === '1') reasonMsg += "👉 <b>သတ်မှတ်အရည်အချင်းများနှင့် မကိုက်ညီခြင်း</b>";
    else if (reasonInput === '2') reasonMsg += "👉 <b>ပေးပို့ထားသောပုံများ နှင့် Video အဆင်မပြေခြင်း</b>\n(ကျေးဇူးပြု၍ ပုံများနှင့် Video ကို အသစ်ပြန်လည်စီစဉ်ပြီး အစကနေ ပြန်တင်ပေးပါ ခင်ဗျာ)";
    else if (reasonInput === '3') reasonMsg += "👉 <b>ရုပ်ရည်နှင့် ခန္ဓာကိုယ်အချိုးအစား လုပ်ငန်းလိုအပ်ချက်နှင့် အဆင်မပြေခြင်း</b>";
    else reasonMsg = "❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို ပယ်ချလိုက်ပါသည်။";

    const boy = boys.find(b => b.id === id);
    if (boy && boy.status === 'pending' && boy.telegramChatId) {
      fetch('/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ internal_action: 'notify_user', chatId: boy.telegramChatId, text: reasonMsg, useMenu: true }) }).catch(e => console.error(e));
    }
    await deleteDoc(doc(db, 'dateboys', id));
  };

  const handleDeleteClientId = async (id) => { if (window.confirm('ဤ Client ID ကို ပယ်ဖျက်မှာ သေချာပါသလား?')) await deleteDoc(doc(db, 'client_ids', id)); };
  const handleToggleVisibility = async (boy) => updateDoc(doc(db, 'dateboys', boy.id), { status: boy.status === 'hidden' ? 'approved' : 'hidden' });
  const startEditBoy = (boy) => { setEditingBoyId(boy.id); setEditBoyData({ name: boy.name, age: boy.age, height: boy.height, cockSize: boy.cockSize || '', phone: boy.phone, city: boy.city, township: boy.township, address: boy.address }); };
  const saveEditedBoy = async (id) => { await updateDoc(doc(db, 'dateboys', id), editBoyData); setEditingBoyId(null); };

  const handleAddLocation = async (e) => { e.preventDefault(); if(!newCity || !newTownship) return; await addDoc(collection(db, 'locations'), { city: newCity.trim(), township: newTownship.trim(), status: 'approved' }); setNewTownship(''); setNewCity(''); };
  const startEditLocation = (loc) => { setEditingLocId(loc.id); setEditCity(loc.city); setEditTownship(loc.township); };
  
  const saveEditedLocation = async (loc) => {
    await updateDoc(doc(db, 'locations', loc.id), { city: editCity.trim(), township: editTownship.trim(), status: 'approved' });
    const qBoys = query(collection(db, 'dateboys'), where('city', '==', loc.city), where('township', '==', loc.township));
    const snap = await getDocs(qBoys);
    snap.forEach(async (d) => { await updateDoc(doc(db, 'dateboys', d.id), { city: editCity.trim(), township: editTownship.trim() }); });
    setEditingLocId(null);
  };
  const handleApproveLocation = async (id) => updateDoc(doc(db, 'locations', id), { status: 'approved' });
  const handleDeleteLocation = async (id) => window.confirm('ဖျက်မှာ သေချာပါသလား?') && deleteDoc(doc(db, 'locations', id));

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsConfigSaving(true);
    await setDoc(doc(db, 'settings', 'app_config'), appConfig, { merge: true });
    setIsConfigSaving(false);
    alert('ဆက်တင်များ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။');
  };

  if (!loggedInAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border border-indigo-100">
              <Lock className="text-indigo-600" size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-800">Admin Login</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium text-center">We Link Dating Agency</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Username</label>
              <input type="text" value={loginUser} onChange={e=>setLoginUser(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="Username ထည့်ပါ..." required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Password</label>
              <input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="Password ထည့်ပါ..." required />
            </div>
            {loginError && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 p-2 rounded-lg">{loginError}</p>}
            <button type="submit" disabled={isLoggingIn} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 flex items-center justify-center gap-2 mt-2">
              {isLoggingIn ? 'ဝင်ရောက်နေသည်...' : 'စနစ်တွင်းသို့ ဝင်မည်'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const TabButton = ({ tab, icon: Icon, label, count }) => {
    const isActive = activeTab === tab;
    return (
      <button onClick={() => setActiveTab(tab)} className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap min-w-[140px] sm:min-w-fit ${isActive ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>
        <Icon size={18} className={isActive ? 'text-indigo-500' : 'text-slate-400'} />
        {label}
        {count > 0 && <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm/50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">Admin Portal</h1>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1 sm:gap-2">
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${loggedInAdmin.role === 'super_admin' ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
                {loggedInAdmin.username} <span className="hidden sm:inline">({loggedInAdmin.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full items-center gap-2 shadow-sm">
              <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">System Live</span>
            </div>
            <button onClick={handleLogout} className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-sm font-bold transition-colors">
              <LogOut size={16}/> <span className="hidden sm:inline ml-2">ထွက်မည်</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="bg-slate-200/50 p-1.5 rounded-2xl flex gap-1 overflow-x-auto hide-scrollbar border border-slate-200/80 shadow-inner">
            <TabButton tab="requests" icon={Clock} label="လျှောက်လွှာအသစ်" count={pendingBoys.length} />
            <TabButton tab="dateboys" icon={UserCheck} label="Date Boys" count={approvedBoys.length} />
            <TabButton tab="clients" icon={KeyRound} label="Client IDs" count={0} />
            <TabButton tab="settings" icon={Settings} label="ဆက်တင်များ" count={0} />
            {loggedInAdmin.role === 'super_admin' && (
              <TabButton tab="admins" icon={Shield} label="Admin အကောင့်များ" count={adminUsers.length} />
            )}
          </div>
        </div>

        <div className="pt-2">
          {activeTab === 'requests' && (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">စောင့်ဆိုင်းနေသော လျှောက်လွှာများ</h3>
              {pendingBoys.length === 0 ? (
                <div className="bg-white p-10 sm:p-16 text-center rounded-3xl border border-slate-200 border-dashed"><div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Clock className="text-slate-400" size={24}/></div><p className="text-sm sm:text-base text-slate-500 font-medium">လောလောဆယ် အသစ်လျှောက်ထားသူ မရှိသေးပါ ခင်ဗျာ။</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {pendingBoys.map(boy => <DateBoyCard key={boy.id} boy={boy} isPending={true} editingBoyId={editingBoyId} editBoyData={editBoyData} setEditBoyData={setEditBoyData} setEditingBoyId={setEditingBoyId} saveEditedBoy={saveEditedBoy} handleApprove={handleApprove} handleDeleteDateBoy={handleDeleteDateBoy} handleToggleVisibility={handleToggleVisibility} startEditBoy={startEditBoy} setModalImage={setModalImage} />)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dateboys' && (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">လက်ရှိ Date Boys အားလုံး</h3>
              {approvedBoys.length === 0 ? (
                <div className="bg-white p-10 sm:p-16 text-center rounded-3xl border border-slate-200 border-dashed"><div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><UserCheck className="text-slate-400" size={24}/></div><p className="text-sm sm:text-base text-slate-500 font-medium">စနစ်ထဲတွင် Date Boy မရှိသေးပါ။</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {approvedBoys.map(boy => <DateBoyCard key={boy.id} boy={boy} isPending={false} editingBoyId={editingBoyId} editBoyData={editBoyData} setEditBoyData={setEditBoyData} setEditingBoyId={setEditingBoyId} saveEditedBoy={saveEditedBoy} handleApprove={handleApprove} handleDeleteDateBoy={handleDeleteDateBoy} handleToggleVisibility={handleToggleVisibility} startEditBoy={startEditBoy} setModalImage={setModalImage} />)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">ထုတ်ပေးထားသော Client IDs များ</h3>
              {clientIds.length === 0 ? (
                <div className="bg-white p-10 sm:p-16 text-center rounded-3xl border border-slate-200 border-dashed"><div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><KeyRound className="text-slate-400" size={24}/></div><p className="text-sm sm:text-base text-slate-500 font-medium">လောလောဆယ် ထုတ်ပေးထားသော Client ID မရှိသေးပါ။</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {clientIds.map(client => (
                    <div key={client.id} className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div className="text-[10px] sm:text-xs font-bold text-indigo-500 mb-2 uppercase tracking-widest flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Active ID</div>
                        <h4 className="font-bold text-xl sm:text-2xl text-slate-800 font-mono tracking-widest bg-slate-50 py-3 px-4 rounded-xl border border-slate-100 text-center mb-4">{client.clientId}</h4>
                        <a href={`tg://user?id=${client.telegramChatId}`} className="text-xs sm:text-sm flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2.5 rounded-xl font-bold hover:bg-blue-100 transition-colors">Telegram Profile သို့သွားရန်</a>
                      </div>
                      <button onClick={() => handleDeleteClientId(client.id)} className="w-full mt-4 bg-white border border-rose-200 text-rose-500 py-2.5 rounded-xl font-bold hover:bg-rose-50 text-xs sm:text-sm flex justify-center items-center gap-2 transition-colors"><Trash2 size={16}/> ပယ်ဖျက်မည်</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admins' && loggedInAdmin.role === 'super_admin' && (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">Admin အကောင့်များ စီမံခန့်ခွဲခြင်း</h3>
              
              <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
                <h4 className="font-bold text-sm sm:text-base text-indigo-600 mb-4 sm:mb-5 flex items-center gap-2"><Plus size={18}/> Admin အကောင့်အသစ် ဖန်တီးရန်</h4>
                <form onSubmit={handleAddAdmin} className="flex flex-col lg:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] sm:text-xs text-slate-500 font-bold mb-1.5 sm:mb-2 block uppercase tracking-wider">Username</label>
                    <input type="text" value={newAdminName} onChange={e=>setNewAdminName(e.target.value)} className="w-full p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all" required/>
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-[10px] sm:text-xs text-slate-500 font-bold mb-1.5 sm:mb-2 block uppercase tracking-wider">Password</label>
                    <input type="text" value={newAdminPass} onChange={e=>setNewAdminPass(e.target.value)} className="w-full p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all" required/>
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-[10px] sm:text-xs text-slate-500 font-bold mb-1.5 sm:mb-2 block uppercase tracking-wider">Role (အဆင့်)</label>
                    <select value={newAdminRole} onChange={e=>setNewAdminRole(e.target.value)} className="w-full p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all">
                      <option value="super_admin">Super Admin</option>
                      <option value="sub_admin">Sub Admin</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full lg:w-auto bg-indigo-600 text-white px-8 py-3 sm:py-3.5 rounded-xl text-sm sm:text-base font-bold hover:bg-indigo-700 transition-colors shadow-sm">ဖန်တီးမည်</button>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {adminUsers.map(admin => (
                  <div key={admin.id} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    {editingAdminId === admin.id ? (
                      <div className="space-y-3">
                        <input type="text" value={editAdminName} onChange={e=>setEditAdminName(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm" placeholder="Username" />
                        <input type="text" value={editAdminPass} onChange={e=>setEditAdminPass(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm" placeholder="Password" />
                        <select value={editAdminRole} onChange={e=>setEditAdminRole(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm">
                          <option value="super_admin">Super Admin</option>
                          <option value="sub_admin">Sub Admin</option>
                        </select>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => saveEditAdmin(admin.id)} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-600">သိမ်းမည်</button>
                          <button onClick={() => setEditingAdminId(null)} className="bg-slate-100 text-slate-600 px-3 rounded-lg text-xs font-bold hover:bg-slate-200">ပယ်ဖျက်</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Shield className={admin.role === 'super_admin' ? 'text-rose-500' : 'text-blue-500'} size={18} />
                          </div>
                          <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full ${admin.role === 'super_admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                            {admin.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                          </span>
                        </div>
                        <h5 className="font-bold text-lg sm:text-xl text-slate-800 mb-1">{admin.username}</h5>
                        <p className="text-xs text-slate-400 font-mono mb-4">Pass: {admin.password}</p>
                        
                        <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                          <button onClick={() => startEditAdmin(admin)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 transition-colors">ပြင်မည်</button>
                          {admin.id !== loggedInAdmin.id && (
                            <button onClick={() => handleDeleteAdmin(admin.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-500 px-3 sm:px-4 rounded-xl border border-rose-100 transition-colors"><Trash2 size={14}/></button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
              
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 sm:mb-8 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-lg flex items-center justify-center"><Settings className="text-indigo-600" size={18}/></div>
                    <div><h3 className="text-base sm:text-lg font-bold text-slate-800">အထွေထွေ ဆက်တင်များ</h3><p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">ဈေးနှုန်းများနှင့် စည်းမျဉ်းများကို ပြင်ဆင်ရန်</p></div>
                  </div>

                  <form onSubmit={handleSaveConfig} className="space-y-6 sm:space-y-8">
                    
                    <div className="space-y-4 sm:space-y-5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><FileText size={16} className="text-slate-400"/> လျှထားသူများအတွက်</h4>
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">လိုအပ်သည့်အချက်များ</label>
                        <textarea rows="4" value={appConfig.reqText} onChange={e=>setAppConfig({...appConfig, reqText: e.target.value})} className="w-full p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all leading-relaxed" required/>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">စည်းမျဉ်းစည်းကမ်းများ</label>
                        <textarea rows="4" value={appConfig.ruleText} onChange={e=>setAppConfig({...appConfig, ruleText: e.target.value})} className="w-full p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all leading-relaxed" required/>
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="space-y-4 sm:space-y-5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><CreditCard size={16} className="text-slate-400"/> ငွေပေးချေမှုနှင့် ဈေးနှုန်းများ</h4>
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Payment Info (ငွေလွှဲရန် အချက်အလက်)</label>
                        <input type="text" value={appConfig.paymentInfo} onChange={e=>setAppConfig({...appConfig, paymentInfo: e.target.value})} className="w-full p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all" required/>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-2 uppercase">Client ID ဝယ်ယူခ (Ks)</label>
                          <input type="number" value={appConfig.clientIdFee} onChange={e=>setAppConfig({...appConfig, clientIdFee: Number(e.target.value)})} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-all" required/>
                        </div>
                        <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-2 uppercase">Private Photo Fee (Ks)</label>
                          <input type="number" value={appConfig.privFee} onChange={e=>setAppConfig({...appConfig, privFee: Number(e.target.value)})} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-all" required/>
                        </div>
                        <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-2 uppercase">Dating Fee - Section (Ks)</label>
                          <input type="number" value={appConfig.feeSec} onChange={e=>setAppConfig({...appConfig, feeSec: Number(e.target.value)})} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-all" required/>
                        </div>
                        <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-2 uppercase">Dating Fee - Day (Ks)</label>
                          <input type="number" value={appConfig.feeDay} onChange={e=>setAppConfig({...appConfig, feeDay: Number(e.target.value)})} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-all" required/>
                        </div>
                        <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-2 uppercase">Dating Fee - Night (Ks)</label>
                          <input type="number" value={appConfig.feeNight} onChange={e=>setAppConfig({...appConfig, feeNight: Number(e.target.value)})} className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-all" required/>
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={isConfigSaving} className="w-full bg-indigo-600 text-white p-3 sm:p-4 rounded-2xl text-sm sm:text-base font-bold mt-6 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2">
                      {isConfigSaving ? 'သိမ်းဆည်းနေသည်...' : <><Save size={18}/> အချက်အလက်များ သိမ်းမည်</>}
                    </button>
                  </form>
                </div>
              </div>

              <div className="space-y-6">
                
                <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 mb-4"><MapPin size={18} className="text-indigo-500"/> မြို့နယ် အသစ်ထည့်ရန်</h3>
                  <form onSubmit={handleAddLocation} className="space-y-3">
                    <div className="flex gap-2">
                      <input type="text" value={newCity} onChange={e=>setNewCity(e.target.value)} placeholder="မြို့အမည် (ဥပမာ- ရန်ကုန်)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-400 transition-all" required/>
                      {uniqueCities.length > 0 && (
                        <select onChange={e => { if(e.target.value) setNewCity(e.target.value); e.target.value=''; }} className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer w-28 sm:w-32 flex-shrink-0 text-slate-600">
                          <option value="">ရွေးချယ်ရန်</option>
                          {uniqueCities.map((c, i) => <option key={`nc-${i}`} value={c}>{c}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={newTownship} onChange={e=>setNewTownship(e.target.value)} placeholder="မြို့နယ်အမည် (ဥပမာ- လှည်းတန်း)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-400 transition-all" required/>
                      {uniqueTownships.length > 0 && (
                        <select onChange={e => { if(e.target.value) setNewTownship(e.target.value); e.target.value=''; }} className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer w-28 sm:w-32 flex-shrink-0 text-slate-600">
                          <option value="">ရွေးချယ်ရန်</option>
                          {uniqueTownships.map((t, i) => <option key={`nt-${i}`} value={t}>{t}</option>)}
                        </select>
                      )}
                    </div>
                    <button type="submit" className="w-full bg-slate-800 text-white p-3 rounded-xl text-sm sm:text-base font-bold hover:bg-slate-900 transition-colors flex justify-center items-center gap-1"><Plus size={18}/> ပေါင်းထည့်မည်</button>
                  </form>
                </div>

                {pendingLocations.length > 0 && (
                  <div className="bg-orange-50 p-5 sm:p-6 rounded-3xl border border-orange-200">
                    <h3 className="text-xs sm:text-sm font-bold text-orange-700 mb-4 flex items-center gap-2 uppercase tracking-wider"><Clock size={16}/> အတည်ပြုရန် မြို့နယ်များ</h3>
                    <div className="space-y-3">
                      {pendingLocations.map(loc => (
                        <div key={loc.id} className="bg-white p-3 sm:p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col">
                          {editingLocId === loc.id ? (
                            <div className="flex flex-col gap-2.5">
                              <div className="flex gap-2">
                                <input type="text" value={editCity} onChange={e=>setEditCity(e.target.value)} className="w-full p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm outline-none" placeholder="မြို့အမည်" />
                                {uniqueCities.length > 0 && (
                                  <select onChange={e => { if(e.target.value) setEditCity(e.target.value); e.target.value=''; }} className="p-2 sm:p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer w-24 sm:w-28 flex-shrink-0 text-slate-600">
                                    <option value="">ရွေးချယ်ရန်</option>
                                    {uniqueCities.map((c, i) => <option key={`ec-${i}`} value={c}>{c}</option>)}
                                  </select>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <input type="text" value={editTownship} onChange={e=>setEditTownship(e.target.value)} className="w-full p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm outline-none" placeholder="မြို့နယ်အမည်" />
                                {uniqueTownships.length > 0 && (
                                  <select onChange={e => { if(e.target.value) setEditTownship(e.target.value); e.target.value=''; }} className="p-2 sm:p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs outline-none cursor-pointer w-24 sm:w-28 flex-shrink-0 text-slate-600">
                                    <option value="">ရွေးချယ်ရန်</option>
                                    {uniqueTownships.map((t, i) => <option key={`et-${i}`} value={t}>{t}</option>)}
                                  </select>
                                )}
                              </div>
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => saveEditedLocation(loc)} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-green-600 transition-colors">လက်ခံမည်</button>
                                <button onClick={() => setEditingLocId(null)} className="bg-slate-100 text-slate-600 py-2 px-3 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-slate-200">ပယ်ဖျက်</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div><span className="font-bold text-slate-800 text-xs sm:text-sm block">{loc.township}</span><span className="text-[10px] sm:text-xs text-slate-400">{loc.city}</span></div>
                              <div className="flex gap-1.5">
                                <button onClick={() => startEditLocation(loc)} className="bg-slate-50 text-slate-500 p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 border border-slate-200"><Pencil size={12}/></button>
                                <button onClick={() => handleApproveLocation(loc.id)} className="bg-green-50 text-green-600 p-1.5 sm:p-2 rounded-lg hover:bg-green-100 border border-green-200"><CheckCircle2 size={12}/></button>
                                <button onClick={() => handleDeleteLocation(loc.id)} className="bg-rose-50 text-rose-500 p-1.5 sm:p-2 rounded-lg hover:bg-rose-100 border border-rose-200"><Trash2 size={12}/></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 max-h-[400px] sm:max-h-[500px] overflow-y-auto hide-scrollbar">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">လက်ရှိ မြို့နယ်များ</h3>
                  <div className="space-y-2">
                    {approvedLocations.map(loc => (
                      <div key={loc.id} className="flex justify-between items-center bg-slate-50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-100 group hover:border-slate-200 transition-colors">
                        <div><span className="font-semibold text-slate-700 text-xs sm:text-sm">{loc.township}</span> <span className="text-[10px] sm:text-xs text-slate-400 ml-1">({loc.city})</span></div>
                        <button onClick={() => handleDeleteLocation(loc.id)} className="text-slate-300 hover:text-rose-500 p-1 rounded-md opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                      </div>
                    ))}
                    {approvedLocations.length === 0 && <p className="text-[10px] sm:text-xs text-slate-400 text-center py-4">မရှိသေးပါ</p>}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      {modalImage && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setModalImage(null)}>
          <div className="relative max-w-3xl w-full bg-white p-2 rounded-[2rem] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setModalImage(null)} className="bg-slate-900/50 hover:bg-slate-900 text-white p-2 rounded-full backdrop-blur transition-colors"><X size={20}/></button>
            </div>
            <img src={modalImage} alt="Zoomed" className="w-full max-h-[80vh] object-contain rounded-[1.5rem]" />
          </div>
        </div>
      )}
    </div>
  );
}
