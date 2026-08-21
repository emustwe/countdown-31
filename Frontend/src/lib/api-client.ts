import { getAuthState, useAuthStore } from "../stores/auth-store";
import type { ApiErrorEnvelope, RefreshResponse } from "./api-types";

import { apiBaseUrl } from "./runtime-host";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly envelope: ApiErrorEnvelope,
  ) {
    super(typeof envelope.message === "string" ? envelope.message : "Request failed");
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

let refreshInFlight: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  // The refresh token is the httpOnly `rt` cookie — sent automatically with credentials:"include".
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${apiBaseUrl()}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!res.ok) {
          useAuthStore.getState().clear();
          return null;
        }
        const data = (await res.json()) as RefreshResponse;
        useAuthStore.getState().setTokens({ accessToken: data.accessToken });
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${apiBaseUrl()}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function rawRequest<T>(path: string, options: RequestOptions, accessToken: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth !== false && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include", // send/receive the httpOnly refresh cookie on /auth/*
  });

  // Some endpoints (notably DELETE) reply with an empty body — 204, or 200 with 0 bytes. Read as
  // text and parse only when there's content, so an empty success doesn't throw a JSON-parse error
  // (which would skip the caller's onSuccess, e.g. a cache invalidation after a delete).
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    throw new ApiError(res.status, (data ?? { message: res.statusText }) as ApiErrorEnvelope);
  }
  return data as T;
}

/** Fetch wrapper that attaches the access token and transparently retries once after a
 * silent token refresh on a 401 — callers never have to think about token expiry. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { accessToken } = getAuthState();

  try {
    return await rawRequest<T>(path, options, accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401 && options.auth !== false) {
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        return rawRequest<T>(path, options, newAccessToken);
      }
    }
    throw error;
  }
}
