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

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ status: 'Telegram Bot is running!' });
    }

    const { message, callback_query } = req.body;
    let chatId, text;

    if (message) {
      chatId = message.chat.id;
      text = message.text ? message.text.trim() : '';
    } else if (callback_query) {
      chatId = callback_query.message.chat.id;
      text = callback_query.data;
    }

    if (!chatId) return res.status(200).json({ status: 'No chatId' });

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

    // Role Selection Handling
    const stateRef = doc(db, 'telegram_states', String(chatId));
    const stateSnap = await getDoc(stateRef);
    const currentState = stateSnap.exists() ? stateSnap.data() : { step: 'IDLE', data: {} };

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
        await sendMessage(chatId, "📋 *Date Boy လျှောက်ထားခြင်းအတွက် စည်းမျဉ်းစည်းကမ်းများ*\n\n1. အသက် ၂၁ နှစ်ပြည့်ပြီးသူ ဖြစ်ရပါမည်။\n2. ကိုယ်အမူအရာ သန့်ရှင်းသပ်ရပ်ရမည်။\n\nသဘောတူညီပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -", {
          inline_keyboard: [[{ text: "✅ သဘောတူပါသည် (စတင်မည်)", callback_data: "AGREE_RULES" }]]
        });
      }
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'APPLICANT_RULES' && text === 'AGREE_RULES') {
      await setDoc(stateRef, { step: 'GET_NAME', data: {} });
      await sendMessage(chatId, "✍️ ကျေးဇူးပြု၍ သင့်ရဲ့ *နာမည်အပြည့်အစုံ* ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'GET_NAME' && text) {
      await setDoc(stateRef, { step: 'GET_AGE', data: { ...currentState.data, name: text } });
      await sendMessage(chatId, "🎂 ကျေးဇူးပြု၍ သင့်ရဲ့ *အသက်* ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - ၂၅):");
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'GET_AGE' && text) {
      await setDoc(stateRef, { step: 'GET_PHONE', data: { ...currentState.data, age: text } });
      await sendMessage(chatId, "📞 ကျေးဇူးပြု၍ သင့်ရဲ့ *ဖုန်းနံပါတ်* ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: 'success' });
    }

    // နောက်ထပ် အဆင့်များ ဆက်လက် လုပ်ဆောင်ရန်
    await sendMessage(chatId, "ℹ️ အချက်အလက်များကို လက်ခံရရှိပါသည်။ /start ဖြင့် အစမှ ပြန်စနိုင်ပါသည်။");
    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook Runtime Error:', error);
    if (req.body && req.body.message) {
      await sendMessage(req.body.message.chat.id, `⚠️ System Error ဖြစ်ပေါ်နေပါသည်: ${error.message}`);
    }
    return res.status(200).json({ error: error.message });
  }
}
