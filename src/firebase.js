const firebaseConfig = {
  apiKey: "AIzaSyDVFX3Son_0i1_yrDEF30DcCKQpAHgzNSw",
  authDomain: "ktrade-f1227.firebaseapp.com",
  projectId: "ktrade-f1227",
  storageBucket: "ktrade-f1227.firebasestorage.app",
  messagingSenderId: "44166414683",
  appId: "1:44166414683:web:a644997483349fb1dbda7e"
};

// Use the globally injected Firebase from the CDN
const app = window.firebase.initializeApp(firebaseConfig);

export const auth = window.firebase.auth();
export const googleProvider = new window.firebase.auth.GoogleAuthProvider();
export const db = window.firebase.firestore();
