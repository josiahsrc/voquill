import {
  GoogleAuthProvider,
  User as FirebaseUser,
  UserCredential,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "../main";
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
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async sendEmailVerificationForCurrentUser(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No user is currently signed in.");
    }

    await sendEmailVerification(user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<UserCredential> {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async sendPasswordResetRequest(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  async signInWithGoogleTokens(
    idToken: string,
    accessToken: string,
  ): Promise<UserCredential> {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    return signInWithCredential(auth, credential);
  }

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  async deleteMyAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No user is currently signed in.");
    }

    await user.delete();
  }
}
