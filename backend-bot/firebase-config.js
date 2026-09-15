const admin = require("firebase-admin");

// JSON ဖိုင်ကို တိုက်ရိုက်မခေါ်တော့ဘဲ Environment Variable ကနေ လှမ်းယူပါမည်
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
module.exports = { db };
