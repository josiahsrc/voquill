import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { produceAppState } from "../store";
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
  abstract getCurrentUser(): AuthUser | null;
  abstract deleteMyAccount(): Promise<void>;
  abstract refreshTokens(): Promise<void>;
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

  getCurrentUser(): AuthUser | null {
    const user = getEffectiveAuth().currentUser;
    if (!user) {
      return null;
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      providers: user.providerData.map((provider) => provider.providerId),
    };
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
}

export class EnterpriseAuthRepo extends BaseAuthRepo {
  private setAuthState(res: {
    token: string;
    refreshToken: string;
    auth: { id: string; email: string };
  }): void {
    localStorage.setItem("enterprise_token", res.token);
    localStorage.setItem("enterprise_refreshToken", res.refreshToken);
    produceAppState((draft) => {
      draft.auth = {
        uid: res.auth.id,
        email: res.auth.email,
        providers: [],
        displayName: null,
      };
    });
  }

  private clearAuthState(): void {
    localStorage.removeItem("enterprise_token");
    localStorage.removeItem("enterprise_refreshToken");
    produceAppState((draft) => {
      draft.auth = null;
    });
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
}
