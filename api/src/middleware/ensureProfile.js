export function makeEnsureProfile({ db }) {
  return async function ensureProfile(req, res, next) {
    try {
      const user = req.user; // set by requireUser middleware
      if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

      // Check if profile exists
      const { data: existing, error: selErr } = await db
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (selErr) return res.status(400).json({ error: selErr.message });

      if (!existing) {
        // Create minimal profile row
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "";

        const { error: insErr } = await db.from("profiles").insert({
          id: user.id,
          name: fullName,
          phone: user.phone || null,
        });

        if (insErr) return res.status(400).json({ error: insErr.message });
      }

      next();
    } catch (e) {
      return res
        .status(400)
        .json({ error: e.message || "Failed to ensure profile" });
    }
  };
}
