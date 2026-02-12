import { collection, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { APP_ID } from '../constants/firestore';

const basePath = ['artifacts', APP_ID, 'public', 'data'];

export const getCollectionRef = (collectionName) => collection(db, ...basePath, collectionName);

export const getDocRef = (collectionName, documentId) => doc(db, ...basePath, collectionName, documentId);
