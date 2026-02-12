import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDncBYgIrudOBBwjsNFe9TS7Zr0b2nJLRo',
  authDomain: 'cargofy-b4435.firebaseapp.com',
  projectId: 'cargofy-b4435',
  storageBucket: 'cargofy-b4435.firebasestorage.app',
  appId: '1:827918943476:web:a1a33a1e6dd84e4e8c8aa1'
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
