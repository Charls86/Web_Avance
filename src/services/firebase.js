import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAZfe9bzehYDiXyiuYf0nR-2CJsnUdorqY",
  authDomain: "denuncias-451bf.firebaseapp.com",
  projectId: "denuncias-451bf",
  storageBucket: "denuncias-451bf.firebasestorage.app",
  messagingSenderId: "397138246828",
  appId: "1:397138246828:web:6b12c7bcd121bd94337309",
  measurementId: "G-LHRWB28JN2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
