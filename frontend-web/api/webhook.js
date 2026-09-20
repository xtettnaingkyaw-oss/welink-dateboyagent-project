import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, getDocs, query, where, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = { apiKey: process.env.VITE_FIREBASE_API_KEY, authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: process.env.VITE_FIREBASE_PROJECT_ID, storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: process.env.VITE_FIREBASE_APP_ID };
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// 🛡️ စာသားများ Error မတက်စေရန် Helper
function escapeHTML(str) {
  if (!str) return '';
  return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 🛡️ ပုံလင့်ခ်များ ပျောက်မသွားစေရန် Helper
function processMediaLinks(mediaArray, typeLabel) {
  if (!Array.isArray(mediaArray)) return "";
  let validLinks = [];
  let base64Count = 0;
  for (let i = 0; i < mediaArray.length; i++) {
    if (mediaArray[i].startsWith('http')) {
      const safeUrl = mediaArray[i].replace(/&/g, '&amp;');
      validLinks.push(`<a href="${safeUrl}">${typeLabel} ${i+1}</a>`);
    } else if (mediaArray[i].startsWith('data:')) {
      base64Count++;
    }
  }
  let resultText = validLinks.length > 0 ? validLinks.join(' | ') : "";
  if (base64Count > 0) {
    resultText += resultText ? ` | ` : "";
    resultText += `<i>(Web မှတင်ထားသော ပုံ ${base64Count} ပုံ ပါဝင်သည်။ Admin အား တောင်းဆိုပါ)</i>`;
  }
  return resultText;
}

async function getAdminChatId() {
  const adminDoc = await getDoc(doc(db, 'settings', 'admin_config'));
  return adminDoc.exists() ? adminDoc.data().chatId : null;
}

async function getAppConfig() {
  const cDoc = await getDoc(doc(db, 'settings', 'app_config'));
  return cDoc.exists() ? cDoc.data() : { 
    paymentInfo: 'Admin ကိုဆက်သွယ်ပါ', privFee: 5000, feeSec: 30000, feeDay: 70000, feeNight: 100000, clientIdFee: 10000,
    reqText: '၁။ အသက် ၂၁ နှစ်ပြည့်ပြီးသူ ဖြစ်ရပါမည်။', ruleText: '၁။ အမှန်တကယ် လုပ်ကိုင်လိုသူ ဖြစ်ရပါမည်။' 
  };
}

const MAIN_MENU_KEYBOARD = {
  keyboard: [[{ text: "🔄 အစသို့ ပြန်သွားမည်" }, { text: "🔍 Date Boy ထပ်ရှာမည်" }], [{ text: "💼 Date Boy လျှောက်မည်" }]],
  resize_keyboard: true, is_persistent: true
};

async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const body = { chat_id: chatId, text, parse_mode: 'HTML', protect_content: true };
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
  
  const publicLinksText = processMediaLinks(pPhotos, "Public ပုံ");
  const publicDisplay = publicLinksText ? `\n\n📸 <b>Public ပုံများ:</b> ${publicLinksText}` : "";

  const caption = `👤 <b>Code:</b> ${boyCode}\n🎂 <b>အသက်:</b> ${escapeHTML(boy.age)} နှစ်\n📏 <b>အရပ်:</b> ${escapeHTML(boy.height)}\n🍆 <b>Size:</b> ${escapeHTML(boy.cockSize || 'N/A')}\n📍 <b>နေရာ:</b> ${escapeHTML(boy.township)}, ${escapeHTML(boy.city)}${publicDisplay}`;
  const keyboard = { inline_keyboard: [[{ text: "🔒 Private ပုံ ကြည့်ရန်", callback_data: `REQ_P_${boyId}` }], [{ text: "❤️ ခေါ်ယူမည် (Hire)", callback_data: `REQ_H_${boyId}` }]] };
  await sendMessage(chatId, caption, keyboard);
}

async function startBotFlow(chatId, stateRef) {
  await setDoc(stateRef, { step: 'CHOOSING_ROLE', data: {} });
  await sendMessage(chatId, "✨ <b>WE LINK Dating Agency</b> မှ ကြိုဆိုပါတယ်ခင်ဗျာ! \n\nကျေးဇူးပြု၍ လိုချင်သော ဝန်ဆောင်မှုကို ရွေးချယ်ပေးပါ -", {
    inline_keyboard: [[{ text: "🔍 Date Boy ရှာမည်", callback_data: "ROLE_CLIENT" }], [{ text: "💼 Date Boy လျှောက်မည်", callback_data: "ROLE_APPLICANT" }]]
  });
}

export default async function handler(req, res) {
  let globalChatId = null;

  try {
    if (req.method !== 'POST') return res.status(200).json({ status: 'Bot Server is running!' });

    // Admin Panel ကနေ လှမ်းခေါ်တဲ့လုပ်ဆောင်ချက်
    if (req.body.internal_action === 'notify_user') {
      await sendMessage(req.body.chatId, req.body.text, req.body.useMenu ? MAIN_MENU_KEYBOARD : null);
      return res.status(200).json({ status: 'notified' });
    }

    const { message, callback_query } = req.body;
    let chatId, text, photos = [], fileIdToForward = null, username = null;

    if (message) {
      chatId = message.chat.id;
      globalChatId = chatId;
      text = message.text ? message.text.trim() : '';
      username = message.from.username || message.from.first_name;
      
      let targetFileId = null;
      if (message.photo && message.photo.length > 0) targetFileId = message.photo[message.photo.length - 1].file_id;
      else if (message.video) targetFileId = message.video.file_id;
      else if (message.document) targetFileId = message.document.file_id;

      if (targetFileId) {
        fileIdToForward = targetFileId;
        const fileUrl = await getTelegramFileUrl(targetFileId);
        if (fileUrl) photos.push(fileUrl);
      }
    } else if (callback_query) {
      chatId = callback_query.message.chat.id;
      globalChatId = chatId;
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

    const adminChatId = await getAdminChatId();

    if (text.toUpperCase().trim().startsWith('WLDB-')) {
      if (!adminChatId || chatId.toString() !== adminChatId.toString()) {
        await sendMessage(chatId, "⚠️ ဤလုပ်ဆောင်ချက်ကို Admin သာ အသုံးပြုနိုင်ပါသည်။");
        return res.status(200).json({ status: 'ok' });
      }
      
      const searchCode = text.toUpperCase().trim();
      const snap = await getDocs(collection(db, 'dateboys'));
      let foundBoy = null;
      let foundBoyId = null;
      
      snap.forEach(d => {
        const code = `WLDB-${d.id.substring(0, 5).toUpperCase()}`;
        if (code === searchCode) { foundBoy = d.data(); foundBoyId = d.id; }
      });

      if (foundBoy) {
        const publicLinks = processMediaLinks(foundBoy.publicPhotos, "Public ပုံ");
        const privateLinks = processMediaLinks(foundBoy.privatePhotos, "Private ပုံ");
        let videoLink = 'မရှိပါ';
        if (foundBoy.privateVideo) {
          if (foundBoy.privateVideo.startsWith('http')) {
            const safeVid = foundBoy.privateVideo.replace(/&/g, '&amp;');
            videoLink = `<a href="${safeVid}">Video ကြည့်ရန်</a>`;
          }
          else videoLink = `<i>Web မှတင်ထားသော Video ဖြစ်သဖြင့် တိုက်ရိုက်ပြ၍ မရပါ</i>`;
        }

        const tgLink = foundBoy.telegramProfileLink || `tg://user?id=${foundBoy.telegramChatId}`;

        const adminMsg = `🔍 <b>Date Boy အချက်အလက် (Admin View)</b>\n\n` +
                         `🆔 <b>Code:</b> ${searchCode}\n` +
                         `👤 <b>အမည်:</b> ${escapeHTML(foundBoy.name)}\n` +
                         `🎂 <b>အသက်:</b> ${escapeHTML(foundBoy.age)} နှစ်\n` +
                         `📏 <b>အရပ်:</b> ${escapeHTML(foundBoy.height)} | 🍆 <b>Size:</b> ${escapeHTML(foundBoy.cockSize || 'N/A')}\n` +
                         `📞 <b>ဖုန်း:</b> ${escapeHTML(foundBoy.phone)}\n` +
                         `📍 <b>မြို့နယ်:</b> ${escapeHTML(foundBoy.township)}, ${escapeHTML(foundBoy.city)}\n` +
                         `🏠 <b>လိပ်စာ အသေးစိတ်:</b> ${escapeHTML(foundBoy.address)}\n\n` +
                         `📸 <b>Public:</b> ${publicLinks || 'မရှိပါ'}\n` +
                         `🔒 <b>Private:</b> ${privateLinks || 'မရှိပါ'}\n` +
                         `🎬 <b>Video:</b> ${videoLink}\n\n` +
                         `🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${tgLink}">ဒီကိုနှိပ်ပါ</a>\n` +
                         `📊 <b>Status:</b> ${foundBoy.status === 'approved' ? '✅ Approved' : (foundBoy.status === 'hidden' ? '👁️‍🗨️ Hidden' : '⏳ Pending')}`;
        await sendMessage(chatId, adminMsg);
      } else {
        await sendMessage(chatId, `❌ <b>${searchCode}</b> အား စနစ်အတွင်း ရှာမတွေ့ပါ။`);
      }
      return res.status(200).json({ status: 'ok' });
    }

    if (text.startsWith('R_R')) {
      const parts = text.split('_');
      const reasonCode = parts[1];
      const clientChatId = parts[2];
      const boyId = parts[3];
      
      const boySnap = await getDoc(doc(db, 'dateboys', boyId));
      const boyName = boySnap.exists() ? boySnap.data().name : 'Applicant';

      let reasonMsg = "❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို အောက်ပါအကြောင်းရင်းကြောင့် ပယ်ချလိုက်ပါသည် -\n\n";
      if (reasonCode === 'R1') reasonMsg += "👉 <b>သတ်မှတ်အရည်အချင်းများနှင့် မကိုက်ညီခြင်း</b>";
      else if (reasonCode === 'R2') reasonMsg += "👉 <b>ပေးပို့ထားသောပုံများ နှင့် Video အဆင်မပြေခြင်း</b>\n(ကျေးဇူးပြု၍ ပုံများနှင့် Video ကို အသစ်ပြန်လည်စီစဉ်ပြီး အစကနေ ပြန်တင်ပေးပါ ခင်ဗျာ)";
      else if (reasonCode === 'R3') reasonMsg += "👉 <b>ရုပ်ရည်နှင့် ခန္ဓာကိုယ်အချိုးအစား လုပ်ငန်းလိုအပ်ချက်နှင့် အဆင်မပြေခြင်း</b>";
      else if (reasonCode === 'R4') reasonMsg = "❌ ဝမ်းနည်းပါတယ် ခင်ဗျာ။ သင့်ရဲ့ Date Boy လျှောက်လွှာကို ပယ်ချလိုက်ပါသည်။";

      await deleteDoc(doc(db, 'dateboys', boyId));
      await sendMessage(clientChatId, reasonMsg, MAIN_MENU_KEYBOARD);
      await sendMessage(chatId, `❌ <b>${escapeHTML(boyName)}</b> ၏ လျှောက်လွှာကို ပယ်ချပြီး အကြောင်းရင်းကို User ထံ ပို့ပေးလိုက်ပါပြီ။`);
      return res.status(200).json({ status: 'ok' });
    }

    // --- Admin Approvals ---
    if (text.startsWith('APP_') || text.startsWith('REJ_')) {
      const parts = text.split('_');
      const action = parts[0] + '_' + parts[1];
      const clientChatId = parts[2];
      const boyId = parts[3];

      if (action === 'APP_C') {
        const newClientId = `WLC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await setDoc(doc(db, 'client_ids', newClientId), { clientId: newClientId, telegramChatId: clientChatId, status: 'active', createdAt: serverTimestamp() });
        await sendMessage(clientChatId, `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။\n\nသင့်၏ လျှို့ဝှက် Client ID မှာ <code>${newClientId}</code> ဖြစ်ပါသည်။ (Copy ကူးယူပါ)\n\nDate Boy ရှာဖွေရာတွင် ဤ ID အား အသုံးပြုနိုင်ပါသည်။`, { inline_keyboard: [[{ text: "🔍 ယခု Date Boy ရှာမည်", callback_data: "ROLE_CLIENT" }]] });
        await sendMessage(chatId, `✅ Client ID: <b>${newClientId}</b> အား ဖန်တီး၍ Client ထံ ပို့ပေးလိုက်ပါပြီ။`);
        return res.status(200).json({ status: 'ok' });
      } else if (action === 'REJ_C') {
        await sendMessage(clientChatId, `❌ Client ID ဝယ်ယူရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`);
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
        return res.status(200).json({ status: 'ok' });
      }

      const boySnap = await getDoc(doc(db, 'dateboys', boyId));
      if (!boySnap.exists()) return res.status(200).json({ status: 'not found' });
      const boy = boySnap.data();
      const boyCode = `WLDB-${boyId.substring(0, 5).toUpperCase()}`;

      // 🌟 Private Photos & Videos (Link ပြဿနာ အပြည့်အဝ ဖြေရှင်းထားပါသည်)
      if (action === 'APP_P') {
        const prPhotos = Array.isArray(boy.privatePhotos) ? boy.privatePhotos : (boy.privatePhotos ? [boy.privatePhotos] : []);
        const privateLinksText = processMediaLinks(prPhotos, "Private ပုံ");
        
        let videoLinkText = 'မရှိပါ';
        if (boy.privateVideo) {
          if (boy.privateVideo.startsWith('http')) {
            const safeVid = boy.privateVideo.replace(/&/g, '&amp;');
            videoLinkText = `<a href="${safeVid}">Video ကြည့်ရန်</a>`;
          } else {
            videoLinkText = `<i>(Web မှတင်ထားသော Video ဖြစ်သဖြင့် တိုက်ရိုက်ပြ၍ မရပါ)</i>`;
          }
        }

        const displayLinks = privateLinksText ? `\n\n🔒 <b>Private ဓာတ်ပုံများ:</b> ${privateLinksText}` : "";
        const displayVideo = boy.privateVideo ? `\n🎬 <b>Video:</b> ${videoLinkText}` : "";

        const nextActionKeyboard = { inline_keyboard: [[{ text: "❤️ ခေါ်ယူမည် (Hire)", callback_data: `REQ_H_${boyId}` }], [{ text: "🔄 နောက်တစ်ယောက် ထပ်ရှာမည်", callback_data: "ROLE_CLIENT" }]] };
        
        await sendMessage(clientChatId, `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။ ဤသည်မှာ <b>${boyCode}</b> ၏ Private အချက်အလက်များဖြစ်ပါသည်-${displayLinks}${displayVideo}\n\nယခု Date Boy အား ခေါ်ယူလိုပါက အောက်ပါခလုတ်ကို နှိပ်ပါ။`, nextActionKeyboard);
        await sendMessage(chatId, `✅ <b>${boyCode}</b> ၏ Private အချက်အလက်များကို Client ထံ ပို့ပေးလိုက်ပါပြီ။`);
      } else if (action === 'REJ_P') {
        await sendMessage(clientChatId, `❌ <b>${boyCode}</b> ၏ Private ပုံကြည့်ရှုရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`);
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
      } else if (action === 'APP_H') {
        await sendMessage(clientChatId, `✅ ငွေပေးချေမှု အောင်မြင်ပါသည်။ <b>${boyCode}</b> နှင့် Dating ပြုလုပ်ရန် အတည်ပြုပြီးပါပြီ! 🎉\n\nAdmin မှ အသေးစိတ် ဆက်သွယ်ပေးပါမည်။`, MAIN_MENU_KEYBOARD);
        await sendMessage(chatId, `✅ <b>${boyCode}</b> နှင့် Dating Request ကို အတည်ပြုပေးလိုက်ပါပြီ။ Client ထံ ဆက်သွယ်ပေးပါ။`);
      } else if (action === 'REJ_H') {
        await sendMessage(clientChatId, `❌ <b>${boyCode}</b> အား ခေါ်ယူရန် တောင်းဆိုချက်ကို ပယ်ချလိုက်ပါသည်။ ငွေလွှဲပြေစာ မမှန်ကန်ပါ။`);
        await sendMessage(chatId, `❌ Client ကို ပယ်ချကြောင်း အကြောင်းကြားလိုက်ပါပြီ။`);
      } 
      else if (action === 'APP_D') {
        await updateDoc(doc(db, 'dateboys', boyId), { status: 'approved' });
        const approveMsg = `🎉 ကျေးဇူးတင်ပါတယ်။ သတ်မှတ်အရည်အချင်းများနှင့် ပြည့်စုံကိုက်ညီသောကြောင့် သင့်အား WE LINK ၏ Date Boy စာရင်းထဲသို့ ပေါင်းထည့်ပေးလိုက်ပါပြီ။\n\n📌 သင့်၏ Date Boy ID မှာ: <code>${boyCode}</code> ဖြစ်ပါသည်။ Privacy အရ သင်၏ အမည်အရင်းကို ဧည့်သည်အားပြသမည်မဟုတ်သောကြောင့် ယခု ID အား သေချာစွာမှတ်သားထားပေးပါ။\n\nမန္တလေးမြို့တွင်းဆိုရင် ချက်ချင်း(သို့မဟုတ်) (၁)ရက် (၂) ရက်အတွင်းရရှိနိုင်ပြီး အခြားမြို့များကဆိုရင် အနည်းဆုံး (၁)ပတ်ကနေ ဧည့်သည်အခြေအနေပေါ်မူတည်ပြီး စောင့်ရနိုင်ပါသည်။\n\nအထူးသတိပြုရန်မှာ Date Boy စာရင်းသို့ပေါင်းထည့်လိုက်ပြီး ခေါ်ယူလိုသည့်ဧည့်သည်များကို ပြသသည့်စာရင်းထဲတွင် ပါဝင်ပြီးဖြစ်သော်လည်း အလုပ်ရရှိရန်အတွက် မိမိအား ခေါ်ယူမည့် ဧည့်သည်ကြိုက်ရန်လည်း လိုအပ်ပါသေးသည်။\n\nလုပ်ငန်းလိုအပ်ချက်အရ အပြင်လူတွေ့ အင်တာဗျူးရန် လိုအပ်ပါက နေရာနှင့် အချိန်အသေးစိတ်ကို Admin မှ ပြန်လည်ဆက်သွယ်ပေးသွားပါမည်။`;
        await sendMessage(clientChatId, approveMsg, MAIN_MENU_KEYBOARD);
        await sendMessage(chatId, `✅ <b>${escapeHTML(boy.name)}</b> ကို Date Boy အဖြစ် အတည်ပြုလိုက်ပါပြီ။`);
      } 
      else if (action === 'REJ_D') {
        const reasonKeyboard = {
          inline_keyboard: [
            [{ text: "⚠️ အရည်အချင်း မကိုက်ညီခြင်း", callback_data: `R_R1_${clientChatId}_${boyId}` }],
            [{ text: "📸 ပုံ/Video အဆင်မပြေခြင်း (ပြန်တင်ရန်)", callback_data: `R_R2_${clientChatId}_${boyId}` }],
            [{ text: "👤 ရုပ်ရည်/ခန္ဓာကိုယ် အဆင်မပြေခြင်း", callback_data: `R_R3_${clientChatId}_${boyId}` }],
            [{ text: "❌ ရိုးရိုးပယ်ချမည်", callback_data: `R_R4_${clientChatId}_${boyId}` }]
          ]
        };
        await sendMessage(chatId, `ကျေးဇူးပြု၍ <b>${escapeHTML(boy.name)}</b> အား ပယ်ချရသည့် အကြောင်းရင်းကို ရွေးချယ်ပေးပါ -`, reasonKeyboard);
      }
      return res.status(200).json({ status: 'ok' });
    }

    if (text === '🔄 အစသို့ ပြန်သွားမည်' || text === '/start' || text === 'RESET') {
      await sendMessage(chatId, "ပင်မ စာမျက်နှာသို့ ပြန်သွားနေပါသည်...", MAIN_MENU_KEYBOARD);
      await startBotFlow(chatId, stateRef);
      return res.status(200).json({ status: 'success' });
    }
    
    if (text === '🔍 Date Boy ထပ်ရှာမည်') text = 'ROLE_CLIENT';
    if (text === '💼 Date Boy လျှောက်မည်') text = 'ROLE_APPLICANT';
    if (text === '📞 Admin သို့ ဆက်သွယ်ရန်') {
      const config = await getAppConfig();
      await sendMessage(chatId, `📞 <b>Admin သို့ ဆက်သွယ်ရန်</b>\n\nအကူအညီ လိုအပ်ပါက အောက်ပါသို့ ဆက်သွယ်မေးမြန်းနိုင်ပါသည်။\n\n📱 ဖုန်း: ${config.paymentInfo.match(/\d+/) ? config.paymentInfo.match(/\d+/)[0] : 'N/A'}\n💬 Telegram: @AdminAccount`);
      return res.status(200).json({ status: 'success' });
    }

    const stateSnap = await getDoc(stateRef);
    const currentState = stateSnap.exists() ? stateSnap.data() : { step: 'IDLE', data: {} };

    // 🚀 Client ID ကို Auto Detect လုပ်သည့် အပိုင်း (အပြည့်အဝ ဖြေရှင်းထားပါသည်)
    if (text.toUpperCase().trim().startsWith('WLC-')) {
      try {
        const inputId = text.trim().toUpperCase();
        // Index မလိုဘဲ ID အတိအကျဖြင့် တိုက်ရိုက်ရှာဖွေခြင်း
        const clientDoc = await getDoc(doc(db, 'client_ids', inputId));
        
        if (!clientDoc.exists() || clientDoc.data().status !== 'active') {
          await sendMessage(chatId, "❌ သင့်၏ Client ID မှာ မှားယွင်းနေပါသည် (သို့မဟုတ်) သက်တမ်းကုန်ဆုံးသွားပါသည်။ ကျေးဇူးပြု၍ ပြန်လည်စစ်ဆေးပါ။");
        } else {
          const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'));
          const snap = await getDocs(q);
          const cities = [...new Set(snap.docs.map(d => (d.data().city || "").trim()).filter(Boolean))];
          
          if (cities.length === 0) {
            await sendMessage(chatId, "⚠️ လောလောဆယ် ရရှိနိုင်သော Date Boy များ မရှိသေးပါ။", MAIN_MENU_KEYBOARD);
            await setDoc(stateRef, { step: 'IDLE', data: {} });
          } else {
            const keyboard = cities.map(c => [{ text: `🏙️ ${c}`, callback_data: `CITY_${c.substring(0, 40)}` }]);
            await setDoc(stateRef, { step: 'CLIENT_SELECT_CITY', data: {} });
            await sendMessage(chatId, "✅ Client ID အတည်ပြုပြီးပါပြီ။\n\n🔍 ကျေးဇူးပြု၍ ရှာဖွေလိုသော <b>မြို့</b> ကို အရင်ရွေးချယ်ပါ -", { inline_keyboard: keyboard });
          }
        }
      } catch (err) {
        console.error("Client ID Error:", err);
        await sendMessage(chatId, "⚠️ Client ID စစ်ဆေးရာတွင် အခက်အခဲဖြစ်ပေါ်နေပါသည်။ ခဏစောင့်ပြီး ပြန်လည်ကြိုးစားကြည့်ပါ။");
      }
      return res.status(200).json({ status: 'success' });
    }

    // ==========================================
    // 1️⃣ Client & Applicant Role Selection
    // ==========================================
    if (currentState.step === 'CHOOSING_ROLE' || text === 'ROLE_CLIENT' || text === 'ROLE_APPLICANT') {
      if (text === 'ROLE_CLIENT') {
        await setDoc(stateRef, { step: 'ASK_CLIENT_ID', data: {} });
        await sendMessage(chatId, "🔐 <b>Date Boy ရှာဖွေရန် Client ID လိုအပ်ပါသည်။</b>\n\nကျေးဇူးပြု၍ သင့်၏ လျှို့ဝှက် Client ID အား ရိုက်ထည့်ပါ (ဥပမာ - WLC-ABC12) -\n\n(Client ID မရှိသေးပါက အောက်ပါခလုတ်ကို နှိပ်၍ တောင်းဆိုနိုင်ပါသည်။)", {
          inline_keyboard: [[{ text: "💳 Admin အား Client ID တောင်းရန်", callback_data: "REQ_CLIENT_ID" }]]
        });
      } else if (text === 'ROLE_APPLICANT') {
        const config = await getAppConfig();
        await setDoc(stateRef, { step: 'APPLICANT_REQUIREMENTS', data: {} });
        await sendMessage(chatId, `📋 <b>Date Boy အဖြစ် လျှောက်ထားရန် လိုအပ်သည့်အချက်များ</b>\n\n${escapeHTML(config.reqText)}\n\nအထက်ပါ လိုအပ်ချက်များနှင့် ကိုက်ညီပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -`, {
          inline_keyboard: [[{ text: "✅ လိုအပ်သည့်အချက်များနှင့် ကိုက်ညီပါသည်", callback_data: "AGREE_REQ" }]]
        });
      }
      return res.status(200).json({ status: 'success' });
    }

    if (text === 'REQ_CLIENT_ID') {
      const config = await getAppConfig();
      await setDoc(stateRef, { step: 'WAIT_CLIENT_ID_SS', data: {} });
      await sendMessage(chatId, `💳 Client ID ရယူရန်အတွက် ကျသင့်ငွေမှာ <b>${config.clientIdFee} ကျပ်</b> ဖြစ်ပါသည်။\n\nအောက်ပါအကောင့်သို့ ငွေလွှဲပေးပါ -\n<code>${escapeHTML(config.paymentInfo)}</code>\n\n📸 ပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`);
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'WAIT_CLIENT_ID_SS' && photos.length > 0) {
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      await sendMessage(chatId, "⏳ ငွေလွှဲပြေစာ ရရှိပါပြီ။ Admin မှ စစ်ဆေးပြီးပါက သင့်အတွက် လျှို့ဝှက် Client ID ကို ဤနေရာသို့ ပို့ပေးပါမည်။");
      const adminChatId = await getAdminChatId();
      if (adminChatId) {
        const clientProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;
        const adminMsg = `🚨 <b>New Client ID Request</b> 🚨\n\nClient: <a href="${clientProfileLink}">Profile</a>\n\nClient မှ ID ဝယ်ယူရန် ငွေလွှဲပြေစာ ပို့ထားပါသည်။ အတည်ပြုပါက ID အလိုအလျောက် ထုတ်ပေးပါမည်။`;
        const keyboard = { inline_keyboard: [[{ text: "✅ Approve & Generate ID", callback_data: `APP_C_${chatId}_X` }, { text: "❌ Reject", callback_data: `REJ_C_${chatId}_X` }]] };
        await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminChatId, photo: fileIdToForward, caption: adminMsg, parse_mode: 'HTML', reply_markup: keyboard }) });
      }
      return res.status(200).json({ status: 'success' });
    }

    // ==========================================
    // 2️⃣ Applicant Info Entry Flow
    // ==========================================
    if (currentState.step === 'APPLICANT_REQUIREMENTS' && text === 'AGREE_REQ') {
      const config = await getAppConfig();
      await setDoc(stateRef, { step: 'APPLICANT_RULES', data: {} });
      await sendMessage(chatId, `⚖️ <b>Date Boy လျှောက်ထားခြင်းအတွက် စည်းမျဉ်းစည်းကမ်းများ</b>\n\n${escapeHTML(config.ruleText)}\n\nသဘောတူညီပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -`, {
        inline_keyboard: [[{ text: "✅ သဘောတူပါသည် (စတင်မည်)", callback_data: "AGREE_RULES" }]]
      });
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'APPLICANT_RULES' && text === 'AGREE_RULES') {
      await setDoc(stateRef, { step: 'GET_NAME', data: {} });
      await sendMessage(chatId, "✍️ ကျေးဇူးပြု၍ သင့်ရဲ့ <b>အမည်</b> ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_NAME' && text) {
      await setDoc(stateRef, { step: 'GET_AGE', data: { ...currentState.data, name: text } });
      await sendMessage(chatId, "🎂 ကျေးဇူးပြု၍ သင့်ရဲ့ <b>အသက်</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - ၂၅):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_AGE' && text) {
      await setDoc(stateRef, { step: 'GET_HEIGHT', data: { ...currentState.data, age: text } });
      await sendMessage(chatId, "📏 ကျေးဇူးပြု၍ သင့်ရဲ့ <b>အရပ်အမြင့်</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - 5' 9\"):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_HEIGHT' && text) {
      await setDoc(stateRef, { step: 'GET_COCK_SIZE', data: { ...currentState.data, height: text } });
      await sendMessage(chatId, "🍆 ကျေးဇူးပြု၍ သင့်ရဲ့ <b>အရွယ်အစား (Cock Size)</b> ကို လက်မဖြင့် ရိုက်ထည့်ပေးပါ (ဥပမာ - 6\"):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_COCK_SIZE' && text) {
      await setDoc(stateRef, { step: 'GET_PHONE', data: { ...currentState.data, cockSize: text } });
      await sendMessage(chatId, "📞 ကျေးဇူးပြု၍ ဆက်သွယ်ရန် <b>ဖုန်းနံပါတ်</b> ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_PHONE' && text) {
      await setDoc(stateRef, { step: 'GET_CITY', data: { ...currentState.data, phone: text } });
      await sendMessage(chatId, "🏙️ ကျေးဇူးပြု၍ လက်ရှိနေထိုင်ရာ <b>မြို့</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - မန္တလေး):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_CITY' && text) {
      await setDoc(stateRef, { step: 'GET_TOWNSHIP', data: { ...currentState.data, city: text } });
      await sendMessage(chatId, "📍 ကျေးဇူးပြု၍ နေထိုင်ရာ <b>မြို့နယ်</b> ကို ရိုက်ထည့်ပေးပါ (ဥပမာ - ချမ်းအေးသာစံ):");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_TOWNSHIP' && text) {
      await setDoc(stateRef, { step: 'GET_ADDRESS', data: { ...currentState.data, township: text } });
      await sendMessage(chatId, "🏠 ကျေးဇူးပြု၍ <b>နေရပ်လိပ်စာ အသေးစိတ်</b> ကို ရိုက်ထည့်ပေးပါ:");
      return res.status(200).json({ status: 'success' });
    }
    if (currentState.step === 'GET_ADDRESS' && text) {
      await setDoc(stateRef, { step: 'GET_PUBLIC_PHOTOS', data: { ...currentState.data, address: text, publicPhotos: [] } });
      await sendMessage(chatId, "📸 ကျေးဇူးပြု၍ မျက်နှာသေချာမြင်ရသည့် <b>အလှဓာတ်ပုံ (၃) ပုံ</b> ကို တစ်ပုံချင်းစီ ပို့ပေးပါ\n\n(အခု ပထမဆုံးတစ်ပုံအရင်ပို့ပါ):");
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
        await sendMessage(chatId, "✅ အလှဓာတ်ပုံ ၃ ပုံ ရရှိပါပြီ။\n\n🔒 ယခု အရွယ်အစား အမှန်အကန်ကို သေချာမြင်ရသော <b>ပစ္စည်းပုံ (Cock Photo) ၃ ပုံ</b> ကို တစ်ပုံချင်းစီ ပို့ပေးပါ။\n\n🔒(အခု ပထမဆုံးတစ်ပုံအရင်ပို့ပါ):");
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
        await setDoc(stateRef, { step: 'GET_PRIVATE_VIDEO', data: { ...currentState.data, privatePhotos: currentPrivate } });
        await sendMessage(chatId, "✅ ပစ္စည်းပုံ (၃) ပုံ ရရှိပါပြီ။\n\n🎬 ယခု ထောင်မတ်နေသော ဆိုဒ်သေချာစွာခန့်မှန်းနိုင်မည့် ပစ္စည်းကို လက်နှင့်ကိုင်၍ စက္ကန့် ၆၀ စာ Video အတိုလေး ပို့ပေးပါ ခင်ဗျာ\n\n(မှတ်ချက် - ၁ မိနစ်ထက်ပိုသော Video ပို့လို့မရပါ):");
      }
      return res.status(200).json({ status: 'success' });
    }

    if (currentState.step === 'GET_PRIVATE_VIDEO') {
      const isVideo = message && (message.video || message.document);
      if (!isVideo) {
        await sendMessage(chatId, "⚠️ ကျေးဇူးပြု၍ Video ဖိုင် ကိုသာ ပို့ပေးပါ ခင်ဗျာ。\n\n(မှတ်ချက် - ၁ မိနစ်ထက်ပိုသော Video ပို့လို့မရပါ)");
        return res.status(200).json({ status: 'success' });
      }
      const videoData = message.video || message.document;
      if (videoData.duration && videoData.duration > 60) {
        await sendMessage(chatId, "⚠️ သင့် Video မှာ ၁ မိနစ်ထက် ကျော်လွန်နေပါသည်။\n\nကျေးဇူးပြု၍ စက္ကန့် ၆၀ အောက် Video အတိုလေးသာ ပြန်လည်ပေးပို့ပါ ခင်ဗျာ။");
        return res.status(200).json({ status: 'success' });
      }
      if (photos.length === 0) {
        await sendMessage(chatId, "⚠️ သင့် Video ဖိုင်အရွယ်အစားမှာ ကြီးမားလွန်းနေပါသည်။ (Telegram ကန့်သတ်ချက်အရ 20MB အောက်သာ ပို့နိုင်ပါသည်)\n\nကျေးဇူးပြု၍ File Size သေးငယ်သော (သို့) ၁ မိနစ်အောက် Video ကိုသာ ပြန်လည်ပေးပို့ပါ ခင်ဗျာ။");
        return res.status(200).json({ status: 'success' });
      }

      const applicantData = currentState.data;
      const privateVideoUrl = photos[0];
      const telegramProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${chatId}`;
      const locQuery = query(collection(db, 'locations'), where('city', '==', applicantData.city), where('township', '==', applicantData.township));
      const locSnap = await getDocs(locQuery);
      if (locSnap.empty) { await addDoc(collection(db, 'locations'), { city: applicantData.city, township: applicantData.township, status: 'pending' }); }

      const finalData = {
        name: applicantData.name, age: applicantData.age, height: applicantData.height, cockSize: applicantData.cockSize,
        phone: applicantData.phone, city: applicantData.city, township: applicantData.township, address: applicantData.address,
        publicPhotos: applicantData.publicPhotos, privatePhotos: applicantData.privatePhotos, privateVideo: privateVideoUrl, 
        telegramChatId: chatId, telegramProfileLink: telegramProfileLink, status: 'pending', createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'dateboys'), finalData);
      
      const adminChatId = await getAdminChatId();
      if (adminChatId) {
        const publicLinks = processMediaLinks(applicantData.publicPhotos, "Public ပုံ");
        const privateLinks = processMediaLinks(applicantData.privatePhotos, "Private ပုံ");
        const safeVid = privateVideoUrl.replace(/&/g, '&amp;');
        const videoLink = `<a href="${safeVid}">Video ကြည့်ရန်</a>`;
        
        const adminMsg = `🚨 <b>New Date Boy Registration</b> 🚨\n\n` +
                         `👤 <b>အမည်:</b> ${escapeHTML(finalData.name)}\n` +
                         `🎂 <b>အသက်:</b> ${escapeHTML(finalData.age)} နှစ်\n` +
                         `📏 <b>အရပ်:</b> ${escapeHTML(finalData.height)} | 🍆 <b>Size:</b> ${escapeHTML(finalData.cockSize)}\n` +
                         `📞 <b>ဖုန်း:</b> ${escapeHTML(finalData.phone)}\n` +
                         `📍 <b>မြို့နယ်:</b> ${escapeHTML(finalData.township)}, ${escapeHTML(finalData.city)}\n` +
                         `🏠 <b>လိပ်စာ အသေးစိတ်:</b> ${escapeHTML(finalData.address)}\n\n` +
                         `📸 <b>Public:</b> ${publicLinks}\n` +
                         `🔒 <b>Private:</b> ${privateLinks}\n` +
                         `🎬 <b>Video:</b> ${videoLink}\n\n` +
                         `🔗 <b>Telegram ဖြင့် ဆက်သွယ်ရန်:</b> <a href="${telegramProfileLink}">ဒီကိုနှိပ်ပါ</a>`;
                         
        const keyboard = { inline_keyboard: [[{ text: "✅ Approve", callback_data: `APP_D_${chatId}_${docRef.id}` }, { text: "❌ Reject", callback_data: `REJ_D_${chatId}_${docRef.id}` }]] };
        await sendMessage(adminChatId, adminMsg, keyboard);
      }
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      await sendMessage(chatId, "🎉 အချက်အလက်ပေးပို့မှု အောင်မြင်စွာ ပြီးဆုံးပါပြီ။\n\nAdmin မှ ဆက်သွယ်လာတာကို စောင့်ဆိုင်းပေးပါ ခင်ဗျာ။ 🙏", MAIN_MENU_KEYBOARD);
      return res.status(200).json({ status: 'success' });
    }

    // ==========================================
    // 3️⃣ Client Flow
    // ==========================================
    if (currentState.step === 'CLIENT_SELECT_CITY' && text.startsWith('CITY_')) {
      const selectedCity = text.replace('CITY_', '');
      const q = query(collection(db, 'dateboys'), where('status', '==', 'approved'), where('city', '==', selectedCity));
      const snap = await getDocs(q);
      const townships = [...new Set(snap.docs.map(d => d.data().township))];
      const keyboard = townships.map(t => [{ text: `📍 ${t}`, callback_data: `TOWNSHIP_${t.substring(0, 40)}` }]);
      keyboard.unshift([{ text: "🌐 မြို့နယ်အားလုံးပြရန်", callback_data: `TOWNSHIP_ALL_${selectedCity}` }]);
      await setDoc(stateRef, { step: 'CLIENT_SELECT_TOWNSHIP', data: {} });
      await sendMessage(chatId, `🔍 ${escapeHTML(selectedCity)} တွင် ရှာဖွေလိုသော <b>မြို့နယ်</b> ကို ရွေးချယ်ပါ -`, { inline_keyboard: keyboard });
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
        q = query(collection(db, 'dateboys'), where('status', '==', 'approved'), where('township', '>=', selectedTownship), where('township', '<=', selectedTownship + '\uf8ff'));
        titleMsg = selectedTownship;
      }
      const snap = await getDocs(q);
      if (snap.empty) {
        await sendMessage(chatId, `⚠️ ဤနေရာတွင် Date Boy မရှိသေးပါ။ /start ဖြင့် အခြားနေရာ ပြောင်းရှာပါ။`, MAIN_MENU_KEYBOARD);
      } else {
        await sendMessage(chatId, `✨ <b>${escapeHTML(titleMsg)}</b> တွင် ရရှိနိုင်သော Date Boy (${snap.size} ယောက်):`);
        for (const dDoc of snap.docs) { await sendDateBoyCard(chatId, dDoc.data(), dDoc.id); }
        await sendMessage(chatId, "🔄 ထပ်မံရှာဖွေလိုပါက အောက်ပါ Menu ကို အသုံးပြုပါ။", MAIN_MENU_KEYBOARD);
      }
      await setDoc(stateRef, { step: 'IDLE', data: {} });
      return res.status(200).json({ status: 'success' });
    }

    if (text.startsWith('REQ_P_')) {
      const boyId = text.replace('REQ_P_', '');
      const config = await getAppConfig();
      await setDoc(stateRef, { step: 'WAIT_PRIV_SS', data: { boyId } });
      await sendMessage(chatId, `🔒 Private ပုံများ ကြည့်ရှုခွင့်အတွက် ကျသင့်ငွေမှာ <b>${config.privFee} ကျပ်</b> ဖြစ်ပါသည်။\n\n💳 အောက်ပါအကောင့်သို့ ငွေလွှဲပေးပါ -\n<code>${escapeHTML(config.paymentInfo)}</code>\n\n📸 ပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`);
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
        const adminMsg = `🚨 <b>Private Photo Request</b> 🚨\n\nCode: <b>${boyCode}</b>\nClient: <a href="${clientProfileLink}">Profile</a>\n\nClient မှ ငွေလွှဲပြေစာ ပို့ထားပါသည်။`;
        const keyboard = { inline_keyboard: [[{ text: "✅ Approve", callback_data: `APP_P_${chatId}_${boyId}` }, { text: "❌ Reject", callback_data: `REJ_P_${chatId}_${boyId}` }]] };
        await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminChatId, photo: fileIdToForward, caption: adminMsg, parse_mode: 'HTML', reply_markup: keyboard }) });
      }
      return res.status(200).json({ status: 'success' });
    }

    if (text.startsWith('REQ_H_')) {
      const boyId = text.replace('REQ_H_', '');
      const config = await getAppConfig();
      await setDoc(stateRef, { step: 'WAIT_HIRE_SS', data: { boyId } });
      await sendMessage(chatId, `❤️ Date Boy ခေါ်ယူခြင်းအတွက် ဈေးနှုန်းများမှာ အောက်ပါအတိုင်းဖြစ်ပါသည် -\n\n🕒 Section: ${config.feeSec} ကျပ်\n☀️ Day: ${config.feeDay} ကျပ်\n🌙 Night: ${config.feeNight} ကျပ်\n\n💳 Booking တင်ရန်အတွက် စရံငွေ (၅၀%) ကို အောက်ပါအကောင့်သို့ လွှဲပေးပါ -\n<code>${escapeHTML(config.paymentInfo)}</code>\n\n📸 ပြီးပါက <b>ငွေလွှဲပြေစာ (Screenshot)</b> ကို ယခု Chat ထဲသို့ ပေးပို့ပါ။`);
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
        const adminMsg = `🚨 <b>Dating Request (Booking)</b> 🚨\n\nDate Boy: <b>${boyCode}</b>\nClient: <a href="${clientProfileLink}">Profile</a>\n\nClient မှ Booking စရံပြေစာ ပို့ထားပါသည်။`;
        const keyboard = { inline_keyboard: [[{ text: "✅ Approve Hire", callback_data: `APP_H_${chatId}_${boyId}` }, { text: "❌ Reject", callback_data: `REJ_H_${chatId}_${boyId}` }]] };
        await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminChatId, photo: fileIdToForward, caption: adminMsg, parse_mode: 'HTML', reply_markup: keyboard }) });
      }
      return res.status(200).json({ status: 'success' });
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook Error Details:', error);
    // 🛡️ Error များအားလုံးကို ဖမ်းယူ၍ User ထံသို့ အတိအကျ ပို့ပေးမည့် အပိုင်း
    if (globalChatId) {
      // ဤနေရာတွင် Error ကြောင့် Telegram API ထပ်မံမကျရှုံးစေရန် RAW format ဖြင့် ပို့ပါသည်
      await fetch(`${TELEGRAM_API}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: globalChatId, text: `⚠️ စနစ်ချို့ယွင်းမှုဖြစ်ပေါ်နေပါသည်။ ခဏစောင့်ပြီး ပြန်လည်ကြိုးစားကြည့်ပါ။\n\n[Error Info: ${error.message}]` }) });
    }
    return res.status(200).json({ error: error.message });
  }
}
