import { env } from "../config/env";
import { supabaseClient } from "../supabase/client";

const DEFAULT_API_BASE_URL = "http://localhost:8082/api/v1";

function normalizeBaseUrl(value: string) {
  if (!value) {
    return DEFAULT_API_BASE_URL;
  }
  return value.replace(/\/+$/, "");
}

const API_BASE_URL = normalizeBaseUrl(env.apiBaseUrl);

async function requestJson(path: string, init?: RequestInit, options?: { isJsonBody?: boolean }) {
  const headers = new Headers(init?.headers ?? {});
  if (options?.isJsonBody !== false && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Authorization")) {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : `Falha na requisicao (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

export async function apiGet(path: string) {
  return requestJson(path);
}

export async function apiPost(path: string, body: unknown) {
  return requestJson(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPostFormData(path: string, body: FormData) {
  return requestJson(
    path,
    {
      method: "POST",
      body,
    },
    { isJsonBody: false },
  );
}

export async function apiPatch(path: string, body: unknown) {
  return requestJson(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiPut(path: string, body: unknown) {
  return requestJson(path, { method: "PUT", body: JSON.stringify(body) });
}

export async function apiDelete(path: string) {
  return requestJson(path, {
    method: "DELETE",
  });
}

export async function apiDeleteWithBody(path: string, body: unknown) {
  return requestJson(path, { method: "DELETE", body: JSON.stringify(body) });
}
