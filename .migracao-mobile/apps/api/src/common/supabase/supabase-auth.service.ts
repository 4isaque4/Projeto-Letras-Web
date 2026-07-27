import { Injectable, ServiceUnavailableException } from '@nestjs/common';

interface SupabaseErrorPayload {
  msg?: string;
  error?: string;
  message?: string;
}

interface CreateUserResult {
  id: string;
  email: string;
}

interface SignInResult {
  user: {
    id?: string;
  };
}

interface AdminUsersResult {
  users?: Array<{
    id?: string;
    email?: string;
  }>;
}

@Injectable()
export class SupabaseAuthService {
  private readonly supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '') ?? '';
  private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  get isConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.serviceRoleKey);
  }

  ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Auth nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na API e reinicie.',
      );
    }
  }

  async createUser(email: string, password: string, fullName: string): Promise<CreateUserResult> {
    this.ensureConfigured();

    const response = await fetch(`${this.supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          fullName,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(this.extractError(await response.json().catch(() => ({}))));
    }

    const payload = (await response.json()) as { id?: string; email?: string };
    if (!payload.id || !payload.email) {
      throw new Error('Resposta inesperada do Supabase ao criar usuario.');
    }

    return {
      id: payload.id,
      email: payload.email,
    };
  }

  async deleteUser(userId: string): Promise<void> {
    this.ensureConfigured();

    const response = await fetch(`${this.supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(this.extractError(await response.json().catch(() => ({}))));
    }
  }

  async signInWithPassword(email: string, password: string): Promise<{ userId: string } | null> {
    this.ensureConfigured();

    const response = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as SupabaseErrorPayload;
      const errorText = this.extractError(payload).toLowerCase();
      if (errorText.includes('invalid') || errorText.includes('credentials') || errorText.includes('grant')) {
        return null;
      }

      throw new Error(this.extractError(payload));
    }

    const payload = (await response.json()) as SignInResult;
    const userId = payload.user?.id;
    if (!userId) {
      return null;
    }

    return { userId };
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    const signIn = await this.signInWithPassword(email, password);
    return Boolean(signIn?.userId);
  }

  async findUserIdByEmail(email: string): Promise<string | null> {
    this.ensureConfigured();

    const normalizedEmail = email.trim().toLowerCase();
    const perPage = 1000;

    for (let page = 1; page <= 50; page += 1) {
      const response = await fetch(`${this.supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
        method: 'GET',
        headers: this.headers(),
      });

      if (!response.ok) {
        throw new Error(this.extractError(await response.json().catch(() => ({}))));
      }

      const payload = (await response.json()) as AdminUsersResult;
      const users = Array.isArray(payload.users) ? payload.users : [];
      const found = users.find((user) => user.email?.trim().toLowerCase() === normalizedEmail);

      if (found?.id) {
        return found.id;
      }

      if (users.length < perPage) {
        break;
      }
    }

    return null;
  }

  private headers() {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      'Content-Type': 'application/json',
    };
  }

  private extractError(payload: SupabaseErrorPayload): string {
    return payload.msg || payload.error || payload.message || 'Erro desconhecido do Supabase Auth.';
  }
}
