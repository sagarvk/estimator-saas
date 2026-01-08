// apps/api/src/routes/settings.js
import express from "express";

export function makeSettingsRouter({ db }) {
  const r = express.Router();

  r.get("/pricing", async (_req, res) => {
    const { data, error } = await db
      .from("app_settings")
      .select("value_json")
      .eq("key", "pricing")
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ pricing: data.value_json });
  });

  return r;
}
