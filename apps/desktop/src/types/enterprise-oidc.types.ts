export type EnterpriseOidcPayload = {
  token: string;
  refreshToken: string;
  state: string;
  authId: string;
  email: string;
};

export const ENTERPRISE_OIDC_EVENT = "voquill:enterprise-oidc-auth";
export const ENTERPRISE_OIDC_COMMAND = "start_enterprise_oidc_sign_in";
