import express from "express";
import crypto from "crypto";
import { buildEstimate } from "../services/calc.js";
import { buildEstimatePdfBuffer } from "../services/pdf.js";

function verifyRazorpaySignature({ orderId, paymentId, signature, secret }) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${orderId}|${paymentId}`);
  const digest = hmac.digest("hex");
  return digest === signature;
}

async function getPricing(db) {
  const { data, error } = await db
    .from("app_settings")
    .select("value_json")
    .eq("key", "pricing")
    .single();
  if (error) throw new Error(error.message);
  return data.value_json;
}

async function downloadStorageBuffer(db, bucket, path) {
  if (!path) return null;
  const { data, error } = await db.storage.from(bucket).download(path);
  if (error) return null;
  const arrBuf = await data.arrayBuffer();
  return Buffer.from(arrBuf);
}

async function finalizeEstimateAndGetSignedUrl({
  db,
  engineerId,
  payload,
  paymentId = null,
}) {
  const p = payload;

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

  // -------------------
  // Settings (no DB storage)
  // -------------------
  const s = p.settings || {};
  const dateMode = String(s.date_mode || "auto").toLowerCase();
  const manual = s.estimate_date_manual || null;

  const showPlotDetails = s.show_plot_details !== false; // default true
  const showFloors = s.show_floors !== false; // default true

  let estDate = new Date().toISOString().slice(0, 10);
  if (dateMode === "manual") {
    if (!manual) throw new Error("Manual date is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(manual))) {
      throw new Error("Invalid manual date format (YYYY-MM-DD).");
    }
    estDate = String(manual);
  }

  // -------------------
  // Numeric validations (server-side)
  // -------------------
  const builtupNum = Number(builtup_area_sqft);
  if (!Number.isFinite(builtupNum) || builtupNum <= 0) {
    throw new Error("Built-up area must be a number > 0.");
  }

  if (showPlotDetails) {
    if (plot_length_ft != null) {
      const pl = Number(plot_length_ft);
      if (!Number.isFinite(pl) || pl <= 0)
        throw new Error("Plot Length must be a number > 0.");
    }
    if (plot_width_ft != null) {
      const pw = Number(plot_width_ft);
      if (!Number.isFinite(pw) || pw <= 0)
        throw new Error("Plot Width must be a number > 0.");
    }
  }

  if (showFloors) {
    if (floors != null) {
      const fl = Number(floors);
      if (!Number.isInteger(fl) || fl <= 0)
        throw new Error("No. of Floors must be a whole number (1,2,3...).");
    }
  }

  // Load quality + project type names
  const { data: q, error: qerr } = await db
    .from("qualities")
    .select("*")
    .eq("id", quality_id)
    .single();
  if (qerr) throw new Error(qerr.message);

  const { data: pt, error: pterr } = await db
    .from("project_types")
    .select("*")
    .eq("code", project_type_code)
    .single();
  if (pterr) throw new Error(pterr.message);

  const gstRate = Number(process.env.GST_RATE || 0.18);

  // Load descriptions + charges
  const { data: desc, error: derr } = await db
    .from("descriptions")
    .select("*")
    .eq("project_type_code", project_type_code)
    .order("sort_order");
  if (derr) throw new Error(derr.message);

  const { data: charges, error: cerr } = await db
    .from("project_type_charges")
    .select("*")
    .eq("project_type_code", project_type_code)
    .single();
  if (cerr) throw new Error(cerr.message);

  // ✅ Reverse build using BASE (incl GST)
  const built = buildEstimate({
    builtupAreaSqft: builtup_area_sqft,
    ratePerSqft: q.rate_per_sqft,
    gstRate,
    descriptions: desc,
    charges,
  });

  // ✅ hard validation so NOT NULL columns never get null
  if (!Number.isFinite(built?.subtotalExclGst)) {
    throw new Error(
      "Estimate calculation failed (sub_total_excl_gst invalid)."
    );
  }
  if (
    !Number.isFinite(built?.gstAmount) ||
    !Number.isFinite(built?.totalInclGst)
  ) {
    throw new Error("Estimate calculation failed (GST/Total invalid).");
  }

  // Generate ref no atomically
  const { data: refData, error: refErr } = await db.rpc("next_est_ref", {
    p_engineer: engineerId,
  });
  if (refErr) throw new Error(refErr.message);
  const refNo = refData;

  //const estDate = new Date().toISOString().slice(0, 10);

  // Load engineer profile images
  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", engineerId)
    .single();

  const assetsBucket = process.env.ASSETS_BUCKET || "engineer-assets";
  const letterheadBuffer = await downloadStorageBuffer(
    db,
    assetsBucket,
    profile?.letterhead_path
  );
  const signsealBuffer = await downloadStorageBuffer(
    db,
    assetsBucket,
    profile?.signseal_path
  );

  const ratePerSqft = Number(q.rate_per_sqft);

  // Build PDF buffer
  const pdfBuffer = await buildEstimatePdfBuffer({
    letterheadBuffer,
    signsealBuffer,
    refNo,
    estDate,
    clientName: client_name,
    projectAddress: project_address,
    plotLengthFt: plot_length_ft,
    plotWidthFt: plot_width_ft,
    floors: floors,
    projectTypeName: pt.name,
    qualityName: q.name,
    builtupArea: builtup_area_sqft,
    ratePerSqft,
    rows: built.rows,
    subtotal: built.subtotalExclGst,
    gstAmount: built.gstAmount,
    total: built.totalInclGst,
    showPlotDetails,
    showFloors,
  });

  // Upload PDF to storage
  const pdfBucket = process.env.PDF_BUCKET || "estimate-pdfs";
  const pdfPath = `${engineerId}/${refNo}.pdf`;

  const { error: upErr } = await db.storage
    .from(pdfBucket)
    .upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) throw new Error(upErr.message);

  // Map project_type_code -> ptype_id
  const { data: ptypeRow, error: ptypeErr } = await db
    .from("project_types")
    .select("id")
    .eq("code", project_type_code)
    .single();
  if (ptypeErr) throw new Error(ptypeErr.message);

  // Save estimate row
  const { data: est, error: estErr } = await db
    .from("estimates")
    .insert({
      engineer_id: engineerId,
      ref_no: refNo,
      estimate_date: estDate,
      client_name,
      project_address,
      plot_length_ft,
      plot_width_ft,
      floors,
      builtup_area_sqft,
      ptype_id: ptypeRow.id,
      quality_id: Number(quality_id),
      rate_per_sqft: ratePerSqft,
      sub_total_excl_gst: built.subtotalExclGst,
      gst_amount: built.gstAmount,
      grand_total_incl_gst: built.totalInclGst,
      status: paymentId ? "paid" : "free",
      line_items: built.rows,
      pdf_path: pdfPath,
      payment_id: paymentId,
    })
    .select("*")
    .single();

  if (estErr) throw new Error(estErr.message);

  // If payment exists, link it
  if (paymentId) {
    const { error: linkErr } = await db
      .from("payments")
      .update({ estimate_id: est.id })
      .eq("id", paymentId);

    if (linkErr) throw new Error(linkErr.message);
  }

  // Signed URL for download (10 minutes)
  const { data: signed, error: sErr } = await db.storage
    .from(pdfBucket)
    .createSignedUrl(pdfPath, 600);

  if (sErr) throw new Error(sErr.message);

  return { est, refNo, downloadUrl: signed.signedUrl };
}

export function makePaymentsRouter({ db, razorpay }) {
  const r = express.Router();

  r.get("/quota", async (req, res) => {
    const engineerId = req.user.id;
    const FREE_LIMIT = Number(process.env.FREE_ESTIMATES_LIMIT || 2);

    const { data, error } = await db
      .from("profiles")
      .select("free_estimates_used")
      .eq("id", engineerId)
      .single();

    if (error) return res.status(400).json({ error: error.message });

    const used = Number(data?.free_estimates_used || 0);
    res.json({
      free_left: Math.max(0, FREE_LIMIT - used),
      used,
      limit: FREE_LIMIT,
    });
  });

  // Create order for ₹price_per_estimate_inr (backend decides price)
  r.post("/create-order", async (req, res) => {
    try {
      const engineerId = req.user.id;

      const pricing = await getPricing(db);
      const amountInr = Number(pricing.price_per_estimate_inr || 399);
      const amountPaise = Math.round(amountInr * 100);

      const estimatePayload = req.body?.estimate_payload;
      if (!estimatePayload)
        return res.status(400).json({ error: "estimate_payload is required" });

      // ✅ FREE DEMO: first 2 estimates free (server enforced)
      const FREE_LIMIT = Number(process.env.FREE_ESTIMATES_LIMIT || 2);

      const { data: canConsume, error: consumeErr } = await db.rpc(
        "consume_free_estimate",
        { p_engineer: engineerId, p_limit: FREE_LIMIT }
      );

      if (consumeErr)
        return res.status(400).json({ error: consumeErr.message });

      if (canConsume) {
        // Optional: store a payments row for history/audit
        const { data: freePay, error: freeErr } = await db
          .from("payments")
          .insert({
            engineer_id: engineerId,
            estimate_id: null,
            provider: "free",
            provider_order_id: `FREE-${Date.now()}`,
            status: "paid",
            amount: 0,
            currency: pricing.currency || "INR",
            estimate_payload: estimatePayload,
            pricing_snapshot: { ...pricing, free_demo: true },
            paid_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (freeErr) return res.status(400).json({ error: freeErr.message });

        const out = await finalizeEstimateAndGetSignedUrl({
          db,
          engineerId,
          payload: estimatePayload,
          paymentId: freePay.id,
        });

        return res.json({
          ok: true,
          free: true,
          estimate_id: out.est.id,
          ref_no: out.refNo,
          download_url: out.downloadUrl,
          message: `Free demo estimate (${FREE_LIMIT} total limit)`,
        });
      }

      // Razorpay order
      const shortEngineer = engineerId.replace(/-/g, "").slice(0, 8); // 8 chars
      const shortTs = Date.now().toString().slice(-10); // 10 chars
      const receipt = `EST${shortEngineer}${shortTs}`; // 3+8+10=21
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: pricing.currency || "INR",
        receipt,
      });

      // Save payment row
      const { data: payRow, error: perr } = await db
        .from("payments")
        .insert({
          engineer_id: engineerId,
          estimate_id: null, // IMPORTANT: see note below
          provider: "razorpay",
          provider_order_id: order.id,
          status: "created",
          amount: amountInr,
          currency: pricing.currency || "INR",
          estimate_payload: estimatePayload,
          pricing_snapshot: pricing,
        })
        .select("*")
        .single();

      if (perr) return res.status(400).json({ error: perr.message });

      res.json({
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
        pricing,
        payment_id: payRow.id,
      });
    } catch (e) {
      console.error("create-order error:", e);

      // Razorpay errors often come in e.error / e.response
      const msg =
        e?.error?.description ||
        e?.error?.message ||
        e?.response?.data?.error?.description ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to create order";

      res.status(400).json({ error: msg || "Failed to create order" });
    }
  });

  // Confirm payment -> generate PDF -> store -> save estimate -> return download url
  r.post("/confirm", async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing razorpay fields" });
      }

      // Find payment row
      const { data: payment, error: perr } = await db
        .from("payments")
        .select("*")
        .eq("engineer_id", engineerId)
        .eq("provider", "razorpay")
        .eq("provider_order_id", razorpay_order_id)
        .single();

      if (perr || !payment)
        return res.status(400).json({ error: "Payment record not found" });
      if (payment.status === "paid")
        return res.json({ ok: true, message: "Already confirmed" });

      // Verify signature
      const ok = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        secret: process.env.RAZORPAY_KEY_SECRET,
      });

      if (!ok)
        return res.status(400).json({ error: "Invalid payment signature" });

      // Mark payment PAID
      const { error: uerr } = await db
        .from("payments")
        .update({
          status: "paid",
          provider_payment_id: razorpay_payment_id,
          provider_signature: razorpay_signature,
          paid_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (uerr) return res.status(400).json({ error: uerr.message });

      // Extract estimate payload
      const p = payment.estimate_payload;
      // ✅ Generate PDF + save estimate + return signed URL (single source of truth)
      const out = await finalizeEstimateAndGetSignedUrl({
        db,
        engineerId,
        payload: payment.estimate_payload,
        paymentId: payment.id,
      });

      return res.json({
        ok: true,
        estimate_id: out.est.id,
        ref_no: out.refNo,
        download_url: out.downloadUrl,
      });
    } catch (e) {
      res
        .status(400)
        .json({ error: e.message || "Payment confirmation failed" });
    }
  });

  //Free Download Route
  r.post("/free-download", async (req, res) => {
    try {
      const engineerId = req.user.id;
      const FREE_LIMIT = Number(process.env.FREE_ESTIMATES_LIMIT || 2);

      const estimate_payload = req.body?.estimate_payload;
      if (!estimate_payload)
        return res.status(400).json({ error: "estimate_payload is required" });

      // 1) check profile quota
      const { data: prof, error: perr } = await db
        .from("profiles")
        .select("free_estimates_used")
        .eq("id", engineerId)
        .single();
      if (perr) return res.status(400).json({ error: perr.message });

      const used = Number(prof?.free_estimates_used || 0);
      if (used >= FREE_LIMIT)
        return res.status(402).json({ error: "Free quota exhausted" });

      // 2) increment used (atomic style)
      const { error: uerr } = await db
        .from("profiles")
        .update({ free_estimates_used: used + 1 })
        .eq("id", engineerId);
      if (uerr) return res.status(400).json({ error: uerr.message });

      // 3) finalize estimate & return url
      const out = await finalizeEstimateAndGetSignedUrl({
        db,
        engineerId,
        payload: estimate_payload,
        paymentId: null, // since free
        isFree: true, // optional if you track
      });

      return res.json({
        ok: true,
        free_left: Math.max(0, FREE_LIMIT - (used + 1)),
        estimate_id: out.est.id,
        ref_no: out.refNo,
        download_url: out.downloadUrl,
      });
    } catch (e) {
      return res
        .status(400)
        .json({ error: e.message || "Free download failed" });
    }
  });

  return r;
}
