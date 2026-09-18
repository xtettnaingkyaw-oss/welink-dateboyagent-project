export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Telegram Bot Server is running smoothly!' });
  }

  const { message } = req.body;
  if (!message || !message.text) {
    return res.status(200).json({ status: 'No message text found' });
  }

  const chatId = message.chat.id;
  const text = message.text.trim();
  const token = process.env.TELEGRAM_BOT_TOKEN;

  let replyText = "မင်္ဂလာပါခင်ဗျာ။ WE LINK Dating Agency မှ ကြိုဆိုပါတယ်။ 😊\n\n- Date Boy များကို ရှာဖွေလိုပါက Web App တွင် ဝင်ရောက်ကြည့်ရှုနိုင်ပါသည်။\n- Date Boy အဖြစ် လျှောက်ထားလိုပါက Join စာမျက်နှာမှတဆင့် လျှောက်ထားနိုင်ပါသည်။";

  if (text === '/start') {
    replyText = "✨ WE LINK မှ ကြိုဆိုပါတယ်ခင်ဗျာ! ✨\n\nကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုများကို အောက်ပါ Web App လင့်ခ်မှတဆင့် ဝင်ရောက်ကြည့်ရှုနိုင်ပါသည် - \n👉 https://welink-dateboyagent-project.vercel.app";
  } else if (text.includes('price') || text.includes('ဈေး') || text.includes('rates')) {
    replyText = "💰 ဝန်ဆောင်ခနှုန်းထားများ သိရှိလိုပါက Admin ထံသို့ တိုက်ရိုက်ဆက်သွယ်စုံစမ်းနိုင်ပါသည်။";
  }

  // Telegram သို့ စာပြန်ပို့ရန် API သို့ လှမ်းခေါ်ခြင်း
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText
      })
    });
  } catch (error) {
    console.error('Error sending telegram message:', error);
  }

  return res.status(200).json({ status: 'success' });
}
