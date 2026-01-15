import express from "express";
import { buildEstimate } from "../services/calc.js";

export function makeEstimateRouter({ db, gstRate = 0.18 }) {
  const r = express.Router();

  // ✅ PREVIEW: calculates totals + breakup (no payment / no pdf)
  r.post("/preview", async (req, res) => {
    try {
      const p = req.body || {};

      const {
        client_name,
        project_address,
        plot_length_ft,
        plot_width_ft,
        floors,
        builtup_area_sqft,
        project_type_code,
        quality_id,
      } = p;

      const s = p.settings || {};
      const dateMode = String(s.date_mode || "auto").toLowerCase();
      const manual = s.estimate_date_manual || null;

      if (dateMode === "manual") {
        if (!manual)
          return res.status(400).json({ error: "Manual date is required." });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(manual))) {
          return res
            .status(400)
            .json({ error: "Invalid manual date format (YYYY-MM-DD)." });
        }
      }

      // numeric validation
      const builtupNum = Number(builtup_area_sqft);
      if (!Number.isFinite(builtupNum) || builtupNum <= 0) {
        return res
          .status(400)
          .json({ error: "Built-up area must be a number > 0." });
      }

      const showPlotDetails = s.show_plot_details !== false;
      const showFloors = s.show_floors !== false;

      if (showPlotDetails) {
        if (plot_length_ft != null) {
          const pl = Number(plot_length_ft);
          if (!Number.isFinite(pl) || pl <= 0)
            return res
              .status(400)
              .json({ error: "Plot Length must be a number > 0." });
        }
        if (plot_width_ft != null) {
          const pw = Number(plot_width_ft);
          if (!Number.isFinite(pw) || pw <= 0)
            return res
              .status(400)
              .json({ error: "Plot Width must be a number > 0." });
        }
      }

      if (showFloors) {
        if (floors != null) {
          const fl = Number(floors);
          if (!Number.isInteger(fl) || fl <= 0)
            return res.status(400).json({
              error: "No. of Floors must be a whole number (1,2,3...).",
            });
        }
      }

      if (
        !client_name ||
        !project_address ||
        !builtup_area_sqft ||
        !project_type_code ||
        !quality_id
      ) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // 1) Load quality (rate/sqft)
      const { data: q, error: qerr } = await db
        .from("qualities")
        .select("id, name, rate_per_sqft")
        .eq("id", Number(quality_id))
        .single();
      if (qerr) return res.status(400).json({ error: qerr.message });

      // 2) Load project type name
      const { data: pt, error: pterr } = await db
        .from("project_types")
        .select("code, name")
        .eq("code", project_type_code)
        .single();
      if (pterr) return res.status(400).json({ error: pterr.message });

      // 3) Total including GST (your rule)
      const ratePerSqft = Number(q.rate_per_sqft);
      const builtup = Number(builtup_area_sqft);
      const totalInclGst = Math.round(ratePerSqft * builtup * 100) / 100;

      // 4) Split GST -> subtotal excludes GST
      const gstPercent = gstRate * 100; // 18.00
      const subtotal = Math.round((totalInclGst / (1 + gstRate)) * 100) / 100;
      const gstAmount = Math.round((totalInclGst - subtotal) * 100) / 100;

      // 5) Load descriptions for project type
      const { data: desc, error: derr } = await db
        .from("descriptions")
        .select("*")
        .eq("project_type_code", project_type_code)
        .order("sort_order", { ascending: true });
      if (derr) return res.status(400).json({ error: derr.message });

      // 6) Load charges row (contingencies + electrification)
      const { data: charges, error: cerr } = await db
        .from("project_type_charges")
        .select("contingencies_percent, electrification_percent")
        .eq("project_type_code", project_type_code)
        .single();
      if (cerr) return res.status(400).json({ error: cerr.message });

      // 7) Build breakup rows based on subtotal
      // 7) Build breakup rows using BASE (incl GST)
      const ctx = {
        builtup_area_sqft: builtup,
        builtupAreaSqft: builtup, // ✅ extra alias to be safe
      };

      const built = buildEstimate({
        builtupAreaSqft: builtup_area_sqft,
        ratePerSqft: q.rate_per_sqft,
        gstRate,
        descriptions: desc,
        charges,
      });

      res.json({
        ok: true,
        meta: {
          project_type_name: pt.name,
          quality_name: q.name,
          rate_per_sqft: ratePerSqft,
          builtup_area_sqft: builtup,
        },
        final: {
          sub_total_excl_gst: built.subtotalExclGst,
          gst_amount: built.gstAmount,
          grand_total_incl_gst: built.totalInclGst,
        },
        rows: built.rows,

        // optional while testing (remove later)
        debug: built.debug,
        input: {
          client_name,
          project_address,
          plot_length_ft,
          plot_width_ft,
          floors,
          builtup_area_sqft,
          project_type_code,
          quality_id,
        },
      });
    } catch (e) {
      return res.status(400).json({ error: e.message || "Preview failed" });
    }
  });

  // ✅ HISTORY
  r.get("/history", async (req, res) => {
    const engineerId = req.user.id;

    const { data, error } = await db
      .from("estimates")
      .select(
        "id, ref_no, estimate_date, client_name, project_address, grand_total_incl_gst, status, pdf_path, created_at"
      )
      .eq("engineer_id", engineerId)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ estimates: data });
  });

  // ✅ DOWNLOAD SIGNED URL
  r.get("/download/:id", async (req, res) => {
    const engineerId = req.user.id;
    const id = req.params.id;

    const { data: est, error } = await db
      .from("estimates")
      .select("pdf_path")
      .eq("id", id)
      .eq("engineer_id", engineerId)
      .single();

    if (error || !est)
      return res.status(404).json({ error: "Estimate not found" });

    const pdfBucket = process.env.PDF_BUCKET || "estimate-pdfs";
    const { data: signed, error: sErr } = await db.storage
      .from(pdfBucket)
      .createSignedUrl(est.pdf_path, 600);
    if (sErr) return res.status(400).json({ error: sErr.message });

    res.json({ download_url: signed.signedUrl });
  });

  return r;
}
