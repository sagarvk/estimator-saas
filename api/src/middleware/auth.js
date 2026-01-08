import { createClient } from "@supabase/supabase-js";

export function makeAuthMiddleware({ supabaseUrl, supabaseAnonKey }) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  return async function requireUser(req, res, next) {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user)
      return res.status(401).json({ error: "Invalid token" });

    req.user = data.user;
    next();
  };
}
