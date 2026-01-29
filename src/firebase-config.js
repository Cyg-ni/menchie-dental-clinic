// src/firebase-config.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; 
import { getAuth } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: "AIzaSyCS-olCQRpJZGcYSGWG7CZ8PIpV-wBNaOE",
  authDomain: "menchie-dental-clinic.firebaseapp.com",
  projectId: "menchie-dental-clinic",
  storageBucket: "menchie-dental-clinic.firebasestorage.app",
  messagingSenderId: "1005995383687",
  appId: "1:1005995383687:web:42301faf7bbfcb544b1122",
  measurementId: "G-C96BVD0XY6"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };