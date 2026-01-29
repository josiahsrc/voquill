export type Auth = {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
};

export type AuthContext = {
  userId: string;
  email: string;
  isAdmin: boolean;
  expiresAt: string;
};
