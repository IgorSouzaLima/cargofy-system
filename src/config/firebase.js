import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyDncBYgIrudOBBwjsNFe9TS7Zr0b2nJLRo',
  authDomain: 'cargofy-b4435.firebaseapp.com',
  projectId: 'cargofy-b4435',
  storageBucket: 'cargofy-b4435.firebasestorage.app',
  appId: '1:827918943476:web:a1a33a1e6dd84e4e8c8aa1'
};

export const appId = 'cargofy-b4435-prod';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
