import { supabaseAdmin } from "../supabaseAdmin.js";

export async function requireUser(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user)
      return res.status(401).json({ error: "Invalid token" });

    req.user = data.user;
    req.accessToken = token;
    next();
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
  }
}
