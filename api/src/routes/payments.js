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

export function makePaymentsRouter({ db, razorpay }) {
  const r = express.Router();

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

      // Load quality + project type names
      const { data: q, error: qerr } = await db
        .from("qualities")
        .select("*")
        .eq("id", quality_id)
        .single();
      if (qerr) return res.status(400).json({ error: qerr.message });

      const { data: pt, error: pterr } = await db
        .from("project_types")
        .select("*")
        .eq("code", project_type_code)
        .single();
      if (pterr) return res.status(400).json({ error: pterr.message });

      // Total from rate * area (includes GST by your rule)
      const ratePerSqft = Number(q.rate_per_sqft);
      const totalInclGst =
        Math.round(ratePerSqft * Number(builtup_area_sqft) * 100) / 100;

      // Split GST
      const gstRate = Number(process.env.GST_RATE || 0.18); // 0.18
      const gstPercent = gstRate * 100;

      const subtotal0 = Math.round((totalInclGst / (1 + gstRate)) * 100) / 100;

      // Load descriptions + charges
      const { data: desc, error: derr } = await db
        .from("descriptions")
        .select("*")
        .eq("project_type_code", project_type_code)
        .order("sort_order");
      if (derr) return res.status(400).json({ error: derr.message });

      const { data: charges, error: cerr } = await db
        .from("project_type_charges")
        .select("*")
        .eq("project_type_code", project_type_code)
        .single();
      if (cerr) return res.status(400).json({ error: cerr.message });

      // ✅ ctx used for FIXED_QTY rules (water tank)
      const ctx = {
        builtup_area_sqft: Number(builtup_area_sqft),
        builtupAreaSqft: Number(builtup_area_sqft), // extra alias (safe)
      };

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
        return res.status(400).json({
          error: "Estimate calculation failed (sub_total_excl_gst invalid).",
          debug: built?.debug || null,
        });
      }
      if (
        !Number.isFinite(built?.gstAmount) ||
        !Number.isFinite(built?.totalInclGst)
      ) {
        return res.status(400).json({
          error: "Estimate calculation failed (GST/Total invalid).",
          debug: built?.debug || null,
        });
      }

      // Generate ref no atomically
      const { data: refData, error: refErr } = await db.rpc("next_est_ref", {
        p_engineer: engineerId,
      });
      if (refErr) return res.status(400).json({ error: refErr.message });
      const refNo = refData;

      const estDate = new Date().toISOString().slice(0, 10);

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
        total: built.totalInclGst, // total == BASE incl GST
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
      if (upErr) return res.status(400).json({ error: upErr.message });

      // Save estimate row
      // Map project_type_code -> ptype_id
      const { data: ptypeRow, error: ptypeErr } = await db
        .from("project_types")
        .select("id")
        .eq("code", project_type_code)
        .single();

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
          status: "paid",
          line_items: built.rows,
          pdf_path: pdfPath,

          payment_id: payment.id,
        })
        .select("*")
        .single();

      if (estErr) return res.status(400).json({ error: estErr.message });

      //Update Estimate id in payments table
      const { error: linkErr } = await db
        .from("payments")
        .update({ estimate_id: est.id })
        .eq("id", payment.id);

      if (linkErr) return res.status(400).json({ error: linkErr.message });

      // Signed URL for download (10 minutes)
      const { data: signed, error: sErr } = await db.storage
        .from(pdfBucket)
        .createSignedUrl(pdfPath, 600);
      if (sErr) return res.status(400).json({ error: sErr.message });

      res.json({
        ok: true,
        estimate_id: est.id,
        ref_no: refNo,
        download_url: signed.signedUrl,
      });
    } catch (e) {
      res
        .status(400)
        .json({ error: e.message || "Payment confirmation failed" });
    }
  });

  return r;
}
