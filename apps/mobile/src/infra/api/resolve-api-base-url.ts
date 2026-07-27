import { NativeModules, Platform } from 'react-native';

function normalize(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function hostFromScriptUrl(scriptUrl?: string): string | null {
  if (!scriptUrl) return null;

  try {
    return new URL(scriptUrl).hostname || null;
  } catch {
    const match = scriptUrl.match(/^[a-zA-Z]+:\/\/([^/:]+)/);
    return match?.[1] ?? null;
  }
}

function hostFromBaseUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    const match = url.match(/^[a-zA-Z]+:\/\/([^/:]+)/);
    return match?.[1] ?? null;
  }
}

function isIpv4(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  return host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2';
}

export function resolveApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    const webEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ?.EXPO_PUBLIC_API_URL;

    if (webEnv && webEnv.trim().length > 0) {
      return normalize(webEnv);
    }

    if (typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname.toLowerCase();

      if (host === 'painel.letras.cloud') {
        return `${window.location.origin.replace(/\/+$/, '')}/api/v1`;
      }

      if (host === 'mobile.letras.cloud' || host === 'app.letras.cloud') {
        return 'https://painel.letras.cloud/api/v1';
      }
    }

    return 'http://localhost:3000';
  }

  const scriptUrl = (NativeModules as { SourceCode?: { scriptURL?: string } })?.SourceCode?.scriptURL;
  const metroHost = hostFromScriptUrl(scriptUrl);
  const isNativeRuntime = Platform.OS === 'android' || Platform.OS === 'ios';

  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.trim().length > 0) {
    const normalizedExplicit = normalize(explicit);
    const explicitHost = hostFromBaseUrl(normalizedExplicit);

    const isWrongHostOnNative = isNativeRuntime && isLoopbackHost(explicitHost);
    if (isWrongHostOnNative) {
      if (metroHost && isIpv4(metroHost) && !isLoopbackHost(metroHost)) {
        return `http://${metroHost}:3000`;
      }

      if (Platform.OS === 'android') {
        return 'http://10.0.2.2:3000';
      }
    }

    return normalizedExplicit;
  }

  if (metroHost && isIpv4(metroHost)) {
    return `http://${metroHost}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}
