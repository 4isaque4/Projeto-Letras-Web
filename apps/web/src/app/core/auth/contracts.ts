export type UserRole = "admin" | "tutor" | "alfabetizando";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type AuthProvider = "supabase";
