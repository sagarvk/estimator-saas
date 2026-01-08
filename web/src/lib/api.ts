import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export async function api(path: string, opts: any = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) throw new Error("Not authenticated. Please sign in again.");

  const isForm = !!opts.isForm;

  const headers: Record<string, string> = {
    ...(opts.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  // IMPORTANT: don't set Content-Type for FormData (browser sets boundary)
  if (!isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ?? undefined,
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {}

  if (!res.ok) throw new Error(json?.error || json?.message || text || `HTTP ${res.status}`);
  return json;
}
