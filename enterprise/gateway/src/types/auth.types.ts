export type AuthRow = {
  id: string;
  email: string;
  password_hash: string | null;
  is_admin: boolean;
  created_at: Date;
  oidc_sub: string | null;
  oidc_provider_id: string | null;
  auth_provider: string;
};
