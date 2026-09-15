require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { db } = require('./firebase-config');

// သင့် Telegram Bot Token ကို .env ဖိုင်ထဲကနေ ခေါ်ယူခြင်း
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// User တွေရဲ့ Chat အဆင့်ဆင့်ကို မှတ်ထားမယ့် နေရာ (State Management)
const userStates = {}; 

// Bot ကို စတင်ခြင်း (/start command)
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Date Boy အဖြစ် စာရင်းသွင်းမည်', callback_data: 'register' }],
                [{ text: 'Date Boy ရှာဖွေမည် / ခေါ်မည်', callback_data: 'find' }]
            ]
        }
    };
    bot.sendMessage(chatId, "We Link မှ ကြိုဆိုပါတယ်။ ဘာဝန်ဆောင်မှု အသုံးပြုချင်ပါသလဲ?", opts);
});

// Button များကို နှိပ်သောအခါ
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'register') {
        // Register အဆင့် (၁) - နာမည်မေးခြင်း စတင်ပါပြီ
        userStates[chatId] = { step: 'NAME', data: {} };
        bot.sendMessage(chatId, "Date Boy အဖြစ် စာရင်းသွင်းရန် အချက်အလက်များ လိုအပ်ပါသည်။\n\nပထမဦးစွာ သင့်နာမည် (အမည်ရင်း သို့မဟုတ် နာမည်ဝှက်) ကို ရိုက်ထည့်ပေးပါ။");
    } else if (data === 'find') {
        bot.sendMessage(chatId, "Date Boy များကို ရှာဖွေရန် ကျွန်ုပ်တို့၏ Web App သို့ ဝင်ရောက်ပါ။ \nLink: [သင့် Web App Link ကို ဤနေရာတွင်ထည့်ပါ]");
    }
});

// User ဆီက စာ (သို့) ပုံ ပြန်ပို့သောအခါ တစ်ဆင့်ချင်းစီ အလုပ်လုပ်မည့် အပိုင်း
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // /start နှိပ်တာ သို့မဟုတ် Register လုပ်နေတာ မဟုတ်ရင် ဘာမှမလုပ်ပါ
    if (!userStates[chatId] || text === '/start') return;

    const state = userStates[chatId];

    switch (state.step) {
        case 'NAME':
            state.data.name = text;
            state.step = 'AGE';
            bot.sendMessage(chatId, "အသက် ဘယ်လောက်ရှိပြီလဲ ခင်ဗျာ? (ဥပမာ - ၂၅)");
            break;
            
        case 'AGE':
            state.data.age = text;
            state.step = 'HEIGHT';
            bot.sendMessage(chatId, "အရပ်အမြင့် ဘယ်လောက်ရှိပါသလဲ? (ဥပမာ - 5' 8\")");
            break;
            
        case 'HEIGHT':
            state.data.height = text;
            state.step = 'CITY';
            bot.sendMessage(chatId, "ဘယ်မြို့ကနေ ဝန်ဆောင်မှုပေးချင်တာလဲ ခင်ဗျာ? (ဥပမာ - ရန်ကုန်, မန္တလေး)");
            break;
            
        case 'CITY':
            state.data.city = text;
            state.step = 'TOWNSHIP';
            bot.sendMessage(chatId, "ဘယ်မြို့နယ်လဲ ခင်ဗျာ?");
            break;
            
        case 'TOWNSHIP':
            state.data.township = text;
            state.step = 'PHONE';
            bot.sendMessage(chatId, "Admin မှ ဆက်သွယ်ရမည့် ဖုန်းနံပါတ် ရိုက်ထည့်ပေးပါ။ (Public တွင် မပြပါ)");
            break;
            
        case 'PHONE':
            state.data.phone = text;
            state.step = 'PHOTO';
            bot.sendMessage(chatId, "အများမြင်နိုင်မည့် သင့်ရဲ့ အကောင်းဆုံး ဓာတ်ပုံ (Public Photo) တစ်ပုံ ပို့ပေးပါ။");
            break;
            
        case 'PHOTO':
            if (msg.photo) {
                // Telegram ကနေ ပို့လိုက်တဲ့ ဓာတ်ပုံရဲ့ ID ကို ယူခြင်း
                const fileId = msg.photo[msg.photo.length - 1].file_id;
                state.data.publicPhoto = fileId; 
                
                // အချက်အလက်များစုံသွားပြီဖြစ်၍ Firebase သို့ လှမ်းသိမ်းခြင်း
                bot.sendMessage(chatId, "အချက်အလက်များ သိမ်းဆည်းနေပါသည်။ ခဏစောင့်ပေးပါ...");
                
                try {
                    await db.collection('dateboys').add({
                        name: state.data.name,
                        age: state.data.age,
                        height: state.data.height,
                        city: state.data.city,
                        township: state.data.township,
                        phone: state.data.phone,
                        publicPhoto: state.data.publicPhoto, // Telegram File ID
                        status: 'pending', // Admin Approve စောင့်နေရန်
                        telegramChatId: chatId, // နောက်ပိုင်း Approve/Reject လုပ်ရင် Chat Box ကို အကြောင်းပြန်ဖို့
                        createdAt: new Date()
                    });
                    
                    bot.sendMessage(chatId, "✅ စာရင်းသွင်းခြင်း အောင်မြင်ပါသည်။ \n\nAdmin မှ သင့်အချက်အလက်များကို စစ်ဆေးပြီးပါက ဤ Chat Box သို့ အကြောင်းပြန်ပေးပါမည်။ ကျေးဇူးတင်ပါတယ်။");
                    delete userStates[chatId]; // ပြီးသွားရင် State ကို ဖျက်ပစ်ပါ
                    
                } catch (error) {
                    bot.sendMessage(chatId, "❌ အမှားအယွင်းဖြစ်ပေါ်နေပါသည်။ ခဏနေမှ ပြန်ကြိုးစားကြည့်ပါ။");
                    console.error("Firebase Error: ", error);
                }
            } else {
                bot.sendMessage(chatId, "ကျေးဇူးပြု၍ ဓာတ်ပုံ ပို့ပေးပါခင်ဗျာ။ စာသား လက်မခံပါ။");
            }
            break;
    }
});

console.log("🤖 We Link Telegram Bot is successfully running...");
