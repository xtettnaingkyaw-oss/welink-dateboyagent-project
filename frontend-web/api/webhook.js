import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

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

async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
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

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(200).json({ status: 'Bot Server is running!' });

    const { message, callback_query } = req.body;
    let chatId, text, photos = [], fileIdToForward = null;

    if (message) {
      chatId = message.chat.id;
      text = message.text ? message.text.trim() : '';
      if (message.photo && message.photo.length > 0) {
        const bestPhoto = message.photo[message.photo.length - 1];
        fileIdToForward = bestPhoto.file_id; // For fast forwarding to Admin
        const fileUrl = await getTelegramFileUrl(bestPhoto.file_id);
        if (fileUrl) photos.push(fileUrl);
      }
    } else if (callback_query) {
      chatId = callback_query.message.chat.id;
      text = callback_query.data;
    }

    if (!chatId) return res.status(200).json({ status: 'No chatId' });

    // Admin Commands
    if (text === '/setadmin') {
      await setDoc(doc(db, 'settings', 'admin_config'), { chatId: chatId });
      await sendMessage(chatId, "✅ ဤအကောင့်ကို Admin အဖြစ် သတ်မှတ်ပြီးပါပြီ။");
      return res.status(200).json({ status: 'success' });
    }

    // --- Admin Approval Actions via Callback Data ---
    if (text.startsWith('APP_P_') || text.startsWith('REJ_P_') || text.startsWith('APP_H_') || text.startsWith('REJ_H_')) {
      const parts = text.split('_');
      const action = parts[0] + '_' + parts[1]; // APP_P, REJ_P, APP_H, REJ_H
      const clientChatId = parts[2];
      const boyId = parts[3];

      const boySnap = await getDoc(doc(db, 'dateboys', boyId));
      if (!boySnap.exists()) return res.status(200).json({ status: 'not found' });
      const boy = boySnap.data();
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;

      if (action === 'APP_P') {
        // Send Private Photos to Client
        await sendMessage(clientChatId, `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။ ဤသည်မှာ *${boyCode}* ၏ Private ပုံများဖြစ်ပါသည်-`);
        const prPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : (boy.privatePhotos ? [boy.privatePhotos] : []);
        for (const url of prPhotos) {
          await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: clientChatId, photo: url }) });
        }
        await sendMessage(chatId, `✅ *${boyCode}* ၏ Private ပုံများကို Client ထံ ပို့ပေးလိုက်ပါပြီ။`);
      } else if (action === 'REJ_P') {
        await sendMessage(clientChatId, `❌ *${boyCode}* ၏ Private ပုံကြည့်ရှုရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`);
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
      } else if (action === 'APP_H') {
        await sendMessage(clientChatId, `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။ *${boyCode}* နှင့် Dating ပြုလုပ်ရန် အတည်ပြုပြီးပါပြီ! 🎉\n\nAdmin မှ အသေးစိတ် ဆက်သွယ်ပေးပါမည်။`);
        await sendMessage(chatId, `✅ *${boyCode}* နှင့် Dating Request ကို အတည်ပြုပေးလိုက်ပါပြီ။ Client ထံ ဆက်သွယ်ပေးပါ။`);
      } else if (action === 'REJ_H') {
        await sendMessage(clientChatId, `❌ *${boyCode}* အား ခေါ်ယူရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`);
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
      }
      return res.status(200).json({ status: 'ok' });
    }
    // ------------------------------------------------

    // /start Command
    if (text === '/start' || text === 'RESET') {
      const stateRef = doc(db, 'telegram_states', String(chatId));
      await setDoc(stateRef, { step: 'CHOOSING_ROLE', data: {} });
      await sendMessage(chatId, "✨ *WE LINK Dating Agency* မှ ကြိုဆိုပါတယ်ခင်ဗျာ! \n\nကျေးဇူးပြု၍ လိုချင်သော ဝန်ဆောင်မှုကို ရွေးချယ်ပေးပါ -", {
        inline_keyboard: [
          [{ text: "🔍 Date Boy ရှာမည်", callback_data: "ROLE_CLIENT" }],
          [{ text: "💼 Date Boy လျှောက်မည်", callback_data: "ROLE_APPLICANT" }]
        ]
      });
      return res.status(200).json({ status: 'success' });
    }

    const stateRef = doc(db, 'telegram_states', String(chatId));
    const stateSnap = await getDoc(stateRef);
    const currentState = stateSnap.exists() ? stateSnap.data() : { step: 'IDLE', data: {} };

    // 1️⃣ Client Flow: Select City First
    if (currentState.step === 'CHOOSING_ROLE' && text === 'ROLE_CLIENT') {
      const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'));
      const snap = await getDocs(q);
      const cities = [...new Set(snap.docs.map(d => d.data().city))];

      if (cities.length === 0) {
        await sendMessage(chatId, "⚠️ လောလောဆယ် ရရှိနိုင်သော Date Boy များ မရှိသေးပါ။");
        await setDoc(stateRef, { step: 'IDLE', data: {} });
      } else {
        const keyboard = cities.map(c => [{ text: `🏙️ ${c}`, callback_data: `CITY_${c}` }]);
        await setDoc(stateRef, { step: 'CLIENT_SELECT_CITY', data: {} });
        await sendMessage(chatId, "🔍 ကျေးဇူးပြု၍ ရှာဖွေလိုသော *မြို့* ကို အရင်ရွေးချယ်ပါ -", { inline_keyboard: keyboard });
      }
      return res.status(200).json({ status: 'success' });
    }

    // Select Township based on City
    if (currentState.step === 'CLIENT_SELECT_CITY' && text.startsWith('CITY_')) {
      const selectedCity = text.replace('CITY_', '');
      const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'), where('city', '==', selectedCity));
      const snap = await getDocs(q);
      const townships = [...new Set(snap.docs.map(d => d.data().township))];
      
      const keyboard = townships.map(t => [{ text: `📍 ${t}`, callback_data: `TOWNSHIP_${t}` }]);
      await setDoc(stateRef, { step: 'CLIENT_SELECT_TOWNSHIP', data: {} });
      await sendMessage(chatId, `🔍 ${selectedCity} တွင် ရှာဖွေလိုသော *မြို့နယ်* ကို ရွေးချယ်ပါ -`, { inline_keyboard: keyboard });
      return res.status(200).json({ status: 'success' });
    }

    // View Date Boys in Township
    if (currentState.step === 'CLIENT_SELECT_TOWNSHIP' && text.startsWith('TOWNSHIP_')) {
      const selectedTownship = text.replace('TOWNSHIP_', '');
      const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'), where('township', '==', selectedTownship));
      const snap = await getDocs(q);
      
      await sendMessage(chatId, `✨ *${selectedTownship}* တွင် ရရှိနိုင်သော Date Boy (${snap.size} ယောက်):`);
      
      for (const dDoc of snap.docs) {
        const boy = dDoc.data();
        const boyId = dDoc.id;
        const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
        const pPhotos = Array.isArray(boy.publicPhotos) ? boy.publicPhotos : (boy.publicPhoto ? [boy.publicPhoto] : []);
        
        const caption = `👤 *Code:* ${boyCode}\n🎂 *အသက်:* ${boy.age} နှစ်\n📏 *အရပ်:* ${boy.height}\n🍆 *Size:* ${boy.cockSize || 'N/A'}\n📍 *နေရာ:* ${boy.township}, ${boy.city}`;
        
        const keyboard = {
          inline_keyboard: [
            [{ text: "🔒 Private ပုံ ကြည့်ရန်", callback_data: `REQ_P_${boyId}` }],
            [{ text: "❤️ ခေါ်ယူမည် (Hire)", callback_data: `REQ_H_${boyId}` }]
          ]
        };

        if (pPhotos.length > 0) {
          await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, photo: pPhotos[0], caption, parse_mode: 'Markdown', reply_markup: keyboard }) });
        } else {
          await sendMessage(chatId, caption, keyboard);
        }
      }
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      return res.status(200).json({ status: 'success' });
    }

    // Request Private Photos (Prompt Payment)
    if (text.startsWith('REQ_P_')) {
      const boyId = text.replace('REQ_P_', '');
      const config = await getAppConfig();
      await setDoc(stateRef, { step: 'WAIT_PRIV_SS', data: { boyId } });
      await sendMessage(chatId, `🔒 Private ပုံများ ကြည့်ရှုခွင့်အတွက် ကျသင့်ငွေမှာ *${config.privFee} ကျပ်* ဖြစ်ပါသည်။\n\n💳 အောက်ပါအကောင့်သို့ ငွေလွှဲပေးပါ -\n\`${config.paymentInfo}\`\n\n📸 ပြီးပါက *ငွေလွှဲပြေစာ (Screenshot)* ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`);
      return res.status(200).json({ status: 'success' });
    }

    // Receive Screenshot for Private Photos
    if (currentState.step === 'WAIT_PRIV_SS' && photos.length > 0) {
      const boyId = currentState.data.boyId;
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      await sendMessage(chatId, "⏳ ငွေလွှဲပြေစာ ရရှိပါပြီ။ Admin မှ စစ်ဆေးပြီးပါက Private ပုံများကို ဤနေရာသို့ ပို့ပေးပါမည်။");

      const adminChatId = await getAdminChatId();
      if (adminChatId) {
        const adminMsg = `🚨 *Private Photo Request* 🚨\n\nCode: *${boyCode}*\nClient ID: ${chatId}\n\nClient မှ ငွေလွှဲပြေစာ ပို့ထားပါသည်။ အောက်ပါခလုတ်များကိုနှိပ်၍ အတည်ပြုပါ။`;
        const keyboard = { inline_keyboard: [[{ text: "✅ Approve", callback_data: `APP_P_${chatId}_${boyId}` }, { text: "❌ Reject", callback_data: `REJ_P_${chatId}_${boyId}` }]] };
        await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminChatId, photo: fileIdToForward, caption: adminMsg, parse_mode: 'Markdown', reply_markup: keyboard }) });
      }
      return res.status(200).json({ status: 'success' });
    }

    // Request Hire (Prompt Payment)
    if (text.startsWith('REQ_H_')) {
      const boyId = text.replace('REQ_H_', '');
      const config = await getAppConfig();
      await setDoc(stateRef, { step: 'WAIT_HIRE_SS', data: { boyId } });
      await sendMessage(chatId, `❤️ Date Boy ခေါ်ယူခြင်းအတွက် ဈေးနှုန်းများမှာ အောက်ပါအတိုင်းဖြစ်ပါသည် -\n\n🕒 Section: ${config.feeSec} ကျပ်\n☀️ Day: ${config.feeDay} ကျပ်\n🌙 Night: ${config.feeNight} ကျပ်\n\n💳 Booking တင်ရန်အတွက် စရံငွေ (၅၀%) ကို အောက်ပါအကောင့်သို့ လွှဲပေးပါ -\n\`${config.paymentInfo}\`\n\n📸 ပြီးပါက *ငွေလွှဲပြေစာ (Screenshot)* ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`);
      return res.status(200).json({ status: 'success' });
    }

    // Receive Screenshot for Hire
    if (currentState.step === 'WAIT_HIRE_SS' && photos.length > 0) {
      const boyId = currentState.data.boyId;
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      await sendMessage(chatId, "⏳ Booking စရံ ငွေလွှဲပြေစာ ရရှိပါပြီ။ Admin မှ အတည်ပြုပြီးပါက အကြောင်းပြန်ပေးပါမည်။");

      const adminChatId = await getAdminChatId();
      if (adminChatId) {
        const telegramProfileLink = message.from.username ? `https://t.me/${message.from.username}` : `tg://user?id=${chatId}`;
        const adminMsg = `🚨 *Dating Request (Booking)* 🚨\n\nDate Boy: *${boyCode}*\nClient Profile: [ဒီကိုနှိပ်ပါ](${telegramProfileLink})\n\nClient မှ Booking စရံပြေစာ ပို့ထားပါသည်။ အောက်ပါခလုတ်များကိုနှိပ်၍ အတည်ပြုပါ။`;
        const keyboard = { inline_keyboard: [[{ text: "✅ Approve Hire", callback_data: `APP_H_${chatId}_${boyId}` }, { text: "❌ Reject", callback_data: `REJ_H_${chatId}_${boyId}` }]] };
        await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminChatId, photo: fileIdToForward, caption: adminMsg, parse_mode: 'Markdown', reply_markup: keyboard }) });
      }
      return res.status(200).json({ status: 'success' });
    }
      } else if (text === 'ROLE_APPLICANT') {
        await setDoc(stateRef, { step: 'APPLICANT_RULES', data: {} });
        await sendMessage(chatId, "📋 *Date Boy လျှောက်ထားခြင်းအတွက် စည်းမျဉ်းစည်းကမ်းများ*\n\n1. အသက် ၂၁ နှစ်ပြည့်ပြီးသူ ဖြစ်ရပါမည်။\n2. ကိုယ်အမူအရာ သန့်ရှင်းသပ်ရပ်ရမည်။\n3. အမှန်တကယ် လုပ်ကိုင်လိုသူ ဖြစ်ရပါမည်။\n\nသဘောတူညီပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -", {
          inline_keyboard: [[{ text: "✅ သဘောတူပါသည် (စတင်မည်)", callback_data: "AGREE_RULES" }]]
        });
      }
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
      await sendMessage(chatId, "📸 ကျေးဇူးပြု၍ မျက်နှာသေချာမြင်ရသည့် *အလှဓာတ်ပုံ (၃) ပုံ* ကို တစ်ပုံချင်းစီ ပို့ပေးပါ:");
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
        await sendMessage(chatId, "✅ အလှဓာတ်ပုံ ၃ ပုံ ရရှိပါပြီ။\n\n🔒 ယခု အရွယ်အစား အမှန်အကန်ကို သေချာမြင်ရသော *ပစ္စည်းပုံ (Cock Photo) ၃ ပုံ* ကို ဆက်လက် ပို့ပေးပါ:");
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
        const telegramProfileLink = message.from.username ? `https://t.me/${message.from.username}` : `tg://user?id=${chatId}`;

        // ⚠️ ဤနေရာတွင် မြို့နယ်အသစ် ရှိ/မရှိ စစ်ဆေးပြီး မရှိပါက Pending သို့ ပို့ပေးမည် ⚠️
        const locQuery = query(collection(db, 'locations'), where('city', '==', applicantData.city), where('township', '==', applicantData.township));
        const locSnap = await getDocs(locQuery);
        if (locSnap.empty) {
          await addDoc(collection(db, 'locations'), {
            city: applicantData.city,
            township: applicantData.township,
            status: 'pending' // Admin Settings သို့ တက်လာမည်
          });
        }

        const finalData = {
          name: applicantData.name,
          age: applicantData.age,
          height: applicantData.height,
          cockSize: applicantData.cockSize,
          phone: applicantData.phone,
          city: applicantData.city,
          township: applicantData.township,
          address: applicantData.address,
          publicPhotos: applicantData.publicPhotos,
          privatePhotos: currentPrivate,
          telegramChatId: chatId,
          telegramProfileLink: telegramProfileLink,
          status: 'pending',
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'dateboys'), finalData);
        
        const adminChatId = await getAdminChatId();
        if (adminChatId) {
          const publicLinks = applicantData.publicPhotos.map((url, i) => `[ပုံ ${i+1}](${url})`).join(', ');
          const privateLinks = currentPrivate.map((url, i) => `[ပုံ ${i+1}](${url})`).join(', ');

          const adminMsg = `🚨 *New Date Boy Registration* 🚨\n\n` +
                           `👤 *အမည်:* ${finalData.name}\n` +
                           `🎂 *အသက်:* ${finalData.age} နှစ်\n` +
                           `📏 *အရပ်:* ${finalData.height} | 🍆 *Size:* ${finalData.cockSize}\n` +
                           `📞 *ဖုန်း:* ${finalData.phone}\n` +
                           `📍 *မြို့နယ်:* ${finalData.township}, ${finalData.city}\n\n` +
                           `📸 *Public:* ${publicLinks}\n` +
                           `🔒 *Private:* ${privateLinks}\n\n` +
                           `🔗 *Telegram ဖြင့် ဆက်သွယ်ရန်:* [ဒီကိုနှိပ်ပါ](${telegramProfileLink})\n\n` +
                           `💻 ဓာတ်ပုံများနှင့် အသေးစိတ်ကို *Admin Panel* တွင် ဝင်ရောက်စစ်ဆေးနိုင်ပါသည်။`;
          await sendMessage(adminChatId, adminMsg);
        }

        await setDoc(stateRef, { step: 'IDLE', data: {} });
        await sendMessage(chatId, "🎉 အချက်အလက်ပေးပို့မှု အောင်မြင်စွာ ပြီးဆုံးပါပြီ။\n\nAdmin မှ ဆက်သွယ်လာတာကို စောင့်ဆိုင်းပေးပါ ခင်ဗျာ။ 🙏");
      }
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'CLIENT_SELECT_TOWNSHIP' && text.startsWith('TOWNSHIP_')) {
      const selectedTownship = text.replace('TOWNSHIP_', '');
      const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'), where('township', '==', selectedTownship));
      const snap = await getDocs(q);

      if (snap.empty) {
        await sendMessage(chatId, `⚠️ ${selectedTownship} တွင် လောလောဆယ် Date Boy မရှိသေးပါ။ /start ဖြင့် အခြားမြို့နယ် ပြောင်းရှာပါ။`);
      } else {
        await sendMessage(chatId, `✨ *${selectedTownship}* တွင် ရရှိနိုင်သော Date Boy များ (${snap.size} ယောက်):`);
        for (const dDoc of snap.docs) {
          const boy = dDoc.data();
          const pPhotos = Array.isArray(boy.publicPhotos) ? boy.publicPhotos : (boy.publicPhoto ? [boy.publicPhoto] : []);
          const caption = `👤 *အမည်:* ${boy.name}\n🎂 *အသက်:* ${boy.age} နှစ်\n📏 *အရပ်:* ${boy.height}\n📍 *လိပ်စာ:* ${boy.township}, ${boy.city}\n📞 *ဖုန်း:* ${boy.phone}\n\n🔒 *Private ပုံများကြည့်ရှုရန်:* ဝန်ဆောင်ခပေးချေရန် Admin သို့ ဆက်သွယ်ပါ။`;
          if (pPhotos.length > 0) {
            await fetch(`${TELEGRAM_API}/sendPhoto`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, photo: pPhotos[0], caption, parse_mode: 'Markdown' })
            });
          } else {
            await sendMessage(chatId, caption);
          }
        }
        await sendMessage(chatId, "🔄 ထပ်မံရှာဖွေလိုပါက /start ကို နှိပ်ပါ။");
      }
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      return res.status(200).json({ status: 'success' });
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(200).json({ error: error.message });
  }
}
