import { resolveApiBaseUrl } from './resolve-api-base-url';

const REQUEST_TIMEOUT_MS = 10000;
const LOCAL_WEB_FALLBACK_API_BASE_URLS = ['http://localhost:8082/api/v1', 'http://127.0.0.1:8082/api/v1'];
const API_BASE_URL = resolveApiBaseUrl();

class HttpClient {
  private authToken: string | null = null;
  private learnerProfileId: string | null = null;

  constructor(private readonly baseUrl: string) {}

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  setLearnerIdentity(learnerProfileId: string | null) {
    this.learnerProfileId = learnerProfileId;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async postFormData<T>(path: string, body: FormData): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body,
    });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private buildUrl(baseUrl: string, path: string): string {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  private getApiV1Base(baseUrl: string): string | null {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    if (normalizedBase.endsWith('/api/v1')) {
      return null;
    }
    return `${normalizedBase}/api/v1`;
  }

  private getRequestBaseUrls(path: string): string[] {
    const normalizedBase = this.baseUrl.replace(/\/+$/, '');
    const candidates = [normalizedBase];
    const apiV1Base = this.getApiV1Base(normalizedBase);

    if (apiV1Base && path.startsWith('/')) {
      candidates.push(apiV1Base);
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location?.hostname?.toLowerCase() || '';
      const isLocalWeb = hostname === 'localhost' || hostname === '127.0.0.1';
      const isLocalApi = /^http:\/\/(localhost|127\.0\.0\.1):3000$/i.test(normalizedBase);

      if (isLocalWeb && isLocalApi) {
        candidates.push(...LOCAL_WEB_FALLBACK_API_BASE_URLS);
      }
    }

    return Array.from(new Set(candidates));
  }

  private shouldRetryWithApiV1(path: string, response: Response): boolean {
    if (!path.startsWith('/')) {
      return false;
    }
    if (response.status === 404) {
      return true;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (response.ok && contentType.includes('text/html')) {
      return true;
    }
    return false;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);

    if (this.authToken) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }
    if (!this.authToken && this.learnerProfileId) {
      headers.set('X-Learner-Profile-Id', this.learnerProfileId);
    }

    const baseUrls = this.getRequestBaseUrls(path);
    let lastError: unknown = null;
    let lastResponseText = '';
    let lastResponseStatus: number | null = null;

    for (const baseUrl of baseUrls) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const url = this.buildUrl(baseUrl, path);

      // eslint-disable-next-line no-console
      console.log(`[http] ${init.method ?? 'GET'} ${url}`);

      try {
        const response = await fetch(url, {
          ...init,
          headers,
          signal: controller.signal,
        });

        const contentType = response.headers.get('content-type') ?? '';

        // eslint-disable-next-line no-console
        console.log(`[http] ${response.status} ${url}`);

        if (response.ok && !contentType.includes('text/html')) {
          return (await response.json()) as T;
        }

        lastResponseStatus = response.status;
        lastResponseText = await response.text();

        // Recebeu resposta HTTP real (JSON/texto) — o endpoint foi encontrado.
        // Só tenta o próximo baseUrl se a resposta for HTML (proxy/SPA no lugar errado).
        if (!contentType.includes('text/html')) {
          break;
        }
      } catch (error) {
        // Erro de rede (timeout, connection refused) — tenta o próximo baseUrl.
        // eslint-disable-next-line no-console
        console.warn(`[http] ERRO ${url}`, error);
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (lastResponseStatus !== null) {
      throw new Error(`Request failed (${lastResponseStatus}): ${lastResponseText}`);
    }

    if ((lastError as { name?: string })?.name === 'AbortError') {
      throw new Error(
        `Timeout ao chamar ${path} em ${baseUrls.join(' ou ')}. Verifique EXPO_PUBLIC_API_URL e se a API esta acessivel.`,
      );
    }

    throw new Error(
      `Falha de conexao com ${path} em ${baseUrls.join(' ou ')}. Verifique EXPO_PUBLIC_API_URL e se a API esta rodando.`,
    );
  }
}

export { API_BASE_URL };
export const httpClient = new HttpClient(API_BASE_URL);

