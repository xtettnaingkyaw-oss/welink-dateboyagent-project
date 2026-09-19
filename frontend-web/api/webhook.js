import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, getDocs, query, where, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = { apiKey: process.env.VITE_FIREBASE_API_KEY, authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: process.env.VITE_FIREBASE_PROJECT_ID, storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: process.env.VITE_FIREBASE_APP_ID };
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function getAdminChatId() {
  const adminDoc = await getDoc(doc(db, 'settings', 'admin_config'));
  return adminDoc.exists() ? adminDoc.data().chatId : null;
}
async function getAppConfig() {
  const cDoc = await getDoc(doc(db, 'settings', 'app_config'));
  return cDoc.exists() ? cDoc.data() : { paymentInfo: 'Admin ကိုဆက်သွယ်ပါ', privFee: 5000, feeSec: 30000, feeDay: 70000, feeNight: 100000 };
}

const MAIN_MENU_KEYBOARD = {
  keyboard: [[{ text: "🔄 အစသို့ ပြန်သွားမည်" }, { text: "🔍 Date Boy ထပ်ရှာမည်" }], [{ text: "📞 Admin သို့ ဆက်သွယ်ရန်" }]],
  resize_keyboard: true, is_persistent: true
};

async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const body = { chat_id: chatId, text, parse_mode: 'Markdown', protect_content: true };
    if (replyMarkup) body.reply_markup = replyMarkup;
    await fetch(`${TELEGRAM_API}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (err) { console.error('SendMessage Error:', err); }
}

async function getTelegramFileUrl(fileId) {
  try {
    const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (data.ok) return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
  } catch (e) { console.error('Error getting file URL:', e); }
  return null;
}

async function sendDateBoyCard(chatId, boy, boyId) {
  const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
  const pPhotos = Array.isArray(boy.publicPhotos) ? boy.publicPhotos : (boy.publicPhoto ? [boy.publicPhoto] : []);
  
  let validLinks = [];
  for (let i = 0; i < pPhotos.length; i++) {
    if (pPhotos[i].startsWith('http')) validLinks.push(`[Public ပုံ ${i+1}](${pPhotos[i]})`);
  }
  let publicLinksText = validLinks.length > 0 ? `\n\n📸 *Public ပုံများ:* ${validLinks.join(' | ')}` : "";

  const caption = `👤 *Code:* ${boyCode}\n🎂 *အသက်:* ${boy.age} နှစ်\n📏 *အရပ်:* ${boy.height}\n🍆 *Size:* ${boy.cockSize || 'N/A'}\n📍 *နေရာ:* ${boy.township}, ${boy.city}${publicLinksText}`;
  
  const keyboard = {
    inline_keyboard: [[{ text: "🔒 Private ပုံ ကြည့်ရန်", callback_data: `REQ_P_${boyId}` }], [{ text: "❤️ ခေါ်ယူမည် (Hire)", callback_data: `REQ_H_${boyId}` }]]
  };
  await sendMessage(chatId, caption, keyboard);
}

async function startBotFlow(chatId, stateRef) {
  await setDoc(stateRef, { step: 'CHOOSING_ROLE', data: {} });
  await sendMessage(chatId, "✨ *WE LINK Dating Agency* မှ ကြိုဆိုပါတယ်ခင်ဗျာ! \n\nကျေးဇူးပြု၍ လိုချင်သော ဝန်ဆောင်မှုကို ရွေးချယ်ပေးပါ -", {
    inline_keyboard: [[{ text: "🔍 Date Boy ရှာမည်", callback_data: "ROLE_CLIENT" }], [{ text: "💼 Date Boy လျှောက်မည်", callback_data: "ROLE_APPLICANT" }]]
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(200).json({ status: 'Bot Server is running!' });

    // 🌐 Web App (Admin Panel) မှ လှမ်းခေါ်သော Notification ကို လက်ခံရန်
    if (req.body.internal_action === 'notify_user') {
      await sendMessage(req.body.chatId, req.body.text, req.body.useMenu ? MAIN_MENU_KEYBOARD : null);
      return res.status(200).json({ status: 'notified' });
    }

    const { message, callback_query } = req.body;
    let chatId, text, photos = [], fileIdToForward = null, username = null;

    if (message) {
      chatId = message.chat.id;
      text = message.text ? message.text.trim() : '';
      username = message.from.username || message.from.first_name;
      if (message.photo && message.photo.length > 0) {
        const bestPhoto = message.photo[message.photo.length - 1];
        fileIdToForward = bestPhoto.file_id;
        const fileUrl = await getTelegramFileUrl(bestPhoto.file_id);
        if (fileUrl) photos.push(fileUrl);
      }
    } else if (callback_query) {
      chatId = callback_query.message.chat.id;
      text = callback_query.data;
      username = callback_query.from.username || callback_query.from.first_name;
    }

    if (!chatId) return res.status(200).json({ status: 'No chatId' });
    const stateRef = doc(db, 'telegram_states', String(chatId));

    if (text === '/setadmin') {
      await setDoc(doc(db, 'settings', 'admin_config'), { chatId: chatId });
      await sendMessage(chatId, "✅ ဤအကောင့်ကို Admin အဖြစ် သတ်မှတ်ပြီးပါပြီ။");
      return res.status(200).json({ status: 'success' });
    }

    // --- Admin Approvals ---
    if (text.startsWith('APP_P_') || text.startsWith('REJ_P_') || text.startsWith('APP_H_') || text.startsWith('REJ_H_') || text.startsWith('APP_D_') || text.startsWith('REJ_D_')) {
      const parts = text.split('_');
      const action = parts[0] + '_' + parts[1];
      const clientChatId = parts[2];
      const boyId = parts[3];

      const boySnap = await getDoc(doc(db, 'dateboys', boyId));
      if (!boySnap.exists()) return res.status(200).json({ status: 'not found' });
      const boy = boySnap.data();
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;

      if (action === 'APP_P') {
        const prPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : (boy.privatePhotos ? [boy.privatePhotos] : []);
        let validLinks = [];
        for (let i = 0; i < prPhotos.length; i++) {
          if (prPhotos[i].startsWith('http')) {
            await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: clientChatId, photo: prPhotos[i], protect_content: true }) });
          } else {
            validLinks.push(`[Private ပုံ ${i+1}](${prPhotos[i]})`);
          }
        }
        let privateLinksText = validLinks.length > 0 ? `\n\n🔒 *Private ဓာတ်ပုံများ:* ${validLinks.join(' | ')}` : "";

        const nextActionKeyboard = { inline_keyboard: [[{ text: "❤️ ခေါ်ယူမည် (Hire)", callback_data: `REQ_H_${boyId}` }], [{ text: "🔄 နောက်တစ်ယောက် ထပ်ရှာမည်", callback_data: "ROLE_CLIENT" }]] };
        await sendMessage(clientChatId, `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။ ဤသည်မှာ *${boyCode}* ၏ Private ပုံများဖြစ်ပါသည်-${privateLinksText}\n\nယခု Date Boy အား ခေါ်ယူလိုပါက အောက်ပါခလုတ်ကို နှိပ်ပါ။`, nextActionKeyboard);
        await sendMessage(chatId, `✅ *${boyCode}* ၏ Private ပုံများကို Client ထံ ပို့ပေးလိုက်ပါပြီ။`);
      } else if (action === 'REJ_P') {
        await sendMessage(clientChatId, `❌ *${boyCode}* ၏ Private ပုံကြည့်ရှုရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`);
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
      } else if (action === 'APP_H') {
        await sendMessage(clientChatId, `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။ *${boyCode}* နှင့် Dating ပြုလုပ်ရန် အတည်ပြုပြီးပါပြီ! 🎉\n\nAdmin မှ အသေးစိတ် ဆက်သွယ်ပေးပါမည်။`, MAIN_MENU_KEYBOARD);
        await sendMessage(chatId, `✅ Request ကို အတည်ပြုပေးလိုက်ပါပြီ။`);
      } else if (action === 'REJ_H') {
        await sendMessage(clientChatId, `❌ *${boyCode}* အား ခေါ်ယူရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`);
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
      } 
      // Date Boy Registration Approvals
      else if (action === 'APP_D') {
        await updateDoc(doc(db, 'dateboys', boyId), { status: 'approved' });
        await sendMessage(clientChatId, `🎉 ဝမ်းသာပါတယ် ခင်ဗျာ! သင့်ရဲ့ Date Boy လျှောက်လွှာကို Admin မှ အတည်ပြုပေးလိုက်ပါပြီ။`, MAIN_MENU_KEYBOARD);
        await sendMessage(chatId, `✅ *${boy.name}* ကို Date Boy အဖြစ် အတည်ပြုလိုက်ပါပြီ။`);
      } else if (action === 'REJ_D') {
        await deleteDoc(doc(db, 'dateboys', boyId));
        await sendMessage(clientChatId, `❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို ပယ်ချလိုက်ပါသည်။`);
        await sendMessage(chatId, `❌ *${boy.name}* ၏ လျှောက်လွှာကို ပယ်ချလိုက်ပါပြီ။`);
      }
      return res.status(200).json({ status: 'ok' });
    }

    if (text === '🔄 အစသို့ ပြန်သွားမည်' || text === '/start' || text === 'RESET') {
      await sendMessage(chatId, "ပင်မ စာမျက်နှာသို့ ပြန်သွားနေပါသည်...", MAIN_MENU_KEYBOARD);
      await startBotFlow(chatId, stateRef);
      return res.status(200).json({ status: 'success' });
    }
    if (text === '🔍 Date Boy ထပ်ရှာမည်') text = 'ROLE_CLIENT';
    
    if (text === '📞 Admin သို့ ဆက်သွယ်ရန်') {
      const config = await getAppConfig();
      await sendMessage(chatId, `📞 *Admin သို့ ဆက်သွယ်ရန်*\n\nအကူအညီ လိုအပ်ပါက အောက်ပါသို့ ဆက်သွယ်မေးမြန်းနိုင်ပါသည်။\n\n📱 ဖုန်း: ${config.paymentInfo.match(/\d+/) ? config.paymentInfo.match(/\d+/)[0] : 'N/A'}\n💬 Telegram: @AdminAccount`);
      return res.status(200).json({ status: 'success' });
    }

    const stateSnap = await getDoc(stateRef);
    const currentState = stateSnap.exists() ? stateSnap.data() : { step: 'IDLE', data: {} };

    if (currentState.step === 'CHOOSING_ROLE' || text === 'ROLE_CLIENT') {
      if (text === 'ROLE_CLIENT') {
        const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'));
        const snap = await getDocs(q);
        const cities = [...new Set(snap.docs.map(d => d.data().city))];

        if (cities.length === 0) {
          await sendMessage(chatId, "⚠️ လောလောဆယ် ရရှိနိုင်သော Date Boy များ မရှိသေးပါ။", MAIN_MENU_KEYBOARD);
          await setDoc(stateRef, { step: 'IDLE', data: {} });
        } else {
          const keyboard = cities.map(c => [{ text: `🏙️ ${c}`, callback_data: `CITY_${c}` }]);
          await setDoc(stateRef, { step: 'CLIENT_SELECT_CITY', data: {} });
          await sendMessage(chatId, "🔍 ကျေးဇူးပြု၍ ရှာဖွေလိုသော *မြို့* ကို အရင်ရွေးချယ်ပါ -", { inline_keyboard: keyboard });
        }
      } else if (text === 'ROLE_APPLICANT') {
        const config = await getAppConfig();
        await setDoc(stateRef, { step: 'APPLICANT_REQUIREMENTS', data: {} });
        await sendMessage(chatId, `📋 *Date Boy အဖြစ် လျှောက်ထားရန် လိုအပ်သည့်အချက်များ*\n\n${config.reqText}\n\nအထက်ပါ လိုအပ်ချက်များနှင့် ကိုက်ညီပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -`, {
          inline_keyboard: [[{ text: "✅ လိုအပ်သည့်အချက်များနှင့် ကိုက်ညီပါသည်", callback_data: "AGREE_REQ" }]]
        });
      }
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'APPLICANT_REQUIREMENTS' && text === 'AGREE_REQ') {
      const config = await getAppConfig();
      await setDoc(stateRef, { step: 'APPLICANT_RULES', data: {} });
      await sendMessage(chatId, `⚖️ *Date Boy လျှောက်ထားခြင်းအတွက် စည်းမျဉ်းစည်းကမ်းများ*\n\n${config.ruleText}\n\nသဘောတူညီပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -`, {
        inline_keyboard: [[{ text: "✅ သဘောတူပါသည် (စတင်မည်)", callback_data: "AGREE_RULES" }]]
      });
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'APPLICANT_RULES' && text === 'AGREE_RULES') {
      await setDoc(stateRef, { step: 'GET_NAME', data: {} });
      await sendMessage(chatId, "✍️ ကျေးဇူးပြု၍ သင့်ရဲ့ *အမည်* ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_NAME' && text) {
      await setDoc(stateRef, { step: 'GET_AGE', data: { ...currentState.data, name: text } });
      await sendMessage(chatId, "🎂 ကျေးဇူးပြု၍ သင့်ရဲ့ *အသက်* ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - ၂၅):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_AGE' && text) {
      await setDoc(stateRef, { step: 'GET_HEIGHT', data: { ...currentState.data, age: text } });
      await sendMessage(chatId, "📏 ကျေးဇူးပြု၍ သင့်ရဲ့ *အရပ်အမြင့်* ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - 5' 9\"):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_HEIGHT' && text) {
      await setDoc(stateRef, { step: 'GET_COCK_SIZE', data: { ...currentState.data, height: text } });
      await sendMessage(chatId, "🍆 ကျေးဇူးပြု၍ သင့်ရဲ့ *အရွယ်အစား (Cock Size)* ကို လက်မဖြင့် ရိုက်ထည့်ပေးပါ (ဥပမာ - 6\"):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_COCK_SIZE' && text) {
      await setDoc(stateRef, { step: 'GET_PHONE', data: { ...currentState.data, cockSize: text } });
      await sendMessage(chatId, "📞 ကျေးဇူးပြု၍ ဆက်သွယ်ရန် *ဖုန်းနံပါတ်* ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_PHONE' && text) {
      await setDoc(stateRef, { step: 'GET_CITY', data: { ...currentState.data, phone: text } });
      await sendMessage(chatId, "🏙️ ကျေးဇူးပြု၍ လက်ရှိနေထိုင်ရာ *မြို့* ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - မန္တလေး):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_CITY' && text) {
      await setDoc(stateRef, { step: 'GET_TOWNSHIP', data: { ...currentState.data, city: text } });
      await sendMessage(chatId, "📍 ကျေးဇူးပြု၍ နေထိုင်ရာ *မြို့နယ်* ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - ချမ်းအေးသာစံ):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_TOWNSHIP' && text) {
      await setDoc(stateRef, { step: 'GET_ADDRESS', data: { ...currentState.data, township: text } });
      await sendMessage(chatId, "🏠 ကျေးဇူးပြု၍ *နေရပ်လိပ်စာ အသေးစိတ်* ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_ADDRESS' && text) {
      await setDoc(stateRef, { step: 'GET_PUBLIC_PHOTOS', data: { ...currentState.data, address: text, publicPhotos: [] } });
      await sendMessage(chatId, "📸 ကျေးဇူးပြု၍ မျက်နှာသေချာမြင်ရသည့် *အလှဓာတ်ပုံ (၃) ပုံ* ကို တစ်ပုံချင်းစီ ပို့ပေးပါ\n\n(အခု ပထမဆုံးတစ်ပုံအရင်ပို့ပါ):");
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'GET_PUBLIC_PHOTOS') {
      const currentPublic = currentState.data.publicPhotos || [];
      if (photos.length > 0) {
        currentPublic.push(...photos);
        await setDoc(stateRef, { step: 'GET_PUBLIC_PHOTOS', data: { ...currentState.data, publicPhotos: currentPublic } });
      }
      
      if (currentPublic.length < 3) {
        await sendMessage(chatId, `📸 အလှဓာတ်ပုံ ${currentPublic.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါဦး။`);
      } else {
        await setDoc(stateRef, { step: 'GET_PRIVATE_PHOTOS', data: { ...currentState.data, publicPhotos: currentPublic, privatePhotos: [] } });
        await sendMessage(chatId, "✅ အလှဓာတ်ပုံ ၃ ပုံ ရရှိပါပြီ။\n\n🔒 ယခု အရွယ်အစား အမှန်အကန်ကို သေချာမြင်ရသော *ပစ္စည်းပုံ (Cock Photo) ၃ ပုံ* ကို တစ်ပုံချင်းစီ ပို့ပေးပါ။\n\n🔒(အခု ပထမဆုံးတစ်ပုံအရင်ပို့ပါ):");
      }
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'GET_PRIVATE_PHOTOS') {
      const currentPrivate = currentState.data.privatePhotos || [];
      if (photos.length > 0) {
        currentPrivate.push(...photos);
        await setDoc(stateRef, { step: 'GET_PRIVATE_PHOTOS', data: { ...currentState.data, privatePhotos: currentPrivate } });
      }
      
      if (currentPrivate.length < 3) {
        await sendMessage(chatId, `🔒 ပစ္စည်းပုံ ${currentPrivate.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါဦး။`);
      } else {
        const applicantData = currentState.data;
        const telegramProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;

        const locQuery = query(collection(db, 'locations'), where('city', '==', applicantData.city), where('township', '==', applicantData.township));
        const locSnap = await getDocs(locQuery);
        if (locSnap.empty) {
          await addDoc(collection(db, 'locations'), { city: applicantData.city, township: applicantData.township, status: 'pending' });
        }

        const finalData = {
          name: applicantData.name, age: applicantData.age, height: applicantData.height, cockSize: applicantData.cockSize,
          phone: applicantData.phone, city: applicantData.city, township: applicantData.township, address: applicantData.address,
          publicPhotos: applicantData.publicPhotos, privatePhotos: currentPrivate,
          telegramChatId: chatId, telegramProfileLink: telegramProfileLink, status: 'pending', createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'dateboys'), finalData);
        
        const adminChatId = await getAdminChatId();
        if (adminChatId) {
          const publicLinks = applicantData.publicPhotos.map((url, i) => `[ပုံ ${i+1}](${url})`).join(', ');
          const privateLinks = currentPrivate.map((url, i) => `[ပုံ ${i+1}](${url})`).join(', ');

          // 🚨 လိပ်စာအသေးစိတ် ထည့်သွင်းထားပြီး၊ Admin Panel စာသား ဖြုတ်ထားပါသည်
          const adminMsg = `🚨 *New Date Boy Registration* 🚨\n\n` +
                           `👤 *အမည်:* ${finalData.name}\n` +
                           `🎂 *အသက်:* ${finalData.age} နှစ်\n` +
                           `📏 *အရပ်:* ${finalData.height} | 🍆 *Size:* ${finalData.cockSize}\n` +
                           `📞 *ဖုန်း:* ${finalData.phone}\n` +
                           `📍 *မြို့နယ်:* ${finalData.township}, ${finalData.city}\n` +
                           `🏠 *လိပ်စာ အသေးစိတ်:* ${finalData.address}\n\n` +
                           `📸 *Public:* ${publicLinks}\n` +
                           `🔒 *Private:* ${privateLinks}\n\n` +
                           `🔗 *Telegram ဖြင့် ဆက်သွယ်ရန်:* [ဒီကိုနှိပ်ပါ](${telegramProfileLink})`;
          
          // Telegram မှ တိုက်ရိုက် အတည်ပြုနိုင်ရန် ခလုတ်များ
          const keyboard = { inline_keyboard: [[{ text: "✅ Approve", callback_data: `APP_D_${chatId}_${docRef.id}` }, { text: "❌ Reject", callback_data: `REJ_D_${chatId}_${docRef.id}` }]] };
          await sendMessage(adminChatId, adminMsg, keyboard);
        }

        await setDoc(stateRef, { step: 'IDLE', data: {} });
        await sendMessage(chatId, "🎉 အချက်အလက်ပေးပို့မှု အောင်မြင်စွာ ပြီးဆုံးပါပြီ။\n\nAdmin မှ ဆက်သွယ်လာတာကို စောင့်ဆိုင်းပေးပါ ခင်ဗျာ။ 🙏", MAIN_MENU_KEYBOARD);
      }
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'CLIENT_SELECT_CITY' && text.startsWith('CITY_')) {
      const selectedCity = text.replace('CITY_', '');
      const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'), where('city', '==', selectedCity));
      const snap = await getDocs(q);
      const townships = [...new Set(snap.docs.map(d => d.data().township))];
      
      const keyboard = townships.map(t => [{ text: `📍 ${t}`, callback_data: `TOWNSHIP_${t}` }]);
      keyboard.unshift([{ text: "🌐 မြို့နယ်အားလုံးပြရန်", callback_data: `TOWNSHIP_ALL_${selectedCity}` }]);

      await setDoc(stateRef, { step: 'CLIENT_SELECT_TOWNSHIP', data: {} });
      await sendMessage(chatId, `🔍 ${selectedCity} တွင် ရှာဖွေလိုသော *မြို့နယ်* ကို ရွေးချယ်ပါ -`, { inline_keyboard: keyboard });
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'CLIENT_SELECT_TOWNSHIP' && text.startsWith('TOWNSHIP_')) {
      let q, titleMsg = "";
      if (text.startsWith('TOWNSHIP_ALL_')) {
        const selectedCity = text.replace('TOWNSHIP_ALL_', '');
        q = query(collection(db, 'dateboys'), where('status', '==', 'approved'), where('city', '==', selectedCity));
        titleMsg = `${selectedCity} (တစ်မြို့လုံး)`;
      } else {
        const selectedTownship = text.replace('TOWNSHIP_', '');
        q = query(collection(db, 'dateboys'), where('status', '==', 'approved'), where('township', '==', selectedTownship));
        titleMsg = selectedTownship;
      }

      const snap = await getDocs(q);

      if (snap.empty) {
        await sendMessage(chatId, `⚠️ ဤနေရာတွင် Date Boy မရှိသေးပါ။ /start ဖြင့် အခြားနေရာ ပြောင်းရှာပါ။`, MAIN_MENU_KEYBOARD);
      } else {
        await sendMessage(chatId, `✨ *${titleMsg}* တွင် ရရှိနိုင်သော Date Boy (${snap.size} ယောက်):`);
        for (const dDoc of snap.docs) {
          await sendDateBoyCard(chatId, dDoc.data(), dDoc.id);
        }
        await sendMessage(chatId, "🔄 ထပ်မံရှာဖွေလိုပါက အောက်ပါ Menu ကို အသုံးပြုပါ။", MAIN_MENU_KEYBOARD);
      }
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      return res.status(200).json({ status: 'success' });
    }

    if (text.startsWith('REQ_P_')) {
      const boyId = text.replace('REQ_P_', '');
      const config = await getAppConfig();
      await setDoc(stateRef, { step: 'WAIT_PRIV_SS', data: { boyId } });
      await sendMessage(chatId, `🔒 Private ပုံများ ကြည့်ရှုခွင့်အတွက် ကျသင့်ငွေမှာ *${config.privFee} ကျပ်* ဖြစ်ပါသည်။\n\n💳 အောက်ပါအကောင့်သို့ ငွေလွှဲပေးပါ -\n\`${config.paymentInfo}\`\n\n📸 ပြီးပါက *ငွေလွှဲပြေစာ (Screenshot)* ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`);
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'WAIT_PRIV_SS' && photos.length > 0) {
      const boyId = currentState.data.boyId;
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      await sendMessage(chatId, "⏳ ငွေလွှဲပြေစာ ရရှိပါပြီ။ Admin မှ စစ်ဆေးပြီးပါက Private ပုံများကို ဤနေရာသို့ ပို့ပေးပါမည်။");

      const adminChatId = await getAdminChatId();
      if (adminChatId) {
        const clientProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;
        const adminMsg = `🚨 *Private Photo Request* 🚨\n\nCode: *${boyCode}*\nClient: [Profile](${clientProfileLink})\n\nClient မှ ငွေလွှဲပြေစာ ပို့ထားပါသည်။`;
        const keyboard = { inline_keyboard: [[{ text: "✅ Approve", callback_data: `APP_P_${chatId}_${boyId}` }, { text: "❌ Reject", callback_data: `REJ_P_${chatId}_${boyId}` }]] };
        await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminChatId, photo: fileIdToForward, caption: adminMsg, parse_mode: 'Markdown', reply_markup: keyboard }) });
      }
      return res.status(200).json({ status: 'success' });
    }

    if (text.startsWith('REQ_H_')) {
      const boyId = text.replace('REQ_H_', '');
      const config = await getAppConfig();
      await setDoc(stateRef, { step: 'WAIT_HIRE_SS', data: { boyId } });
      await sendMessage(chatId, `❤️ Date Boy ခေါ်ယူခြင်းအတွက် ဈေးနှုန်းများမှာ အောက်ပါအတိုင်းဖြစ်ပါသည် -\n\n🕒 Section: ${config.feeSec} ကျပ်\n☀️ Day: ${config.feeDay} ကျပ်\n🌙 Night: ${config.feeNight} ကျပ်\n\n💳 Booking တင်ရန်အတွက် စရံငွေ (၅၀%) ကို အောက်ပါအကောင့်သို့ လွှဲပေးပါ -\n\`${config.paymentInfo}\`\n\n📸 ပြီးပါက *ငွေလွှဲပြေစာ (Screenshot)* ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`);
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'WAIT_HIRE_SS' && photos.length > 0) {
      const boyId = currentState.data.boyId;
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      await sendMessage(chatId, "⏳ Booking စရံ ငွေလွှဲပြေစာ ရရှိပါပြီ။ Admin မှ အတည်ပြုပြီးပါက အကြောင်းပြန်ပေးပါမည်။");

      const adminChatId = await getAdminChatId();
      if (adminChatId) {
        const clientProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;
        const adminMsg = `🚨 *Dating Request (Booking)* 🚨\n\nDate Boy: *${boyCode}*\nClient: [Profile](${clientProfileLink})\n\nClient မှ Booking စရံပြေစာ ပို့ထားပါသည်။`;
        const keyboard = { inline_keyboard: [[{ text: "✅ Approve Hire", callback_data: `APP_H_${chatId}_${boyId}` }, { text: "❌ Reject", callback_data: `REJ_H_${chatId}_${boyId}` }]] };
        await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminChatId, photo: fileIdToForward, caption: adminMsg, parse_mode: 'Markdown', reply_markup: keyboard }) });
      }
      return res.status(200).json({ status: 'success' });
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(200).json({ error: error.message });
  }
}
