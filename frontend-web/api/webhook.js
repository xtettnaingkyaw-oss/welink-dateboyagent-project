import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// ⚠️ သတိပြုရန် - သင်၏ Telegram ကို Admin အဖြစ် သတ်မှတ်ရန် အောက်ပါ /setadmin command ကို သုံးပါ ⚠️
// Admin ID ကို Database ထဲမှ ယူရန်
async function getAdminChatId() {
  const adminDoc = await getDoc(doc(db, 'settings', 'admin_config'));
  if (adminDoc.exists()) {
    return adminDoc.data().chatId;
  }
  return null;
}

async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('SendMessage Error:', err);
  }
}

async function getTelegramFileUrl(fileId) {
  try {
    const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (data.ok) {
      return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
    }
  } catch (e) {
    console.error('Error getting file URL:', e);
  }
  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ status: 'Bot Server is running!' });
    }

    const { message, callback_query } = req.body;
    let chatId, text, username, photos = [];

    if (message) {
      chatId = message.chat.id;
      text = message.text ? message.text.trim() : '';
      username = message.from.username || message.from.first_name;
      
      // ပုံပို့လာလျှင် အကောင်းဆုံး Quality ကို ယူမည်
      if (message.photo && message.photo.length > 0) {
        const bestPhoto = message.photo[message.photo.length - 1];
        const fileUrl = await getTelegramFileUrl(bestPhoto.file_id);
        if (fileUrl) photos.push(fileUrl);
      }
    } else if (callback_query) {
      chatId = callback_query.message.chat.id;
      text = callback_query.data;
      username = callback_query.from.username || callback_query.from.first_name;
    }

    if (!chatId) return res.status(200).json({ status: 'No chatId' });

    // 👨‍💻 သင်ကိုယ်တိုင် Admin အဖြစ် သတ်မှတ်ရန် (Telegram တွင် /setadmin ဟု ရိုက်ပို့ပါ) 👨‍💻
    if (text === '/setadmin') {
      await setDoc(doc(db, 'settings', 'admin_config'), { chatId: chatId });
      await sendMessage(chatId, "✅ ဤအကောင့်ကို Admin အဖြစ် အောင်မြင်စွာ သတ်မှတ်ပြီးပါပြီ။ လျှောက်လွှာအသစ်များကို ဤနေရာသို့ ပေးပို့ပါမည်။");
      return res.status(200).json({ status: 'success' });
    }

    // /start ဖြင့် အစပြန်စရန်
    if (text === '/start' || text === 'RESET') {
      const stateRef = doc(db, 'telegram_states', String(chatId));
      await setDoc(stateRef, { step: 'CHOOSING_ROLE', data: {} });
      
      await sendMessage(chatId, "✨ *WE LINK Dating Agency* မှ ကြိုဆိုပါတယ်ခင်ဗျာ! \n\nကျေးဇူးပြု၍ လိုချင်သော ဝန်ဆောင်မှုကို ရွေးချယ်ပေးပါ -", {
        inline_keyboard: [
          [{ text: "🔍 Date Boy ရှာမည် (Client)", callback_data: "ROLE_CLIENT" }],
          [{ text: "💼 Date Boy လျှောက်မည် (Applicant)", callback_data: "ROLE_APPLICANT" }]
        ]
      });
      return res.status(200).json({ status: 'success' });
    }

    const stateRef = doc(db, 'telegram_states', String(chatId));
    const stateSnap = await getDoc(stateRef);
    const currentState = stateSnap.exists() ? stateSnap.data() : { step: 'IDLE', data: {} };

    // -----------------------------------------------------
    // 1️⃣ ရွေးချယ်မှု အဆင့် (CHOOSING ROLE)
    // -----------------------------------------------------
    if (currentState.step === 'CHOOSING_ROLE') {
      if (text === 'ROLE_CLIENT') {
        const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'));
        const snap = await getDocs(q);
        const townships = [...new Set(snap.docs.map(d => d.data().township))];

        if (townships.length === 0) {
          await sendMessage(chatId, "⚠️ လောလောဆယ် ရရှိနိုင်သော Date Boy များ မရှိသေးပါ။ /start ဖြင့် အစမှ ပြန်စပါ။");
          await setDoc(stateRef, { step: 'IDLE', data: {} });
        } else {
          const keyboard = townships.map(t => [{ text: `📍 ${t}`, callback_data: `TOWNSHIP_${t}` }]);
          await setDoc(stateRef, { step: 'CLIENT_SELECT_TOWNSHIP', data: {} });
          await sendMessage(chatId, "🔍 ကျေးဇူးပြု၍ ရှာဖွေလိုသော မြို့နယ်ကို ရွေးချယ်ပါ -", { inline_keyboard: keyboard });
        }
      } else if (text === 'ROLE_APPLICANT') {
        await setDoc(stateRef, { step: 'APPLICANT_RULES', data: {} });
        await sendMessage(chatId, "📋 *Date Boy လျှောက်ထားခြင်းအတွက် စည်းမျဉ်းစည်းကမ်းများ*\n\n1. အသက် ၂၁ နှစ်ပြည့်ပြီးသူ ဖြစ်ရပါမည်။\n2. ကိုယ်အမူအရာ သန့်ရှင်းသပ်ရပ်ရမည်။\n3. အမှန်တကယ် လုပ်ကိုင်လိုသူ ဖြစ်ရပါမည်။\n\nသဘောတူညီပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -", {
          inline_keyboard: [[{ text: "✅ သဘောတူပါသည် (စတင်မည်)", callback_data: "AGREE_RULES" }]]
        });
      }
      return res.status(200).json({ status: 'success' });
    }

    // -----------------------------------------------------
    // 2️⃣ Date Boy လျှောက်ထားခြင်း (Data Collection)
    // -----------------------------------------------------
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

    // သီးသန့် အချက်အလက် တောင်းခံခြင်း (Cock Size)
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

    // 📸 ပုံများ တောင်းခံခြင်း (Public 3 ပုံ)
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

    // 📸 ပုံများ တောင်းခံခြင်း (Private 3 ပုံ) နှင့် Database သို့ ပို့ခြင်း
    if (currentState.step === 'GET_PRIVATE_PHOTOS') {
      const currentPrivate = currentState.data.privatePhotos || [];
      if (photos.length > 0) {
        currentPrivate.push(...photos);
        await setDoc(stateRef, { step: 'GET_PRIVATE_PHOTOS', data: { ...currentState.data, privatePhotos: currentPrivate } });
      }
      
      if (currentPrivate.length < 3) {
        await sendMessage(chatId, `🔒 ပစ္စည်းပုံ ${currentPrivate.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါဦး။`);
      } else {
        // Data အပြည့်အစုံ ရရှိသွားပါပြီ - Database သို့ သိမ်းမည်
        const applicantData = currentState.data;
        const telegramProfileLink = message.from.username ? `https://t.me/${message.from.username}` : `tg://user?id=${chatId}`;

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

        // Date Boy အဖြစ် Firestore သို့ သိမ်းခြင်း
        const docRef = await addDoc(collection(db, 'dateboys'), finalData);
        
        // 🔔 Admin ဆီသို့ Notification ပို့ခြင်း
        const adminChatId = await getAdminChatId();
        if (adminChatId) {
          // ပုံများကို နှိပ်ကြည့်နိုင်သော လင့်ခ်များအဖြစ် ပြောင်းခြင်း
          const publicLinks = applicantData.publicPhotos.map((url, i) => `[ပုံ ${i+1}](${url})`).join(', ');
          const privateLinks = currentPrivate.map((url, i) => `[ပုံ ${i+1}](${url})`).join(', ');

          const adminMsg = `🚨 *New Date Boy Registration* 🚨\n\n` +
                           `👤 *အမည်:* ${finalData.name}\n` +
                           `🎂 *အသက်:* ${finalData.age} နှစ်\n` +
                           `📏 *အရပ်:* ${finalData.height}\n` +
                           `🍆 *Size:* ${finalData.cockSize}\n` +
                           `📞 *ဖုန်း:* ${finalData.phone}\n` +
                           `📍 *မြို့နယ်:* ${finalData.township}, ${finalData.city}\n\n` +
                           `📸 *Public Photos:* ${publicLinks}\n` +
                           `🔒 *Private Photos:* ${privateLinks}\n\n` +
                           `🔗 *Telegram ဖြင့် ဆက်သွယ်ရန်:* [ဒီကိုနှိပ်ပါ](${telegramProfileLink})\n\n` +
                           `💻 ဓာတ်ပုံများနှင့် အသေးစိတ်ကို *Admin Panel* တွင် ဝင်ရောက်စစ်ဆေးနိုင်ပါသည်။`;
          await sendMessage(adminChatId, adminMsg);
        }

        // လျှောက်ထားသူအား အကြောင်းကြားခြင်း
        await setDoc(stateRef, { step: 'IDLE', data: {} });
        await sendMessage(chatId, "🎉 အချက်အလက်ပေးပို့မှု အောင်မြင်စွာ ပြီးဆုံးပါပြီ။\n\nAdmin မှ ဆက်သွယ်လာတာကို စောင့်ဆိုင်းပေးပါ ခင်ဗျာ။ 🙏");
      }
      return res.status(200).json({ status: 'success' });
    }

    // -----------------------------------------------------
    // 3️⃣ Client Flow (ရှာဖွေသူများအတွက်)
    // -----------------------------------------------------
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
            // ပထမဆုံး Public ပုံကို ပြမည်
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
