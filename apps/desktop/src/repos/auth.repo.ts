import {
  GoogleAuthProvider,
  User as FirebaseUser,
  UserCredential,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { BaseRepo } from "./base.repo";

export abstract class BaseAuthRepo extends BaseRepo {
  abstract signUpWithEmail(
    email: string,
    password: string,
  ): Promise<UserCredential>;
  abstract sendEmailVerificationForCurrentUser(): Promise<void>;
  abstract signOut(): Promise<void>;
  abstract signInWithEmail(
    email: string,
    password: string,
  ): Promise<UserCredential>;
  abstract sendPasswordResetRequest(email: string): Promise<void>;
  abstract signInWithGoogleTokens(
    idToken: string,
    accessToken: string,
  ): Promise<UserCredential>;
  abstract getCurrentUser(): FirebaseUser | null;
  abstract deleteMyAccount(): Promise<void>;
}

export class CloudAuthRepo extends BaseAuthRepo {
  async signUpWithEmail(
    email: string,
    password: string,
  ): Promise<UserCredential> {
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

  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<UserCredential> {
    return signInWithEmailAndPassword(getAuth(), email, password);
  }

  async sendPasswordResetRequest(email: string): Promise<void> {
    await sendPasswordResetEmail(getAuth(), email);
  }

  async signInWithGoogleTokens(
    idToken: string,
    accessToken: string,
  ): Promise<UserCredential> {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    return signInWithCredential(getAuth(), credential);
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
