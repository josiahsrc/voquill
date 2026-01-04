import {
  User as FirebaseUser,
  GoogleAuthProvider,
  UserCredential,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getEffectiveAuth } from "../utils/auth.utils";
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
    return createUserWithEmailAndPassword(getEffectiveAuth(), email, password);
  }

  async sendEmailVerificationForCurrentUser(): Promise<void> {
    const user = getEffectiveAuth().currentUser;
    if (!user) {
      throw new Error("No user is currently signed in.");
    }

    await sendEmailVerification(user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(getEffectiveAuth());
  }

  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<UserCredential> {
    return signInWithEmailAndPassword(getEffectiveAuth(), email, password);
  }

  async sendPasswordResetRequest(email: string): Promise<void> {
    await sendPasswordResetEmail(getEffectiveAuth(), email);
  }

  async signInWithGoogleTokens(
    idToken: string,
    accessToken: string,
  ): Promise<UserCredential> {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    return signInWithCredential(getEffectiveAuth(), credential);
  }

  getCurrentUser(): FirebaseUser | null {
    return getEffectiveAuth().currentUser;
  }

  async deleteMyAccount(): Promise<void> {
    const user = getEffectiveAuth().currentUser;
    if (!user) {
      throw new Error("No user is currently signed in.");
    }

    await user.delete();
  }
}
