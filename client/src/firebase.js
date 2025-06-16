import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// const firebaseConfig = {
//   apiKey: "your-firebase-api-key",
//   authDomain: "your-project.firebaseapp.com",
//   projectId: "your-project-id",
//   storageBucket: "your-project.appspot.com",
//   messagingSenderId: "your-messaging-sender-id",
//   appId: "your-app-id"
// };

const firebaseConfig = {
  apiKey: "AIzaSyAG4q9k4vthoh6ab7WeP2bhbPprgRHgD6A",
  authDomain: "fitlife-b6824.firebaseapp.com",
  projectId: "fitlife-b6824",
  storageBucket: "fitlife-b6824.firebasestorage.app",
  messagingSenderId: "551140582610",
  appId: "1:551140582610:web:182664db8e68a7976b790b",
  measurementId: "G-BZL559LBT3"
};

// const analytics = getAnalytics(app);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup };