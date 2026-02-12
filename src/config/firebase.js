import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDncBYgIrudOBBwjsNFe9TS7Zr0b2nJLRo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cargofy-b4435.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cargofy-b4435',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cargofy-b4435.firebasestorage.app',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:827918943476:web:a1a33a1e6dd84e4e8c8aa1'
};

export const APP_ID = import.meta.env.VITE_APP_ID || 'cargofy-b4435-prod';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
