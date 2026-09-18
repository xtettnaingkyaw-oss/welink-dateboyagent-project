import { db } from '../src/config/firebase';
import { collection, doc, getDoc, setDoc, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text, replyMarkup = null) {
  const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function sendPhoto(chatId, photoUrl, caption = '') {
  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'Markdown' })
  });
}

async function getTelegramFileUrl(fileId) {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (data.ok) {
    return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Telegram Bot is running!' });
  }

  const { message, callback_query } = req.body;
  
  let chatId, text, photos = [];
  if (message) {
    chatId = message.chat.id;
    text = message.text ? message.text.trim() : '';
    if (message.photo) {
      const bestPhoto = message.photo[message.photo.length - 1];
      const fileUrl = await getTelegramFileUrl(bestPhoto.file_id);
      if (fileUrl) photos.push(fileUrl);
    }
  } else if (callback_query) {
    chatId = callback_query.message.chat.id;
    text = callback_query.data;
  }

  if (!chatId) return res.status(200).json({ status: 'No chatId' });

  // User State ယူရန်
  const stateRef = doc(db, 'telegram_states', String(chatId));
  const stateSnap = await getDoc(stateRef);
  let currentState = stateSnap.exists() ? stateSnap.data() : { step: 'IDLE', data: {} };

  // /start ဖြင့် အစပြန်စရန်
  if (text === '/start' || text === 'RESET') {
    await setDoc(stateRef, { step: 'CHOOSING_ROLE', data: {} });
    await sendMessage(chatId, "✨ *WE LINK Dating Agency* မှ ကြိုဆိုပါတယ်ခင်ဗျာ! \n\nကျေးဇူးပြု၍ လိုချင်သော ဝန်ဆောင်မှုကို ရွေးချယ်ပေးပါ -", {
      inline_keyboard: [
        [{ text: "🔍 Date Boy ရှာမည် (Client)", callback_data: "ROLE_CLIENT" }],
        [{ text: "💼 Date Boy လျှောက်မည် (Applicant)", callback_data: "ROLE_APPLICANT" }]
      ]
    });
    return res.status(200).json({ status: 'success' });
  }

  // 1️⃣ ROLE SELECTION
  if (currentState.step === 'CHOOSING_ROLE') {
    if (text === 'ROLE_CLIENT') {
      // ရရှိနိုင်သော မြို့နယ်များကို ရှာမည်
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

  // 2️⃣ CLIENT FLOW: Township Selected
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
        const caption = `👤 *အမည်:* ${boy.name}\n🎂 *အသက်:* ${boy.age} နှစ်\n📏 *အရပ်:* ${boy.height}\n📍 *လိပ်စာ:* ${boy.township}, ${boy.city}\n📞 *ဖုန်း:* ${boy.phone}\n\n🔒 *Private ပုံများကြည့်ရှုရန်:* ဝန်ဆောင်ခ (၅,၀၀၀ ကျပ်) ပေးချေရန် Admin (@admin) သို့ ဆက်သွယ်ပါ။`;
        if (boy.publicPhotos && boy.publicPhotos.length > 0) {
          await sendPhoto(chatId, boy.publicPhotos[0], caption);
        } else if (boy.publicPhoto) {
          await sendPhoto(chatId, boy.publicPhoto, caption);
        } else {
          await sendMessage(chatId, caption);
        }
      }
      await sendMessage(chatId, "🔄 ထပ်မံရှာဖွေလိုပါက /start ကို နှိပ်ပါ။");
    }
    await setDoc(stateRef, { step: 'IDLE', data: {} });
    return res.status(200).json({ status: 'success' });
  }

  // 3️⃣ APPLICANT FLOW: Rules Agreed -> Ask Name
  if (currentState.step === 'APPLICANT_RULES' && text === 'AGREE_RULES') {
    await setDoc(stateRef, { step: 'GET_NAME', data: {} });
    await sendMessage(chatId, "✍️ ကျေးဇူးပြု၍ သင့်ရဲ့ *နာမည်အပြည့်အစုံ* ကို ရိုက်ထည့်ပေးပါ:");
    return res.status(200).json({ status: 'success' });
  }

  // Collecting Info Step-by-Step
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
    await setDoc(stateRef, { step: 'GET_PHONE', data: { ...currentState.data, height: text } });
    await sendMessage(chatId, "📞 ကျေးဇူးပြု၍ သင့်ရဲ့ *ဖုန်းနံပါတ်* ကို ရိုက်ထည့်ပေးပါ:");
    return res.status(200).json({ status: 'success' });
  }

  if (currentState.step === 'GET_PHONE' && text) {
    await setDoc(stateRef, { step: 'GET_TOWNSHIP', data: { ...currentState.data, phone: text } });
    await sendMessage(chatId, "📍 ကျေးဇူးပြု၍ သင်နေထိုင်ရာ *မြို့နယ်* နှင့် *မြို့* ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - ချမ်းအေးသာစံ၊ မန္တလေး):");
    return res.status(200).json({ status: 'success' });
  }

  if (currentState.step === 'GET_TOWNSHIP' && text) {
    await setDoc(stateRef, { step: 'GET_ADDRESS', data: { ...currentState.data, township: text, city: 'Mandalay' } });
    await sendMessage(chatId, "🏠 ကျေးဇူးပြု၍ သင့်ရဲ့ *လိပ်စာအပြည့်အစုံ* ကို ရိုက်ထည့်ပေးပါ:");
    return res.status(200).json({ status: 'success' });
  }

  if (currentState.step === 'GET_ADDRESS' && text) {
    await setDoc(stateRef, { step: 'GET_PUBLIC_PHOTOS', data: { ...currentState.data, address: text, publicPhotos: [] } });
    await sendMessage(chatId, "📸 ကျေးဇူးပြု၍ သင့်ရဲ့ *Public ပုံများ (အနည်းဆုံး ၃ ပုံ)* ကို တစ်ပုံချင်းစီ (သို့မဟုတ်) အုပ်စုလိုက် ပို့ပေးပါ (၃ ပုံပြည့်ပါက ဆက်သွားပါမည်):");
    return res.status(200).json({ status: 'success' });
  }

  // Public Photos Collection
  if (currentState.step === 'GET_PUBLIC_PHOTOS') {
    const currentPublic = currentState.data.publicPhotos || [];
    if (photos.length > 0) {
      currentPublic.push(...photos);
      await setDoc(stateRef, { step: 'GET_PUBLIC_PHOTOS', data: { ...currentState.data, publicPhotos: currentPublic } });
    }
    if (currentPublic.length < 3) {
      await sendMessage(chatId, `📸 Public ပုံ ${currentPublic.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါ။`);
    } else {
      await setDoc(stateRef, { step: 'GET_PRIVATE_PHOTOS', data: { ...currentState.data, publicPhotos: currentPublic, privatePhotos: [] } });
      await sendMessage(chatId, "✅ Public ပုံများ ရရှိပါပြီ။\n\n🔒 ယခု *Private ပုံများ (အနည်းဆုံး ၃ ပုံ)* ကို ဆက်လက် ပို့ပေးပါ:");
    }
    return res.status(200).json({ status: 'success' });
  }

  // Private Photos Collection & Final Submit to Admin Panel
  if (currentState.step === 'GET_PRIVATE_PHOTOS') {
    const currentPrivate = currentState.data.privatePhotos || [];
    if (photos.length > 0) {
      currentPrivate.push(...photos);
      await setDoc(stateRef, { step: 'GET_PRIVATE_PHOTOS', data: { ...currentState.data, privatePhotos: currentPrivate } });
    }
    if (currentPrivate.length < 3) {
      await sendMessage(chatId, `🔒 Private ပုံ ${currentPrivate.length}/3 ပုံ ရရှိပြီ။ နောက်ထပ် ပုံ ပို့ပေးပါ။`);
    } else {
      // 🚀 Save to Firestore (Admin Panel Pending list)
      const finalData = {
        name: currentState.data.name,
        age: currentState.data.age,
        height: currentState.data.height,
        phone: currentState.data.phone,
        township: currentState.data.township,
        city: currentState.data.city || 'Mandalay',
        address: currentState.data.address,
        publicPhotos: currentState.data.publicPhotos,
        privatePhotos: currentPrivate,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'dateboys'), finalData);
      await setDoc(stateRef, { step: 'IDLE', data: {} });

      await sendMessage(chatId, "🎉 ကျေးဇူးတင်ပါတယ်ခင်ဗျာ! သင့်ရဲ့ လျှောက်လွှာနှင့် ပုံများကို Admin ထံသို့ အောင်မြင်စွာ ပို့စ်တင်ပြီးပါပြီ။\n\nAdmin မှ စစ်ဆေးအတည်ပြုပြီးပါက အကြောင်းပြန်ပေးပါမည်။ 🙏");
    }
    return res.status(200).json({ status: 'success' });
  }

  return res.status(200).json({ status: 'ok' });
}
