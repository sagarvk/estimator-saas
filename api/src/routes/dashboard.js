import express from "express";

function monthKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // YYYY-MM
}

export function makeDashboardRouter({ db }) {
  const r = express.Router();

  // ✅ Summary cards + recent estimates
  r.get("/summary", async (req, res) => {
    try {
      const engineerId = req.user.id;

      // total estimates
      const totalEst = await db
        .from("estimates")
        .select("id", { count: "exact", head: true })
        .eq("engineer_id", engineerId);

      if (totalEst.error) throw new Error(totalEst.error.message);

      // paid estimates
      const paidEst = await db
        .from("estimates")
        .select("id", { count: "exact", head: true })
        .eq("engineer_id", engineerId)
        .eq("status", "paid");

      if (paidEst.error) throw new Error(paidEst.error.message);

      // revenue from payments (paid)
      const payRows = await db
        .from("payments")
        .select("amount, created_at, status")
        .eq("engineer_id", engineerId);

      if (payRows.error) throw new Error(payRows.error.message);

      const paidPayments = (payRows.data || []).filter(
        (p) => String(p.status).toLowerCase() === "paid"
      );
      const revenue = paidPayments.reduce(
        (s, p) => s + Number(p.amount || 0),
        0
      );

      const pendingPayments = (payRows.data || []).filter((p) =>
        ["created", "pending", "initiated"].includes(
          String(p.status).toLowerCase()
        )
      ).length;

      // recent estimates
      const recent = await db
        .from("estimates")
        .select(
          "id, ref_no, estimate_date, client_name, project_address, grand_total_incl_gst, status, pdf_path, created_at"
        )
        .eq("engineer_id", engineerId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recent.error) throw new Error(recent.error.message);

      res.json({
        ok: true,
        metrics: {
          total_estimates: totalEst.count || 0,
          paid_estimates: paidEst.count || 0,
          revenue_inr: Number(revenue.toFixed(2)),
          pending_payments: pendingPayments,
        },
        recent_estimates: recent.data || [],
      });
    } catch (e) {
      res.status(400).json({ error: e.message || "Dashboard summary failed" });
    }
  });

  // ✅ Monthly chart for last N months (default 12)
  r.get("/monthly", async (req, res) => {
    try {
      const engineerId = req.user.id;
      const months = Math.max(3, Math.min(24, Number(req.query.months || 12)));

      // pull estimates in last ~months range (safe approach)
      const from = new Date();
      from.setMonth(from.getMonth() - (months - 1));
      from.setDate(1);
      from.setHours(0, 0, 0, 0);

      const { data, error } = await db
        .from("estimates")
        .select("created_at, status, grand_total_incl_gst")
        .eq("engineer_id", engineerId)
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);

      // build month buckets
      const buckets = new Map(); // key -> { month, count, revenue }
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = monthKey(d);
        buckets.set(key, { key, count: 0, paid_count: 0, revenue: 0 });
      }

      for (const r of data || []) {
        const key = monthKey(r.created_at);
        if (!buckets.has(key)) continue;

        const b = buckets.get(key);
        b.count += 1;

        if (String(r.status).toLowerCase() === "paid") {
          b.paid_count += 1;
          b.revenue += Number(r.grand_total_incl_gst || 0);
        }
      }

      const series = Array.from(buckets.values()).map((b) => ({
        month: b.key, // YYYY-MM
        count: b.count,
        paid_count: b.paid_count,
        revenue_inr: Number(b.revenue.toFixed(2)),
      }));

      res.json({ ok: true, series });
    } catch (e) {
      res.status(400).json({ error: e.message || "Dashboard monthly failed" });
    }
  });

  return r;
}
