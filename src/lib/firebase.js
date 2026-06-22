import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// const firebaseConfig = {
//   apiKey: "AIzaSyANBIgaQxlEXxMkE9Qb8NPPJh7LiXzMD_A",
//   authDomain: "dutyhours-node.firebaseapp.com",
//   projectId: "dutyhours-node",
//   storageBucket: "dutyhours-node.firebasestorage.app",
//   messagingSenderId: "684363089659",
//   appId: "1:684363089659:web:8e61202fb6c732934dd25e",
//   measurementId: "G-HDYMNJMYX6"
// };

export const app = initializeApp(firebaseConfig);