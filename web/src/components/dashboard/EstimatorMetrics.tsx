import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { BoxIconLine, GroupIcon } from "../../icons";

function fmtINR(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EstimatorMetrics() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [m, setM] = useState({
    total_estimates: 0,
    paid_estimates: 0,
    revenue_inr: 0,
    pending_payments: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await api("/api/dashboard/summary");
        setM(res.metrics || m);
      } catch (e: any) {
        setErr(e?.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
      {/* TOTAL ESTIMATES */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Total Estimates</span>
          <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
            {loading ? "..." : m.total_estimates}
          </h4>
          {err ? <div className="mt-1 text-xs text-red-500">{err}</div> : null}
        </div>
      </div>

      {/* PAID ESTIMATES */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Paid Estimates</span>
          <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
            {loading ? "..." : m.paid_estimates}
          </h4>
        </div>
      </div>

      {/* REVENUE */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Revenue (INR)</span>
          <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
            {loading ? "..." : fmtINR(m.revenue_inr)}
          </h4>
        </div>
      </div>

      {/* PENDING PAYMENTS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Pending Payments</span>
          <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
            {loading ? "..." : m.pending_payments}
          </h4>
        </div>
      </div>
    </div>
  );
}
