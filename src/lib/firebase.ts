import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  deleteUser,
  setPersistence,
  browserPopupRedirectResolver
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeAuth for more robust initialization in iframe/preview environments
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

export const signUpWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const signInWithEmail = (email: string, pass: string, rememberMe: boolean = true) => {
  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  // Only set persistence if it's different from current to avoid internal state conflicts
  return setPersistence(auth, persistence).then(() => {
    return signInWithEmailAndPassword(auth, email, pass);
  });
};
export const sendVerification = () => {
  if (auth.currentUser) return sendEmailVerification(auth.currentUser);
};
export const reloadUser = async () => {
  if (auth.currentUser) {
    await auth.currentUser.reload();
    return auth.currentUser;
  }
  return null;
};
export const deleteUserAccount = () => {
  if (auth.currentUser) return deleteUser(auth.currentUser);
};
export const updateUserProfile = (displayName: string) => {
  if (auth.currentUser) {
    return updateProfile(auth.currentUser, { displayName });
  }
};
