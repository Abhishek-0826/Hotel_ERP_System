import { createClient } from "@supabase/supabase-js";

const url = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const publishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();

// Supabase Auth is used when both variables are present; otherwise the app
// falls back to the API's own email/password login (AUTH_MODE=legacy|hybrid).
export const SUPABASE_AUTH = Boolean(url && publishableKey);

// The publishable key is designed to be public. Data access is still enforced
// by the API (and by Row Level Security if the Data API is ever used).
export const supabase = SUPABASE_AUTH
  ? createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
