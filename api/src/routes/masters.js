import express from "express";

export function makeMastersRouter({ db }) {
  const r = express.Router();

  r.get("/project-types", async (req, res) => {
    const { data, error } = await db
      .from("project_types")
      .select("*")
      .order("id");
    if (error) return res.status(400).json({ error: error.message });
    res.json({ project_types: data });
  });

  r.get("/qualities", async (req, res) => {
    const project_type_code = req.query.project_type_code;
    let q = db.from("qualities").select("*").order("id");
    if (project_type_code) q = q.eq("project_type_code", project_type_code);
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ qualities: data });
  });

  r.get("/descriptions", async (req, res) => {
    const project_type_code = req.query.project_type_code;
    let q = db.from("descriptions").select("*").order("sort_order");
    if (project_type_code) q = q.eq("project_type_code", project_type_code);
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ descriptions: data });
  });

  r.get("/charges", async (req, res) => {
    const project_type_code = req.query.project_type_code;
    const { data, error } = await db
      .from("project_type_charges")
      .select("*")
      .eq("project_type_code", project_type_code)
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ charges: data });
  });

  return r;
}
