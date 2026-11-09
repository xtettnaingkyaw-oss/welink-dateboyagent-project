import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserCheck, Clock, Plus, Trash2, CheckCircle2, Settings, Eye, Pencil, EyeOff, Save, X, CreditCard, FileText, KeyRound, Smartphone, MapPin, Ruler, Activity, Lock, Shield, LogOut, Ban, Unlock, Sparkles } from 'lucide-react';

const DateBoyCard = ({ boy, isPending, editingBoyId, editBoyData, setEditBoyData, setEditingBoyId, saveEditedBoy, handleApprove, handleDeleteDateBoy, handleToggleVisibility, startEditBoy, setModalImage }) => {
  const pPhotos = Array.isArray(boy.publicPhotos) ? boy.publicPhotos : (boy.publicPhoto ? [boy.publicPhoto] : []);
  const prPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : (boy.privatePhotos ? [boy.privatePhotos] : []);
  const isEditing = editingBoyId === boy.id;
  const boyCode = `WLDB-${boy.id.substring(0, 5).toUpperCase()}`; 

  return (
    <div className={`bg-white border ${boy.status === 'hidden' ? 'border-slate-300 opacity-60' : isPending ? 'border-amber-300 shadow-amber-500/10' : 'border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]'} p-5 sm:p-6 rounded-[2rem] flex flex-col justify-between relative transition-all duration-300 hover:shadow-xl`}>
      {boy.status === 'hidden' && (
        <div className="absolute top-4 right-4 bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 z-10 shadow-sm">
          <EyeOff size={13}/> Hidden
        </div>
      )}
      
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-3 mb-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <input type="text" value={editBoyData.name || ''} onChange={e=>setEditBoyData({...editBoyData, name: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-bold" placeholder="အမည်" />
            <div className="flex gap-2">
              <input type="text" value={editBoyData.age || ''} onChange={e=>setEditBoyData({...editBoyData, age: e.target.value})} className="w-1/2 p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" placeholder="အသက်" />
              <input type="text" value={editBoyData.height || ''} onChange={e=>setEditBoyData({...editBoyData, height: e.target.value})} className="w-1/2 p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" placeholder="အရပ်" />
            </div>
            <input type="text" value={editBoyData.cockSize || ''} onChange={e=>setEditBoyData({...editBoyData, cockSize: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" placeholder="Cock Size" />
            <input type="text" value={editBoyData.phone || ''} onChange={e=>setEditBoyData({...editBoyData, phone: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" placeholder="ဖုန်း" />
            <div className="flex gap-2">
              <input type="text" value={editBoyData.city || ''} onChange={e=>setEditBoyData({...editBoyData, city: e.target.value})} className="w-1/2 p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" placeholder="မြို့" />
              <input type="text" value={editBoyData.township || ''} onChange={e=>setEditBoyData({...editBoyData, township: e.target.value})} className="w-1/2 p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" placeholder="မြို့နယ်" />
            </div>
            <input type="text" value={editBoyData.address || ''} onChange={e=>setEditBoyData({...editBoyData, address: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" placeholder="လိပ်စာ" />
          </div>
        ) : (
          <>
            <div className="flex flex-col mb-4 mt-1">
              <h4 className="font-black text-xl text-slate-900 flex items-center flex-wrap gap-2">
                {boy.name} 
                <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-md tracking-wider">
                  {boyCode}
                </span>
              </h4>
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-2 font-semibold">
                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <UserCheck size={13} className="text-amber-500"/> {boy.age} yrs
                </span>
                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Ruler size={13} className="text-emerald-500"/> {boy.height}
                </span>
                <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                  <Activity size={13}/> {boy.cockSize || 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="bg-slate-50/80 p-3.5 rounded-2xl text-xs mb-5 border border-slate-100 space-y-2">
              <p className="text-slate-700 font-medium flex items-center gap-2">
                <MapPin size={15} className="text-amber-500 shrink-0"/> {boy.township}, {boy.city}
              </p>
              <p className="text-slate-700 font-medium flex items-center gap-2">
                <Smartphone size={15} className="text-emerald-500 shrink-0"/> {boy.phone}
              </p>
              <p className="text-slate-400 mt-2 pt-2 border-t border-slate-200/70 truncate" title={boy.address}>
                {boy.address}
              </p>
            </div>
          </>
        )}

        <div className="mb-5 space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Public Photos ({pPhotos.length})
            </span>
            <div className="grid grid-cols-3 gap-2">
              {pPhotos.map((img, idx) => (
                <div key={idx} className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden bg-slate-100 shadow-sm" onClick={() => setModalImage(img)}>
                  <img src={img} alt="pub" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <Eye size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-2">
              🔒 Private Photos ({prPhotos.length})
            </span>
            <div className="grid grid-cols-3 gap-2">
              {prPhotos.map((img, idx) => (
                <div key={idx} className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden bg-purple-50 shadow-sm" onClick={() => setModalImage(img)}>
                  <img src={img} alt="priv" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-purple-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <Eye size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {boy.privateVideo && (
          <div className="mb-5">
            <a href={boy.privateVideo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs bg-rose-50 text-rose-600 px-3.5 py-2 rounded-xl font-bold border border-rose-100 hover:bg-rose-100 transition-colors">
              <Eye size={15}/> Watch Private Video
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
        {isPending ? (
          <>
            <button onClick={() => handleApprove(boy.id)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all text-xs shadow-md shadow-emerald-600/20">
              Approve
            </button>
            <button onClick={() => handleDeleteDateBoy(boy.id)} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-bold hover:bg-rose-100 transition-all text-xs border border-rose-200/60">
              Reject
            </button>
          </>
        ) : (
          isEditing ? (
            <div className="w-full flex gap-2">
              <button onClick={() => saveEditedBoy(boy.id)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 hover:bg-emerald-700 transition-all">
                <Save size={15}/> Save
              </button>
              <button onClick={() => setEditingBoyId(null)} className="px-4 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all">
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => startEditBoy(boy)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 text-xs flex justify-center items-center gap-1.5 transition-all">
                <Pencil size={15}/> Edit
              </button>
              <button onClick={() => handleToggleVisibility(boy)} className={`flex-1 py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 transition-all border ${boy.status === 'hidden' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}>
                {boy.status === 'hidden' ? <><Eye size={15}/> Unhide</> : <><EyeOff size={15}/> Hide</>}
              </button>
              <button onClick={() => handleDeleteDateBoy(boy.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 border border-rose-200/60 transition-all flex items-center justify-center">
                <Trash2 size={16}/>
              </button>
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
  const [bannedUsers, setBannedUsers] = useState([]);
  
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
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [draftRules, setDraftRules] = useState({ reqText: '', ruleText: '' });
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [draftPricing, setDraftPricing] = useState({ paymentInfo: '', privFee: 0, feeSec: 0, feeDay: 0, feeNight: 0, clientIdFee: 0 });

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
    
    const unsubBanned = onSnapshot(query(collection(db, 'telegram_states'), where('banned', '==', true)), (snap) => {
      setBannedUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubConfig = onSnapshot(doc(db, 'settings', 'app_config'), (docSnap) => {
      if (docSnap.exists()) setAppConfig(prev => ({ ...prev, ...docSnap.data() }));
    });

    return () => { unsubAdmins(); unsubBoys(); unsubLocs(); unsubClients(); unsubBanned(); unsubConfig(); };
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

  const uniqueCities = [...new Set(approvedLocations.map(l => l.city).filter(Boolean))];
  const uniqueTownships = [...new Set(approvedLocations.map(l => l.township).filter(Boolean))];

  const handleApprove = async (id) => {
    const boy = boys.find(b => b.id === id);
    const boyCode = `WLDB-${id.substring(0, 5).toUpperCase()}`; 
    await updateDoc(doc(db, 'dateboys', id), { status: 'approved' });
    if (boy && boy.telegramChatId) {
      const approveMsg = `🎉 ကျေးဇူးတင်ပါတယ်။ သတ်မှတ်အရည်အချင်းများနှင့် ပြည့်စုံကိုက်ညီသောကြောင့် သင့်အား WE LINK ၏ Date Boy စာရင်းထဲသို့ ပေါင်းထည့်ပေးလိုက်ပါပြီ။\n\n📌 သင့်၏ Date Boy ID မှာ: <code>${boyCode}</code> ဖြစ်ပါသည်။ Privacy အရ သင်၏ အမည်အရင်းကို ဧည့်သည်အားပြသမည်မဟုတ်သောကြောင့် ယခု ID အား သေချာစွာမှတ်သားထားပေးပါ။\n\nမန္တလေးမြို့တွင်းဆိုရင် ချက်ချင်း(သို့မဟုတ်) (၁)ရက် (၂) ရက်အတွင်းရရှိနိုင်ပြီး အခြားမြို့များကဆိုရင် အနည်းဆုံး (၁)ပတ်ကနေ ဧည့်သည်အခြေအနေပေါ်မူတည်ပြီး စောင့်ရနိုင်ပါသည်။\n\nအထူးသတိပြုရန်မှာ Date Boy စာရင်းသို့ပေါင်းထည့်လိုက်ပြီး ခေါ်ယူလိုသည့်ဧည့်သည်များကို ပြသသည့်စာရင်းထဲတွင် ပါဝင်ပြီးဖြစ်သော်လည်း အလုပ်ရရှိရန်အတွက် မိမိအား ခေါ်ယူမည့် ဧည့်သည်ကြိုက်ရန်လည်း လိုအပ်ပါသေးသည်။\n\nလုပ်ငန်းလိုအပ်ချက်အရ အပြင်လူတွေ့ အင်တာဗျူးရန် လိုအပ်ပါရင် နေရာနှင့် အချိန်အသေးစိတ်ကို Admin မှ ပြန်လည်ဆက်သွယ်ပေးသွားပါမည်။`;
      fetch('/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ internal_action: 'notify_user', chatId: boy.telegramChatId, text: approveMsg, useMenu: true }) }).catch(e => console.error(e));
    }
  };

  const handleDeleteDateBoy = async (id) => {
    const reasonInput = window.prompt("ပယ်ချရသည့် အကြောင်းရင်းကို ရွေးပါ-\n1 = အရည်အချင်းမကိုက်ညီခြင်း\n2 = ပုံ/Video များအဆင်မပြေခြင်း (ပြန်တင်ရန်)\n3 = ရုပ်ရည်/ခန္ဓာကိုယ် အဆင်မပြေခြင်း\n4 = အခြား (Custom)\n(Cancel နှိပ်ပါက ရိုးရိုးပယ်ချမည်)");
    if (reasonInput === null && !window.confirm('ရိုးရိုးပယ်ချမှာ သေချာပါသလား?')) return;
    
    let reasonMsg = "❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို အောက်ပါအကြောင်းရင်းကြောင့် ပယ်ချလိုက်ပါသည် -\n\n";
    if (reasonInput === '1') reasonMsg += "👉 <b>သတ်မှတ်အရည်အချင်းများနှင့် မကိုက်ညီခြင်း</b>";
    else if (reasonInput === '2') reasonMsg += "👉 <b>ပေးပို့ထားသောပုံများ နှင့် Video အဆင်မပြေခြင်း</b>\n(ကျေးဇူးပြု၍ ပုံများနှင့် Video ကို အသစ်ပြန်လည်စီစဉ်ပြီး အစကနေ ပြန်တင်ပေးပါ ခင်ဗျာ)";
    else if (reasonInput === '3') reasonMsg += "👉 <b>ရုပ်ရည်နှင့် ခန္ဓာကိုယ်အချိုးအစား လုပ်ငန်းလိုအပ်ချက်နှင့် အဆင်မပြေခြင်း</b>";
    else if (reasonInput === '4') {
      const customInput = window.prompt("ပယ်ချရသည့် အကြောင်းရင်းကို ရိုက်ထည့်ပါ-");
      if (!customInput) return;
      reasonMsg += `👉 <b>${customInput}</b>`;
    }
    else reasonMsg = "❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို ပယ်ချလိုက်ပါသည်။";

    const boy = boys.find(b => b.id === id);
    if (boy && boy.status === 'pending' && boy.telegramChatId) {
      fetch('/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ internal_action: 'reject_user', chatId: boy.telegramChatId, text: reasonMsg }) }).catch(e => console.error(e));
    }
    await deleteDoc(doc(db, 'dateboys', id));
  };

  const handleUnbanUser = async (chatId) => {
    if (window.confirm('ဤ User အား လျှောက်ထားခွင့် ပြန်လည် ဖွင့်ပေးမည်မှာ သေချာပါသလား?')) {
      await updateDoc(doc(db, 'telegram_states', chatId), { banned: false, rejectCount: 0 });
      alert("စာပို့ခွင့် ပြန်လည် ဖွင့်ပေးလိုက်ပါပြီ။");
    }
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

  const startEditRules = () => { setDraftRules({ reqText: appConfig.reqText, ruleText: appConfig.ruleText }); setIsEditingRules(true); };
  const startEditPricing = () => { setDraftPricing({ paymentInfo: appConfig.paymentInfo, clientIdFee: appConfig.clientIdFee, privFee: appConfig.privFee, feeSec: appConfig.feeSec, feeDay: appConfig.feeDay, feeNight: appConfig.feeNight }); setIsEditingPricing(true); };
  
  const handleSaveRules = async () => {
    setIsConfigSaving(true);
    await setDoc(doc(db, 'settings', 'app_config'), draftRules, { merge: true });
    setIsConfigSaving(false); setIsEditingRules(false);
  };
  
  const handleSavePricing = async () => {
    setIsConfigSaving(true);
    await setDoc(doc(db, 'settings', 'app_config'), draftPricing, { merge: true });
    setIsConfigSaving(false); setIsEditingPricing(false);
  };

  if (!loggedInAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/20 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20 text-white">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Admin Portal</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">WE LINK Secure Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Username</label>
              <input type="text" value={loginUser} onChange={e=>setLoginUser(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-amber-500 focus:bg-white font-medium transition-all" placeholder="Username..." required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Password</label>
              <input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-amber-500 focus:bg-white font-medium transition-all" placeholder="Password..." required />
            </div>
            {loginError && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 p-3 rounded-xl border border-rose-100">{loginError}</p>}
            <button type="submit" disabled={isLoggingIn} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 mt-2">
              {isLoggingIn ? 'Verifying...' : 'SIGN IN TO ADMIN'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const TabButton = ({ tab, icon: Icon, label, count }) => {
    const isActive = activeTab === tab;
    return (
      <button onClick={() => setActiveTab(tab)} className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 whitespace-nowrap min-w-[140px] sm:min-w-fit ${isActive ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'}`}>
        <Icon size={16} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
        <span>{label}</span>
        {count > 0 && <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'}`}>{count}</span>}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-16">
      <header className="bg-white/85 backdrop-blur-2xl border-b border-slate-200/80 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-tr from-amber-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20 text-white">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Admin Portal</h1>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${loggedInAdmin.role === 'super_admin' ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
                {loggedInAdmin.username} ({loggedInAdmin.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex bg-emerald-50 border border-emerald-200/60 px-4 py-2 rounded-full items-center gap-2 shadow-sm">
              <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">System Live</span>
            </div>
            <button onClick={handleLogout} className="flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs sm:text-sm font-bold transition-all border border-slate-200/80">
              <LogOut size={16}/> <span className="hidden sm:inline ml-2">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        
        {/* Tabs Bar */}
        <div className="bg-slate-200/70 p-1.5 rounded-2xl flex gap-1 overflow-x-auto hide-scrollbar border border-slate-300/60 shadow-inner">
          <TabButton tab="requests" icon={Clock} label="Pending Requests" count={pendingBoys.length} />
          <TabButton tab="dateboys" icon={UserCheck} label="Date Boys" count={approvedBoys.length} />
          <TabButton tab="clients" icon={KeyRound} label="Client IDs" count={clientIds.length} />
          <TabButton tab="banned" icon={Ban} label="Banned Users" count={bannedUsers.length} />
          <TabButton tab="settings" icon={Settings} label="Settings" count={0} />
          {loggedInAdmin.role === 'super_admin' && (
            <TabButton tab="admins" icon={Shield} label="Admin Accounts" count={adminUsers.length} />
          )}
        </div>

        <div className="pt-2">
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">စောင့်ဆိုင်းနေသော လျှောက်လွှာများ (Pending Requests)</h3>
              </div>
              {pendingBoys.length === 0 ? (
                <div className="bg-white p-12 sm:p-20 text-center rounded-[2.5rem] border border-slate-200/80 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Clock size={28}/>
                  </div>
                  <p className="text-sm font-bold text-slate-600">လောလောဆယ် အသစ်လျှောက်ထားသူ မရှိသေးပါ ခင်ဗျာ။</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {pendingBoys.map(boy => <DateBoyCard key={boy.id} boy={boy} isPending={true} editingBoyId={editingBoyId} editBoyData={editBoyData} setEditBoyData={setEditBoyData} setEditingBoyId={setEditingBoyId} saveEditedBoy={saveEditedBoy} handleApprove={handleApprove} handleDeleteDateBoy={handleDeleteDateBoy} handleToggleVisibility={handleToggleVisibility} startEditBoy={startEditBoy} setModalImage={setModalImage} />)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dateboys' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">လက်ရှိ Date Boys အားလုံး ({approvedBoys.length})</h3>
              </div>
              {approvedBoys.length === 0 ? (
                <div className="bg-white p-12 sm:p-20 text-center rounded-[2.5rem] border border-slate-200/80 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <UserCheck size={28}/>
                  </div>
                  <p className="text-sm font-bold text-slate-600">စနစ်ထဲတွင် Date Boy မရှိသေးပါ။</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {approvedBoys.map(boy => <DateBoyCard key={boy.id} boy={boy} isPending={false} editingBoyId={editingBoyId} editBoyData={editBoyData} setEditBoyData={setEditBoyData} setEditingBoyId={setEditingBoyId} saveEditedBoy={saveEditedBoy} handleApprove={handleApprove} handleDeleteDateBoy={handleDeleteDateBoy} handleToggleVisibility={handleToggleVisibility} startEditBoy={startEditBoy} setModalImage={setModalImage} />)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900">ထုတ်ပေးထားသော Client IDs များ</h3>
              {clientIds.length === 0 ? (
                <div className="bg-white p-12 sm:p-20 text-center rounded-[2.5rem] border border-slate-200/80 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <KeyRound size={28}/>
                  </div>
                  <p className="text-sm font-bold text-slate-600">လောလောဆယ် ထုတ်ပေးထားသော Client ID မရှိသေးပါ။</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {clientIds.map(client => (
                    <div key={client.id} className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                      <div>
                        <div className="text-[10px] font-black text-indigo-600 mb-2 uppercase tracking-widest flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Active Client ID</div>
                        <h4 className="font-mono font-black text-xl text-slate-900 bg-slate-50 py-3.5 px-4 rounded-2xl border border-slate-100 text-center mb-4 tracking-wider">{client.clientId}</h4>
                        <a href={`tg://user?id=${client.telegramChatId}`} className="text-xs flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-100 transition-colors">Telegram Profile သို့သွားရန်</a>
                      </div>
                      <button onClick={() => handleDeleteClientId(client.id)} className="w-full mt-4 bg-white border border-rose-200 text-rose-600 py-3 rounded-xl font-bold hover:bg-rose-50 text-xs flex justify-center items-center gap-2 transition-colors"><Trash2 size={15}/> Delete ID</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'banned' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-rose-600 flex items-center gap-2"><Ban size={22}/> ပယ်ချခံရသည့် (Banned) စာရင်းများ</h3>
              {bannedUsers.length === 0 ? (
                <div className="bg-white p-12 sm:p-20 text-center rounded-[2.5rem] border border-slate-200/80 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Ban size={28}/>
                  </div>
                  <p className="text-sm font-bold text-slate-600">လောလောဆယ် လျှောက်ထားခွင့် ပိတ်ခံရသူ မရှိသေးပါ။</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {bannedUsers.map(user => (
                    <div key={user.id} className="bg-white border border-rose-200/80 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                      <div>
                        <div className="text-[10px] font-black text-rose-600 mb-2 uppercase tracking-widest flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Banned User</div>
                        <h4 className="font-bold text-base text-slate-900 bg-slate-50 py-3 px-4 rounded-2xl border border-slate-100 text-center mb-4 break-all font-mono">ID: {user.id}</h4>
                        <div className="bg-rose-50 text-rose-600 text-xs font-bold text-center py-2.5 rounded-xl mb-4 border border-rose-100">ပယ်ချခံရမှု ({user.rejectCount}) ကြိမ်</div>
                        {user.telegramProfileLink && (
                          <a href={user.telegramProfileLink} className="text-xs flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-100 transition-colors">Telegram Profile</a>
                        )}
                      </div>
                      <button onClick={() => handleUnbanUser(user.id)} className="w-full mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 py-3 rounded-xl font-bold hover:bg-emerald-100 text-xs flex justify-center items-center gap-2 transition-colors"><Unlock size={15}/> Unban User</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admins' && loggedInAdmin.role === 'super_admin' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900">Admin အကောင့်များ စီမံခန့်ခွဲခြင်း</h3>
              
              <div className="bg-white p-6 sm:p-8 rounded-[2.25rem] shadow-sm border border-slate-200/80">
                <h4 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2"><Plus size={18} className="text-amber-500"/> Create New Admin Account</h4>
                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold mb-1.5 block uppercase tracking-wider">Username</label>
                    <input type="text" value={newAdminName} onChange={e=>setNewAdminName(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-medium" required/>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold mb-1.5 block uppercase tracking-wider">Password</label>
                    <input type="text" value={newAdminPass} onChange={e=>setNewAdminPass(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-medium" required/>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold mb-1.5 block uppercase tracking-wider">Role</label>
                    <select value={newAdminRole} onChange={e=>setNewAdminRole(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-medium cursor-pointer">
                      <option value="super_admin">Super Admin</option>
                      <option value="sub_admin">Sub Admin</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-md">Create Admin</button>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {adminUsers.map(admin => (
                  <div key={admin.id} className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    {editingAdminId === admin.id ? (
                      <div className="space-y-3">
                        <input type="text" value={editAdminName} onChange={e=>setEditAdminName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" placeholder="Username" />
                        <input type="text" value={editAdminPass} onChange={e=>setEditAdminPass(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" placeholder="Password" />
                        <select value={editAdminRole} onChange={e=>setEditAdminRole(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm">
                          <option value="super_admin">Super Admin</option>
                          <option value="sub_admin">Sub Admin</option>
                        </select>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => saveEditAdmin(admin.id)} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700">Save</button>
                          <button onClick={() => setEditingAdminId(null)} className="px-4 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Shield className={admin.role === 'super_admin' ? 'text-rose-500' : 'text-blue-500'} size={20} />
                          </div>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${admin.role === 'super_admin' ? 'bg-rose-50 text-rose-600 border border-rose-200/60' : 'bg-blue-50 text-blue-600 border border-blue-200/60'}`}>
                            {admin.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                          </span>
                        </div>
                        <h5 className="font-black text-lg text-slate-900 mb-1">{admin.username}</h5>
                        <p className="text-xs text-slate-400 font-mono mb-4">Pass: {admin.password}</p>
                        
                        <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                          <button onClick={() => startEditAdmin(admin)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-colors">Edit</button>
                          {admin.id !== loggedInAdmin.id && (
                            <button onClick={() => handleDeleteAdmin(admin.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 rounded-xl border border-rose-200/60 transition-colors flex items-center justify-center"><Trash2 size={15}/></button>
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              <div className="xl:col-span-2 space-y-8">
                
                {/* Requirements & Rules */}
                <div className="bg-white p-6 sm:p-8 rounded-[2.25rem] shadow-sm border border-slate-200/80">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={18} className="text-amber-500"/> လျှောက်ထားသူများအတွက် စည်းကမ်းချက်များ
                    </h4>
                    {!isEditingRules && (
                      <button onClick={startEditRules} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                        <Pencil size={14}/> Edit
                      </button>
                    )}
                  </div>

                  {isEditingRules ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">လိုအပ်သည့်အချက်များ (Requirements)</label>
                        <textarea rows="4" value={draftRules.reqText} onChange={e=>setDraftRules({...draftRules, reqText: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-amber-500 font-medium leading-relaxed" required/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">စည်းမျဉ်းစည်းကမ်းများ (Rules)</label>
                        <textarea rows="4" value={draftRules.ruleText} onChange={e=>setDraftRules({...draftRules, ruleText: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-amber-500 font-medium leading-relaxed" required/>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={handleSaveRules} disabled={isConfigSaving} className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl text-xs font-black hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                          {isConfigSaving ? 'Saving...' : <><Save size={15}/> Save Changes</>}
                        </button>
                        <button onClick={() => setIsEditingRules(false)} className="px-6 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">လိုအပ်သည့်အချက်များ</label>
                        <div className="text-xs sm:text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap text-slate-700 leading-relaxed">{appConfig.reqText || '-'}</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">စည်းမျဉ်းစည်းကမ်းများ</label>
                        <div className="text-xs sm:text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap text-slate-700 leading-relaxed">{appConfig.ruleText || '-'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing & Fees */}
                <div className="bg-white p-6 sm:p-8 rounded-[2.25rem] shadow-sm border border-slate-200/80">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard size={18} className="text-emerald-500"/> ငွေပေးချေမှုနှင့် ဈေးနှုန်းများ (Pricing & Fees)
                    </h4>
                    {!isEditingPricing && (
                      <button onClick={startEditPricing} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                        <Pencil size={14}/> Edit
                      </button>
                    )}
                  </div>

                  {isEditingPricing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Payment Info (ငွေလွှဲရန် အချက်အလက်)</label>
                        <input type="text" value={draftPricing.paymentInfo} onChange={e=>setDraftPricing({...draftPricing, paymentInfo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-medium" required/>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Client ID ဝယ်ယူခ (Ks)</label>
                          <input type="number" value={draftPricing.clientIdFee} onChange={e=>setDraftPricing({...draftPricing, clientIdFee: Number(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-bold" required/>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Private Photo Fee (Ks)</label>
                          <input type="number" value={draftPricing.privFee} onChange={e=>setDraftPricing({...draftPricing, privFee: Number(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-bold" required/>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Dating Fee - Section (Ks)</label>
                          <input type="number" value={draftPricing.feeSec} onChange={e=>setDraftPricing({...draftPricing, feeSec: Number(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-bold" required/>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Dating Fee - Day (Ks)</label>
                          <input type="number" value={draftPricing.feeDay} onChange={e=>setDraftPricing({...draftPricing, feeDay: Number(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-bold" required/>
                        </div>
                        <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Dating Fee - Night (Ks)</label>
                          <input type="number" value={draftPricing.feeNight} onChange={e=>setDraftPricing({...draftPricing, feeNight: Number(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 font-bold" required/>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={handleSavePricing} disabled={isConfigSaving} className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl text-xs font-black hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                          {isConfigSaving ? 'Saving...' : <><Save size={15}/> Save Pricing</>}
                        </button>
                        <button onClick={() => setIsEditingPricing(false)} className="px-6 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/60 flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-800 uppercase">Payment Info</span>
                        <span className="text-sm font-bold text-slate-900">{appConfig.paymentInfo || '-'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">Client ID Fee</span>
                          <span className="text-sm font-black text-slate-900">{appConfig.clientIdFee} Ks</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">Private Photo Fee</span>
                          <span className="text-sm font-black text-slate-900">{appConfig.privFee} Ks</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">Section Fee</span>
                          <span className="text-sm font-black text-slate-900">{appConfig.feeSec} Ks</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">Day Fee</span>
                          <span className="text-sm font-black text-slate-900">{appConfig.feeDay} Ks</span>
                        </div>
                        <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">Night Fee</span>
                          <span className="text-sm font-black text-slate-900">{appConfig.feeNight} Ks</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Locations Management Column */}
              <div className="space-y-6">
                
                <div className="bg-white p-6 rounded-[2.25rem] shadow-sm border border-slate-200/80">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4"><MapPin size={18} className="text-amber-500"/> မြို့နယ် အသစ်ထည့်ရန်</h3>
                  <form onSubmit={handleAddLocation} className="space-y-3">
                    <div className="flex gap-2">
                      <input type="text" value={newCity} onChange={e=>setNewCity(e.target.value)} placeholder="မြို့ (ဥပမာ- ရန်ကုန်)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-amber-500 font-medium" required/>
                      {uniqueCities.length > 0 && (
                        <select onChange={e => { if(e.target.value) setNewCity(e.target.value); e.target.value=''; }} className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none cursor-pointer w-28 text-slate-700 font-semibold">
                          <option value="">Select City</option>
                          {uniqueCities.map((c, i) => <option key={`nc-${i}`} value={c}>{c}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={newTownship} onChange={e=>setNewTownship(e.target.value)} placeholder="မြို့နယ် (ဥပမာ- လှည်းတန်း)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-amber-500 font-medium" required/>
                      {uniqueTownships.length > 0 && (
                        <select onChange={e => { if(e.target.value) setNewTownship(e.target.value); e.target.value=''; }} className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none cursor-pointer w-28 text-slate-700 font-semibold">
                          <option value="">Select Township</option>
                          {uniqueTownships.map((t, i) => <option key={`nt-${i}`} value={t}>{t}</option>)}
                        </select>
                      )}
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black hover:bg-slate-800 transition-all flex justify-center items-center gap-1.5 shadow-sm"><Plus size={16}/> Add Location</button>
                  </form>
                </div>

                {pendingLocations.length > 0 && (
                  <div className="bg-amber-50/80 p-6 rounded-[2.25rem] border border-amber-200/80">
                    <h3 className="text-xs font-black text-amber-800 mb-4 flex items-center gap-2 uppercase tracking-wider"><Clock size={15}/> အတည်ပြုရန် မြို့နယ်များ</h3>
                    <div className="space-y-3">
                      {pendingLocations.map(loc => (
                        <div key={loc.id} className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-sm">
                          {editingLocId === loc.id ? (
                            <div className="space-y-2">
                              <input type="text" value={editCity} onChange={e=>setEditCity(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs" placeholder="City" />
                              <input type="text" value={editTownship} onChange={e=>setEditTownship(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs" placeholder="Township" />
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => saveEditedLocation(loc)} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold">Save</button>
                                <button onClick={() => setEditingLocId(null)} className="px-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div><span className="font-black text-slate-900 text-xs block">{loc.township}</span><span className="text-[10px] text-slate-400 font-semibold">{loc.city}</span></div>
                              <div className="flex gap-1.5">
                                <button onClick={() => startEditLocation(loc)} className="bg-slate-50 text-slate-600 p-2 rounded-xl hover:bg-slate-100 border border-slate-200"><Pencil size={13}/></button>
                                <button onClick={() => handleApproveLocation(loc.id)} className="bg-emerald-50 text-emerald-600 p-2 rounded-xl hover:bg-emerald-100 border border-emerald-200"><CheckCircle2 size={13}/></button>
                                <button onClick={() => handleDeleteLocation(loc.id)} className="bg-rose-50 text-rose-600 p-2 rounded-xl hover:bg-rose-100 border border-rose-200"><Trash2 size={13}/></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white p-6 rounded-[2.25rem] shadow-sm border border-slate-200/80 max-h-[450px] overflow-y-auto hide-scrollbar">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">လက်ရှိ မြို့နယ်များ ({approvedLocations.length})</h3>
                  <div className="space-y-2">
                    {approvedLocations.map(loc => (
                      <div key={loc.id} className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 group">
                        {editingLocId === loc.id ? (
                          <div className="space-y-2 w-full">
                            <input type="text" value={editCity} onChange={e=>setEditCity(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-xs" placeholder="City" />
                            <input type="text" value={editTownship} onChange={e=>setEditTownship(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-xs" placeholder="Township" />
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => saveEditedLocation(loc)} className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">Save</button>
                              <button onClick={() => setEditingLocId(null)} className="px-3 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div><span className="font-bold text-slate-800 text-xs block">{loc.township}</span> <span className="text-[10px] text-slate-400 font-semibold">{loc.city}</span></div>
                            <div className="flex gap-1.5 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditLocation(loc)} className="bg-white text-slate-600 p-2 rounded-xl hover:bg-slate-100 border border-slate-200 shadow-sm"><Pencil size={13}/></button>
                              <button onClick={() => handleDeleteLocation(loc.id)} className="bg-white text-rose-600 p-2 rounded-xl hover:bg-rose-50 border border-rose-200 shadow-sm"><Trash2 size={13}/></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      </main>

      {modalImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setModalImage(null)}>
          <div className="relative max-w-3xl w-full bg-white p-2.5 rounded-[2.5rem] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-5 right-5 z-10">
              <button onClick={() => setModalImage(null)} className="bg-slate-900/60 hover:bg-slate-900 text-white p-2.5 rounded-full backdrop-blur transition-colors"><X size={18}/></button>
            </div>
            <img src={modalImage} alt="Zoomed" className="w-full max-h-[82vh] object-contain rounded-[2rem]" />
          </div>
        </div>
      )}
    </div>
  );
}
