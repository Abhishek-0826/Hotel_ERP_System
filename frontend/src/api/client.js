import axios from "axios";
import { SUPABASE_AUTH, supabase } from "../lib/supabase";
import { getTenantSlug } from "../lib/tenantRoute";

export const TOKEN_STORAGE_KEY = "roost_token";
export const USER_STORAGE_KEY = "roost_user";

const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "/api/v1").trim();

const client = axios.create({
  baseURL: configuredBaseUrl.replace(/\/+$/, ""),
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

client.interceptors.request.use(async (config) => {
  // Supabase refreshes expired access tokens itself inside getSession().
  const token = SUPABASE_AUTH
    ? (await supabase.auth.getSession()).data.session?.access_token
    : localStorage.getItem(TOKEN_STORAGE_KEY);

  // Tells the API which hotel this page belongs to (the first URL segment).
  const tenantSlug = getTenantSlug();
  if (tenantSlug) config.headers["X-Tenant-Slug"] = tenantSlug;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("roost:unauthorized"));
    }

    const payload = error?.response?.data;
    const normalizedError = new Error(
      payload?.message ||
        (error?.code === "ECONNABORTED"
          ? "The request timed out. Please try again."
          : error?.request
            ? "The ROOST service is unavailable. Please try again shortly."
            : "Something went wrong. Please try again.")
    );

    normalizedError.name = "ApiError";
    normalizedError.code = payload?.code || error?.code || "API_ERROR";
    normalizedError.status = error?.response?.status || 0;
    normalizedError.errors = payload?.errors || {};
    normalizedError.response = error?.response;
    normalizedError.cause = error;

    return Promise.reject(normalizedError);
  }
);

export async function apiRequest(config) {
  const response = await client.request(config);
  const payload = response.data;

  if (payload && typeof payload === "object" && "success" in payload) {
    if (payload.success === false) {
      const error = new Error(payload.message || "The request failed.");
      error.name = "ApiError";
      error.code = payload.code || "API_ERROR";
      error.status = response.status;
      error.errors = payload.errors || {};
      throw error;
    }

    return payload.data ?? payload;
  }

  return payload;
}

export function getApiErrorMessage(error, fallback = "Unable to complete the request.") {
  return error?.message || error?.response?.data?.message || fallback;
}

export default client;
