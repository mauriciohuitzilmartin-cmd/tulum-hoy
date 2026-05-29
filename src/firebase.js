import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB6dLnnEo27zjdES_Cx-WdqQTiIYt_QEFQ",
  authDomain: "tulumhoy-c5983.firebaseapp.com",
  projectId: "tulumhoy-c5983",
  storageBucket: "tulumhoy-c5983.firebasestorage.app",
  messagingSenderId: "17057314860",
  appId: "1:17057314860:web:e11ed8e15b0685d89d3989",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);