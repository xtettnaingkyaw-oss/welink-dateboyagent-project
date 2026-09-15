import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBHHg5htnVpmImNniVL4L9WbvqJ8DfKZlw",
  authDomain: "welink-dateboyagent-project.firebaseapp.com",
  projectId: "welink-dateboyagent-project",
  storageBucket: "welink-dateboyagent-project.firebasestorage.app",
  messagingSenderId: "16897923201",
  appId: "1:16897923201:web:63ec1fa20feb87ed7d5580",
  measurementId: "G-RCX6RYEE7E"
};

// Firebase ကို စတင်ခြင်း
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
