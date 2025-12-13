export type GoogleAuthPayload = {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  user: {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };
};

export const GOOGLE_AUTH_EVENT = "voquill:google-auth";
export const GOOGLE_AUTH_COMMAND = "start_google_sign_in";
