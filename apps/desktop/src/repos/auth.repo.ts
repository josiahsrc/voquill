import {
  GoogleAuthProvider,
  User as FirebaseUser,
  UserCredential,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { BaseRepo } from "./base.repo";

export abstract class BaseAuthRepo extends BaseRepo {
  abstract signUpWithEmail(email: string, password: string): Promise<UserCredential>;
  abstract sendEmailVerificationForCurrentUser(): Promise<void>;
  abstract signOut(): Promise<void>;
  abstract signInWithEmail(email: string, password: string): Promise<UserCredential>;
  abstract sendPasswordResetRequest(email: string): Promise<void>;
  abstract signInWithGoogle(): Promise<UserCredential>;
  abstract getCurrentUser(): FirebaseUser | null;
  abstract deleteMyAccount(): Promise<void>;
}

export class CloudAuthRepo extends BaseAuthRepo {
  async signUpWithEmail(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(getAuth(), email, password);
  }

  async sendEmailVerificationForCurrentUser(): Promise<void> {
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error("No user is currently signed in.");
    }

    await sendEmailVerification(user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(getAuth());
  }

  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(getAuth(), email, password);
  }

  async sendPasswordResetRequest(email: string): Promise<void> {
    await sendPasswordResetEmail(getAuth(), email);
  }

  async signInWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    return signInWithPopup(getAuth(), provider);
  }

  getCurrentUser(): FirebaseUser | null {
    return getAuth().currentUser;
  }

  async deleteMyAccount(): Promise<void> {
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error("No user is currently signed in.");
    }

    await user.delete();
  }
}
