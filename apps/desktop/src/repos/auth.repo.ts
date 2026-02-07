import {
  User as FirebaseUser,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { BehaviorSubject } from "rxjs";
import { AuthUser } from "../types/auth.types";
import { getEffectiveAuth } from "../utils/auth.utils";
import { invokeEnterprise } from "../utils/enterprise.utils";
import { BaseRepo } from "./base.repo";

export abstract class BaseAuthRepo extends BaseRepo {
  abstract signUpWithEmail(email: string, password: string): Promise<void>;
  abstract sendEmailVerificationForCurrentUser(): Promise<void>;
  abstract signOut(): Promise<void>;
  abstract signInWithEmail(email: string, password: string): Promise<void>;
  abstract sendPasswordResetRequest(email: string): Promise<void>;
  abstract signInWithGoogleTokens(
    idToken: string,
    accessToken: string,
  ): Promise<void>;
  abstract signInWithSsoTokens(payload: {
    token: string;
    refreshToken: string;
    authId: string;
    email: string;
  }): Promise<void>;
  abstract getCurrentUser(): AuthUser | null;
  abstract deleteMyAccount(): Promise<void>;
  abstract refreshTokens(): Promise<void>;
  abstract onAuthStateChanged(
    callback: (user: AuthUser | null) => void,
    onError: (error: Error) => void,
  ): () => void;
}

export class CloudAuthRepo extends BaseAuthRepo {
  async signUpWithEmail(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(getEffectiveAuth(), email, password);
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

  async signInWithEmail(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(getEffectiveAuth(), email, password);
  }

  async sendPasswordResetRequest(email: string): Promise<void> {
    await sendPasswordResetEmail(getEffectiveAuth(), email);
  }

  async signInWithGoogleTokens(
    idToken: string,
    accessToken: string,
  ): Promise<void> {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    await signInWithCredential(getEffectiveAuth(), credential);
  }

  async signInWithSsoTokens(): Promise<void> {
    throw new Error("SSO sign-in is not supported in cloud mode.");
  }

  private toAuthUser(firebaseUser: FirebaseUser | null): AuthUser | null {
    if (!firebaseUser) {
      return null;
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      providers: firebaseUser.providerData.map((p) => p.providerId),
    };
  }

  getCurrentUser(): AuthUser | null {
    return this.toAuthUser(getEffectiveAuth().currentUser);
  }

  async deleteMyAccount(): Promise<void> {
    const user = getEffectiveAuth().currentUser;
    if (!user) {
      throw new Error("No user is currently signed in.");
    }

    await user.delete();
  }

  async refreshTokens(): Promise<void> {
    // noop — Firebase handles token refresh internally
  }

  onAuthStateChanged(
    callback: (user: AuthUser | null) => void,
    onError: (error: Error) => void,
  ): () => void {
    return getEffectiveAuth().onAuthStateChanged(
      (firebaseUser) => callback(this.toAuthUser(firebaseUser)),
      (error) => onError(error),
    );
  }
}

const enterpriseAuth$ = new BehaviorSubject<AuthUser | null>(null);

export class EnterpriseAuthRepo extends BaseAuthRepo {
  private setAuthState(res: {
    token: string;
    refreshToken: string;
    auth: { id: string; email: string };
  }): void {
    localStorage.setItem("enterprise_token", res.token);
    localStorage.setItem("enterprise_refreshToken", res.refreshToken);
    const user: AuthUser = {
      uid: res.auth.id,
      email: res.auth.email,
      providers: [],
      displayName: null,
    };
    enterpriseAuth$.next(user);
  }

  private clearAuthState(): void {
    localStorage.removeItem("enterprise_token");
    localStorage.removeItem("enterprise_refreshToken");
    enterpriseAuth$.next(null);
  }

  async signUpWithEmail(email: string, password: string): Promise<void> {
    const res = await invokeEnterprise("auth/register", { email, password });
    this.setAuthState(res);
  }

  async sendEmailVerificationForCurrentUser(): Promise<void> {
    // noop
  }

  async signOut(): Promise<void> {
    await invokeEnterprise("auth/logout", {});
    this.clearAuthState();
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const res = await invokeEnterprise("auth/login", { email, password });
    this.setAuthState(res);
  }

  async sendPasswordResetRequest(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async signInWithGoogleTokens(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async signInWithSsoTokens(payload: {
    token: string;
    refreshToken: string;
    authId: string;
    email: string;
  }): Promise<void> {
    this.setAuthState({
      token: payload.token,
      refreshToken: payload.refreshToken,
      auth: { id: payload.authId, email: payload.email },
    });
  }

  getCurrentUser(): AuthUser | null {
    return null;
  }

  async deleteMyAccount(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async refreshTokens(): Promise<void> {
    const refreshToken = localStorage.getItem("enterprise_refreshToken");
    if (!refreshToken) {
      return;
    }

    try {
      const data = await invokeEnterprise("auth/refresh", { refreshToken });
      this.setAuthState(data);
    } catch {
      this.clearAuthState();
    }
  }

  onAuthStateChanged(
    callback: (user: AuthUser | null) => void,
    _onError: (error: Error) => void,
  ): () => void {
    const subscription = enterpriseAuth$.subscribe(callback);
    return () => subscription.unsubscribe();
  }
}
